import { ContentFile, ContentProviderAuthData, InstructionItem, NetworkInstance } from "../interfaces";
import { detectMediaType, filesToInstructions, isMediaFile, isPlaylistMedia, slugify } from "../utils";

/**
 * A small, side-effect-free expression language for provider manifests. Manifests are data, so this never calls eval:
 * it parses into an AST and evaluates against plain JSON values, lambdas written in the language, the manifest's own
 * named functions, and the whitelisted FUNCTIONS below. Nothing here can make a request or reach host code.
 *
 * Grammar: literals ('text', "text", 12, true, false, null), arrays [a, ...b], objects { a: 1, 'b': x, ...c },
 * paths (item.name, segments[1], parent['id']), calls f(x), lambdas x => x.id and (a, i) => a + i,
 * ! - + * / % < > <= >= == != && || ?? and a ? b : c, with parentheses for grouping.
 */

type Node =
  | { t: "lit"; v: unknown }
  | { t: "id"; name: string }
  | { t: "get"; obj: Node; key: Node }
  | { t: "call"; fn: string; args: Node[] }
  | { t: "lambda"; params: string[]; body: Node }
  | { t: "arr"; items: { spread: boolean; value: Node }[] }
  | { t: "obj"; props: ({ spread: true; value: Node } | { spread: false; key: string; value: Node })[] }
  | { t: "un"; op: string; arg: Node }
  | { t: "bin"; op: string; l: Node; r: Node }
  | { t: "cond"; test: Node; then: Node; else: Node };

export type Scope = Record<string, unknown>;

/** Runtime context: the manifest's own functions, its declared secrets, and a call-depth guard. */
export interface EvalContext {
  functions?: Record<string, string>;
  secret?: (name: string) => string;
  /** What the manifest's own functions can read (settings, datasets). */
  globals?: Scope;
  depth?: { n: number };
}

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const MAX_DEPTH = 400;
const lambdas = new WeakSet<object>();

/** WordPress thumbnails arrive as a URL or an attachment object; prefer the medium size. */
function wpThumb(thumb: unknown): string | undefined {
  if (typeof thumb === "string") return thumb || undefined;
  if (thumb && typeof thumb === "object") {
    const t = thumb as { url?: unknown; sizes?: Record<string, unknown> };
    if (typeof t.sizes?.medium === "string") return t.sizes.medium;
    if (typeof t.url === "string") return t.url;
  }
  return undefined;
}

const isFn = (f: unknown): f is (...args: unknown[]) => unknown => typeof f === "function" && lambdas.has(f);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const call = (f: unknown, ...args: unknown[]) => {
  if (!isFn(f)) throw new Error("Expected a function (x => ...)");
  return f(...args);
};
/** Patterns come from signed manifests; cap their length as a guard against pathological regexes. */
const regex = (pattern: unknown, flags: unknown) => {
  const p = str(pattern);
  if (p.length > 200) throw new Error("Pattern too long");
  return new RegExp(p, str(flags).replace(/[^gimsu]/g, ""));
};
const compare = (mode: unknown) => (a: unknown, b: unknown): number => {
  if (mode === "number") return Number(a) - Number(b);
  if (mode === "raw") return str(a) < str(b) ? -1 : str(a) > str(b) ? 1 : 0;
  if (mode === "natural") return str(a).localeCompare(str(b), undefined, { numeric: true, sensitivity: "base" });
  return str(a).localeCompare(str(b));
};

export const FUNCTIONS: Record<string, (...args: unknown[]) => unknown> = {
  /** The value itself when it is an array, else the first array found under the given keys, else []. */
  list: (value, ...keys) => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    for (const key of keys) {
      const found = (value as Record<string, unknown>)[String(key)];
      if (Array.isArray(found)) return found;
    }
    return [];
  },
  trim: (value) => (typeof value === "string" ? value.trim() : ""),
  trimEnd: (value) => (typeof value === "string" ? value.trimEnd() : ""),
  str,
  number: (v) => Number(v),
  isMedia: (url) => (typeof url === "string" ? isMediaFile(url) : false),
  mediaType: (url, hint) => detectMediaType(typeof url === "string" ? url : "", typeof hint === "string" ? hint : undefined),
  isPlaylistMedia: (url, fileType, name) => isPlaylistMedia(str(url), typeof fileType === "string" ? fileType : undefined, typeof name === "string" ? name : undefined),
  wpThumb,
  slugify: (v) => slugify(str(v)),
  oneOf: (value, ...options) => options.includes(value),
  /** True when the date is earlier than `days` days from now (past dates included). */
  beforeDaysFromNow: (date, days) => {
    const time = new Date(String(date)).getTime();
    return !Number.isNaN(time) && time < Date.now() + Number(days) * 86400000;
  },
  /** "2026-11-27" from any date string; "" when it doesn't parse. */
  isoDate: (date) => {
    const d = new Date(String(date));
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  },
  now: () => Date.now(),
  /** Name an intermediate value: with(find(list, x => ...), found => found && found.id). */
  with: (value, fn) => call(fn, value),

  // lists
  map: (list, fn) => arr(list).map((x, i) => call(fn, x, i)),
  filter: (list, fn) => arr(list).filter((x, i) => call(fn, x, i)),
  find: (list, fn) => arr(list).find((x, i) => call(fn, x, i)),
  findIndex: (list, fn) => arr(list).findIndex((x, i) => call(fn, x, i)),
  some: (list, fn) => arr(list).some((x, i) => call(fn, x, i)),
  every: (list, fn) => arr(list).every((x, i) => call(fn, x, i)),
  flatMap: (list, fn) => arr(list).flatMap((x, i) => { const r = call(fn, x, i); return Array.isArray(r) ? r : [r]; }),
  flat: (list) => arr(list).flat(),
  reduce: (list, fn, init) => arr(list).reduce((acc, x, i) => call(fn, acc, x, i), init),
  /** Sort a copy by key: mode "text" (default, locale-aware), "natural" (numbers inside text, case-insensitive), "number" or "raw" (plain code-unit order). */
  sortBy: (list, fn, mode, desc) => {
    const cmp = compare(mode);
    return [...arr(list)].sort((a, b) => (desc ? -1 : 1) * cmp(call(fn, a), call(fn, b)));
  },
  unique: (list) => [...new Set(arr(list))],
  /** Runs of consecutive items with the same key: [{ key, items }]. */
  groupConsecutive: (list, fn) => {
    const groups: { key: unknown; items: unknown[] }[] = [];
    for (const [i, x] of arr(list).entries()) {
      const key = call(fn, x, i);
      const last = groups[groups.length - 1];
      if (last && last.key === key && key !== null && key !== undefined) last.items.push(x);
      else groups.push({ key, items: [x] });
    }
    return groups;
  },
  len: (v) => (Array.isArray(v) || typeof v === "string" ? v.length : 0),
  slice: (v, start, end) => (Array.isArray(v) || typeof v === "string" ? v.slice(Number(start) || 0, end === undefined ? undefined : Number(end)) : undefined),
  concat: (...lists) => lists.flatMap(l => (Array.isArray(l) ? l : l === undefined || l === null ? [] : [l])),
  includes: (v, x) => (Array.isArray(v) ? v.includes(x) : typeof v === "string" ? v.includes(str(x)) : false),
  indexOf: (v, x) => (Array.isArray(v) ? v.indexOf(x) : typeof v === "string" ? v.indexOf(str(x)) : -1),
  join: (list, sep) => arr(list).map(str).join(sep === undefined ? "," : str(sep)),
  min: (...v) => Math.min(...v.map(Number)),
  max: (...v) => Math.max(...v.map(Number)),
  round: (v) => Math.round(Number(v)),
  floor: (v) => Math.floor(Number(v)),

  // objects
  keys: (o) => (o && typeof o === "object" ? Object.keys(o) : []),
  values: (o) => (o && typeof o === "object" ? Object.values(o) : []),
  entries: (o) => (o && typeof o === "object" ? Object.entries(o) : []),
  fromEntries: (list) => Object.fromEntries(arr(list).filter(e => Array.isArray(e) && !FORBIDDEN_KEYS.has(str(e[0]))) as [string, unknown][]),
  merge: (...objs) => Object.assign({}, ...objs.filter(o => o && typeof o === "object" && !Array.isArray(o))),
  isArray: (v) => Array.isArray(v),
  isString: (v) => typeof v === "string",
  isNumber: (v) => typeof v === "number" && !Number.isNaN(v),
  isObject: (v) => !!v && typeof v === "object" && !Array.isArray(v),

  // strings
  lower: (v) => str(v).toLowerCase(),
  upper: (v) => str(v).toUpperCase(),
  split: (v, sep) => str(v).split(str(sep)),
  startsWith: (v, x) => str(v).startsWith(str(x)),
  endsWith: (v, x) => str(v).endsWith(str(x)),
  replace: (v, pattern, replacement, flags) => str(v).replace(regex(pattern, flags ?? "g"), str(replacement)),
  test: (v, pattern, flags) => regex(pattern, flags).test(str(v)),
  match: (v, pattern, flags) => {
    const m = regex(pattern, flags).exec(str(v));
    return m ? [...m] : null;
  },
  search: (v, pattern, flags) => str(v).search(regex(pattern, flags)),
  json: (v) => JSON.stringify(v),
  parseJson: (v) => {
    try {
      return JSON.parse(str(v));
    } catch {
      return null;
    }
  },
  encode: (v) => encodeURIComponent(str(v)),
  decode: (v) => {
    try {
      return decodeURIComponent(str(v));
    } catch {
      return str(v);
    }
  },
  /** Set query parameters on a URL; a null value removes that parameter. */
  urlParams: (url, params) => {
    try {
      const u = new URL(str(url));
      for (const [k, v] of Object.entries((params as Record<string, unknown>) || {})) {
        if (v === null || v === undefined) u.searchParams.delete(k);
        else u.searchParams.set(k, str(v));
      }
      return u.toString();
    } catch {
      return str(url);
    }
  },

  // content helpers
  filesToInstructions: (name, files, sectionId, sectionLabel) => filesToInstructions(str(name), arr(files) as ContentFile[], sectionId ? { id: str(sectionId), label: sectionLabel === undefined ? undefined : str(sectionLabel) } : undefined),
  instructionItems: (files) => filesToInstructions("", arr(files) as ContentFile[]).items as InstructionItem[],
  /** Saved sign-in for a machine found on the local network. */
  networkAuth: (instance, scope) => {
    const i = instance as NetworkInstance;
    return { access_token: i.id, refresh_token: JSON.stringify(i), token_type: "network", created_at: Math.floor(Date.now() / 1000), expires_in: 10 * 365 * 24 * 3600, scope: str(scope) || "network" } satisfies ContentProviderAuthData;
  },
  /** The machine a network sign-in points at, or null. */
  networkInstance: (auth) => {
    const token = (auth as ContentProviderAuthData | null)?.refresh_token;
    if (!token) return null;
    try {
      const parsed = JSON.parse(token) as NetworkInstance;
      return parsed?.id && parsed?.name ? parsed : null;
    } catch {
      return null;
    }
  }
};

const TOKEN = /\s*(?:(\d+(?:\.\d+)?)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|([A-Za-z_$][\w$]*)|(\.\.\.|=>|\?\?|&&|\|\||==|!=|<=|>=|[!+\-*/%<>?:.,()[\]{}]))/y;

function tokenize(src: string): string[] {
  const tokens: string[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < src.length) {
    if (/^\s*$/.test(src.slice(TOKEN.lastIndex))) break;
    const start = TOKEN.lastIndex;
    const m = TOKEN.exec(src);
    if (!m) throw new Error(`Unexpected character at ${start} in expression: ${src}`);
    tokens.push(m[1] ?? m[2] ?? m[3] ?? m[4]);
  }
  return tokens;
}

const isIdent = (tok: string | undefined) => !!tok && /^[A-Za-z_$][\w$]*$/.test(tok) && !["true", "false", "null"].includes(tok);
/** Only \' \" \\ \n \t are escapes; anything else (like \s in a regex) stays as written. */
const unquote = (tok: string) => tok.slice(1, -1).replace(/\\(['"\\nt])/g, (_, c) => (c === "n" ? "\n" : c === "t" ? "\t" : c));

function parse(src: string): Node {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = (o = 0) => tokens[pos + o];
  const take = (expected?: string) => {
    const tok = tokens[pos++];
    if (expected !== undefined && tok !== expected) throw new Error(`Expected "${expected}" but found "${tok ?? "end"}" in expression: ${src}`);
    if (tok === undefined) throw new Error(`Unexpected end of expression: ${src}`);
    return tok;
  };

  const binary = (ops: string[], next: () => Node) => (): Node => {
    let node = next();
    while (ops.includes(peek())) {
      const op = take();
      node = { t: "bin", op, l: node, r: next() };
    }
    return node;
  };

  /** "(a, b) =>" or "a =>" starting at the current token? */
  const lambdaParams = (): string[] | null => {
    if (isIdent(peek()) && peek(1) === "=>") return [peek()];
    if (peek() !== "(") return null;
    let i = 1;
    const params: string[] = [];
    if (peek(i) === ")") return peek(i + 1) === "=>" ? params : null;
    for (;;) {
      if (!isIdent(peek(i))) return null;
      params.push(peek(i));
      i++;
      if (peek(i) === ",") { i++; continue; }
      if (peek(i) === ")" && peek(i + 1) === "=>") return params;
      return null;
    }
  };

  const expression = (): Node => {
    const params = lambdaParams();
    if (params) {
      if (params.length === 1 && peek() !== "(") take();
      else { take("("); while (peek() !== ")") take(); take(")"); }
      take("=>");
      return { t: "lambda", params, body: expression() };
    }
    return conditional();
  };

  const primary = (): Node => {
    const tok = take();
    if (tok === "(") {
      const inner = expression();
      take(")");
      return inner;
    }
    if (tok === "[") {
      const items: { spread: boolean; value: Node }[] = [];
      while (peek() !== "]") {
        const spread = peek() === "..." ? (take(), true) : false;
        items.push({ spread, value: expression() });
        if (peek() !== "]") take(",");
      }
      take("]");
      return { t: "arr", items };
    }
    if (tok === "{") {
      const props: Extract<Node, { t: "obj" }>["props"] = [];
      while (peek() !== "}") {
        if (peek() === "...") {
          take("...");
          props.push({ spread: true, value: expression() });
        } else {
          const keyTok = take();
          const key = keyTok[0] === "'" || keyTok[0] === "\"" ? unquote(keyTok) : keyTok;
          if (!/^[\w$'"]/.test(keyTok) || FORBIDDEN_KEYS.has(key)) throw new Error(`Bad object key "${keyTok}" in expression: ${src}`);
          if (peek() === ":") { take(":"); props.push({ spread: false, key, value: expression() }); } else props.push({ spread: false, key, value: { t: "id", name: key } });
        }
        if (peek() !== "}") take(",");
      }
      take("}");
      return { t: "obj", props };
    }
    if (/^\d/.test(tok)) return { t: "lit", v: Number(tok) };
    if (tok[0] === "'" || tok[0] === "\"") return { t: "lit", v: unquote(tok) };
    if (tok === "true" || tok === "false") return { t: "lit", v: tok === "true" };
    if (tok === "null") return { t: "lit", v: null };
    if (tok === "undefined") return { t: "lit", v: undefined };
    if (!isIdent(tok)) throw new Error(`Unexpected "${tok}" in expression: ${src}`);
    if (peek() === "(") {
      take("(");
      const args: Node[] = [];
      while (peek() !== ")") {
        args.push(expression());
        if (peek() !== ")") take(",");
      }
      take(")");
      return { t: "call", fn: tok, args };
    }
    return { t: "id", name: tok };
  };

  const postfix = (): Node => {
    let node = primary();
    for (;;) {
      if (peek() === ".") {
        take(".");
        const key = take();
        if (!/^[A-Za-z_$\d]/.test(key)) throw new Error(`Bad property "${key}" in expression: ${src}`);
        node = { t: "get", obj: node, key: { t: "lit", v: key } };
      } else if (peek() === "[") {
        take("[");
        const key = expression();
        take("]");
        node = { t: "get", obj: node, key };
      } else return node;
    }
  };

  const unary = (): Node => (peek() === "!" || peek() === "-" ? { t: "un", op: take(), arg: unary() } : postfix());
  const multiplicative = binary(["*", "/", "%"], unary);
  const additive = binary(["+", "-"], multiplicative);
  const relational = binary(["<", ">", "<=", ">="], additive);
  const equality = binary(["==", "!="], relational);
  const and = binary(["&&"], equality);
  const or = binary(["||"], and);
  const coalesce = binary(["??"], or);
  const conditional = (): Node => {
    const test = coalesce();
    if (peek() !== "?") return test;
    take("?");
    const then = expression();
    take(":");
    return { t: "cond", test, then, else: expression() };
  };

  const root = expression();
  if (pos < tokens.length) throw new Error(`Unexpected "${tokens[pos]}" in expression: ${src}`);
  return root;
}

function getProp(obj: unknown, key: unknown): unknown {
  if (obj === null || obj === undefined) return undefined;
  const k = String(key);
  if (FORBIDDEN_KEYS.has(k)) return undefined;
  return Object.prototype.hasOwnProperty.call(obj, k) ? (obj as Record<string, unknown>)[k] : undefined;
}

function evaluate(node: Node, scope: Scope, ctx: EvalContext): unknown {
  switch (node.t) {
    case "lit": return node.v;
    case "id": {
      if (Object.prototype.hasOwnProperty.call(scope, node.name)) return scope[node.name];
      // a manifest function named as a value, e.g. map(list, videoFile)
      const own = ctx.functions && Object.prototype.hasOwnProperty.call(ctx.functions, node.name) ? ctx.functions[node.name] : undefined;
      return own !== undefined ? evaluate(compile(own), ctx.globals || {}, ctx) : undefined;
    }
    case "get": return getProp(evaluate(node.obj, scope, ctx), evaluate(node.key, scope, ctx));
    case "lambda": {
      const fn = (...args: unknown[]) => {
        const depth = ctx.depth || (ctx.depth = { n: 0 });
        if (++depth.n > MAX_DEPTH) throw new Error("Expression recursion is too deep");
        try {
          const inner: Scope = { ...scope };
          node.params.forEach((p, i) => { inner[p] = args[i]; });
          return evaluate(node.body, inner, ctx);
        } finally {
          depth.n--;
        }
      };
      lambdas.add(fn);
      return fn;
    }
    case "call": {
      const args = node.args.map(a => evaluate(a, scope, ctx));
      const local = Object.prototype.hasOwnProperty.call(scope, node.fn) ? scope[node.fn] : undefined;
      if (isFn(local)) return local(...args);
      const own = ctx.functions && Object.prototype.hasOwnProperty.call(ctx.functions, node.fn) ? ctx.functions[node.fn] : undefined;
      if (own !== undefined) return call(evaluate(compile(own), ctx.globals || {}, ctx), ...args);
      if (node.fn === "secret") return ctx.secret ? ctx.secret(str(args[0])) : "";
      const builtin = FUNCTIONS[node.fn];
      if (!builtin) throw new Error(`Unknown function "${node.fn}"`);
      return builtin(...args);
    }
    case "arr": {
      const out: unknown[] = [];
      for (const item of node.items) {
        const v = evaluate(item.value, scope, ctx);
        if (item.spread) out.push(...arr(v));
        else out.push(v);
      }
      return out;
    }
    case "obj": {
      const out: Record<string, unknown> = {};
      for (const p of node.props) {
        const v = evaluate(p.value, scope, ctx);
        if (p.spread) {
          if (v && typeof v === "object" && !Array.isArray(v)) for (const [k, val] of Object.entries(v)) if (!FORBIDDEN_KEYS.has(k)) out[k] = val;
        } else out[p.key] = v;
      }
      return out;
    }
    case "un": {
      const v = evaluate(node.arg, scope, ctx);
      return node.op === "!" ? !v : -Number(v);
    }
    case "cond": return evaluate(node.test, scope, ctx) ? evaluate(node.then, scope, ctx) : evaluate(node.else, scope, ctx);
    case "bin": {
      const l = evaluate(node.l, scope, ctx);
      switch (node.op) {
        case "&&": return l && evaluate(node.r, scope, ctx);
        case "||": return l || evaluate(node.r, scope, ctx);
        case "??": return l ?? evaluate(node.r, scope, ctx);
      }
      const r = evaluate(node.r, scope, ctx);
      switch (node.op) {
        case "==": return l === r;
        case "!=": return l !== r;
        case "<": return (l as number) < (r as number);
        case ">": return (l as number) > (r as number);
        case "<=": return (l as number) <= (r as number);
        case ">=": return (l as number) >= (r as number);
        case "-": return Number(l) - Number(r);
        case "*": return Number(l) * Number(r);
        case "/": return Number(l) / Number(r);
        case "%": return Number(l) % Number(r);
      }
      if (typeof l === "number" && typeof r === "number") return l + r;
      return str(l) + str(r);
    }
  }
}

/** Names an expression reads that aren't bound inside it, and the functions it calls. */
function analyze(node: Node, bound: Set<string>, out: { free: Set<string>; calls: Set<string> }) {
  switch (node.t) {
    case "id": if (!bound.has(node.name)) out.free.add(node.name); break;
    case "get": analyze(node.obj, bound, out); analyze(node.key, bound, out); break;
    case "call":
      if (!bound.has(node.fn)) out.calls.add(node.fn);
      node.args.forEach(a => analyze(a, bound, out));
      break;
    case "lambda": analyze(node.body, new Set([...bound, ...node.params]), out); break;
    case "arr": node.items.forEach(i => analyze(i.value, bound, out)); break;
    case "obj": node.props.forEach(p => analyze(p.value, bound, out)); break;
    case "un": analyze(node.arg, bound, out); break;
    case "bin": analyze(node.l, bound, out); analyze(node.r, bound, out); break;
    case "cond": analyze(node.test, bound, out); analyze(node.then, bound, out); analyze(node.else, bound, out); break;
  }
  return out;
}

const compiled = new Map<string, Node>();

function compile(src: string): Node {
  let node = compiled.get(src);
  if (!node) {
    node = parse(src);
    compiled.set(src, node);
  }
  return node;
}

/** Evaluate one expression. Throws on a syntax error, which manifest validation catches at load time. */
export function evalExpr(src: string, scope: Scope, ctx: EvalContext = {}): unknown {
  return evaluate(compile(src), scope, ctx);
}

/** The top-level names an expression reads, e.g. "parent.name || item.id" → parent, item. Lambda parameters don't count. */
export function exprRoots(src: string): Set<string> {
  return analyze(compile(src), new Set(), { free: new Set(), calls: new Set() }).free;
}

/** The functions an expression calls (other than lambdas it binds). */
export function exprCalls(src: string): Set<string> {
  return analyze(compile(src), new Set(), { free: new Set(), calls: new Set() }).calls;
}

/** Split "/catalog/{segments[1]}" into literal text and {expression} parts. Braces inside an expression nest. */
function templateParts(template: string): { text: string; expr?: string }[] {
  const parts: { text: string; expr?: string }[] = [];
  let text = "";
  for (let i = 0; i < template.length; i++) {
    if (template[i] !== "{") { text += template[i]; continue; }
    let depth = 0;
    let quote = "";
    let j = i;
    for (; j < template.length; j++) {
      const c = template[j];
      if (quote) {
        if (c === "\\") j++;
        else if (c === quote) quote = "";
      } else if (c === "'" || c === "\"") quote = c;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) break;
    }
    if (j >= template.length) throw new Error(`Unclosed "{" in template: ${template}`);
    if (text) parts.push({ text });
    text = "";
    parts.push({ text: "", expr: template.slice(i + 1, j) });
    i = j;
  }
  if (text) parts.push({ text });
  return parts;
}

/** Fill a template. Request paths encode each value so a path segment can't add its own "/" or "?". */
export function fillTemplate(template: string, scope: Scope, encode: boolean, ctx: EvalContext = {}): string {
  return templateParts(template).map(p => {
    if (p.expr === undefined) return p.text;
    const value = str(evalExpr(p.expr, scope, ctx));
    return encode ? encodeURIComponent(value) : value;
  }).join("");
}

/** Every expression inside a template, for validation and dependency checks. */
export function templateExprs(template: string): string[] {
  return templateParts(template).filter(p => p.expr !== undefined).map(p => p.expr as string);
}
