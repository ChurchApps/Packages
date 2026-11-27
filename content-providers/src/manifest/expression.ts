import { detectMediaType, isMediaFile } from "../utils";

/**
 * A small, side-effect-free expression language for provider manifests. Manifests are data, so this never calls eval:
 * it parses into an AST and evaluates against plain JSON values plus the whitelisted functions below.
 *
 * Grammar: literals ('text', "text", 12, true, false, null), paths (item.name, segments[1], parent['id']),
 * calls to FUNCTIONS, ! + == != && || ?? and a ? b : c, with parentheses for grouping.
 */

type Node =
  | { t: "lit"; v: unknown }
  | { t: "id"; name: string }
  | { t: "get"; obj: Node; key: Node }
  | { t: "call"; fn: string; args: Node[] }
  | { t: "not"; arg: Node }
  | { t: "bin"; op: string; l: Node; r: Node }
  | { t: "cond"; test: Node; then: Node; else: Node };

export type Scope = Record<string, unknown>;

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

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
  str: (value) => (value === null || value === undefined ? "" : String(value)),
  isMedia: (url) => (typeof url === "string" ? isMediaFile(url) : false),
  mediaType: (url, hint) => detectMediaType(typeof url === "string" ? url : "", typeof hint === "string" ? hint : undefined),
  wpThumb,
  oneOf: (value, ...options) => options.includes(value)
};

const TOKEN = /\s*(?:(\d+(?:\.\d+)?)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|([A-Za-z_$][\w$]*)|(\?\?|&&|\|\||==|!=|[!+?:.,()[\]]))/y;

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

function parse(src: string): Node {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
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

  const primary = (): Node => {
    const tok = take();
    if (tok === "(") {
      const inner = conditional();
      take(")");
      return inner;
    }
    if (/^\d/.test(tok)) return { t: "lit", v: Number(tok) };
    if (tok[0] === "'" || tok[0] === "\"") return { t: "lit", v: tok.slice(1, -1).replace(/\\(.)/g, "$1") };
    if (tok === "true" || tok === "false") return { t: "lit", v: tok === "true" };
    if (tok === "null") return { t: "lit", v: null };
    if (!/^[A-Za-z_$]/.test(tok)) throw new Error(`Unexpected "${tok}" in expression: ${src}`);
    if (peek() === "(") {
      if (!FUNCTIONS[tok]) throw new Error(`Unknown function "${tok}" in expression: ${src}`);
      take("(");
      const args: Node[] = [];
      if (peek() !== ")") {
        args.push(conditional());
        while (peek() === ",") { take(","); args.push(conditional()); }
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
        const key = conditional();
        take("]");
        node = { t: "get", obj: node, key };
      } else return node;
    }
  };

  const unary = (): Node => (peek() === "!" ? (take(), { t: "not", arg: unary() }) : postfix());
  const additive = binary(["+"], unary);
  const equality = binary(["==", "!="], additive);
  const and = binary(["&&"], equality);
  const or = binary(["||"], and);
  const coalesce = binary(["??"], or);
  const conditional = (): Node => {
    const test = coalesce();
    if (peek() !== "?") return test;
    take("?");
    const then = conditional();
    take(":");
    return { t: "cond", test, then, else: conditional() };
  };

  const root = conditional();
  if (pos < tokens.length) throw new Error(`Unexpected "${tokens[pos]}" in expression: ${src}`);
  return root;
}

function getProp(obj: unknown, key: unknown): unknown {
  if (obj === null || obj === undefined) return undefined;
  const k = String(key);
  if (FORBIDDEN_KEYS.has(k)) return undefined;
  return Object.prototype.hasOwnProperty.call(obj, k) ? (obj as Record<string, unknown>)[k] : undefined;
}

function evaluate(node: Node, scope: Scope): unknown {
  switch (node.t) {
    case "lit": return node.v;
    case "id": return Object.prototype.hasOwnProperty.call(scope, node.name) ? scope[node.name] : undefined;
    case "get": return getProp(evaluate(node.obj, scope), evaluate(node.key, scope));
    case "call": return FUNCTIONS[node.fn](...node.args.map(a => evaluate(a, scope)));
    case "not": return !evaluate(node.arg, scope);
    case "cond": return evaluate(node.test, scope) ? evaluate(node.then, scope) : evaluate(node.else, scope);
    case "bin": {
      const l = evaluate(node.l, scope);
      switch (node.op) {
        case "&&": return l && evaluate(node.r, scope);
        case "||": return l || evaluate(node.r, scope);
        case "??": return l ?? evaluate(node.r, scope);
      }
      const r = evaluate(node.r, scope);
      if (node.op === "==") return l === r;
      if (node.op === "!=") return l !== r;
      if (typeof l === "number" && typeof r === "number") return l + r;
      return FUNCTIONS.str(l) as string + (FUNCTIONS.str(r) as string);
    }
  }
}

function rootIds(node: Node, out: Set<string>): Set<string> {
  switch (node.t) {
    case "id": out.add(node.name); break;
    case "get": rootIds(node.obj, out); rootIds(node.key, out); break;
    case "call": node.args.forEach(a => rootIds(a, out)); break;
    case "not": rootIds(node.arg, out); break;
    case "bin": rootIds(node.l, out); rootIds(node.r, out); break;
    case "cond": rootIds(node.test, out); rootIds(node.then, out); rootIds(node.else, out); break;
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
export function evalExpr(src: string, scope: Scope): unknown {
  return evaluate(compile(src), scope);
}

/** The top-level names an expression reads, e.g. "parent.name || item.id" → parent, item. */
export function exprRoots(src: string): Set<string> {
  return rootIds(compile(src), new Set());
}

/** Split "/catalog/{segments[1]}" into literal text and {expression} parts. */
function templateParts(template: string): { text: string; expr?: string }[] {
  const parts: { text: string; expr?: string }[] = [];
  let rest = template;
  while (rest.length) {
    const open = rest.indexOf("{");
    if (open < 0) { parts.push({ text: rest }); break; }
    const close = rest.indexOf("}", open);
    if (close < 0) throw new Error(`Unclosed "{" in template: ${template}`);
    if (open > 0) parts.push({ text: rest.slice(0, open) });
    parts.push({ text: "", expr: rest.slice(open + 1, close) });
    rest = rest.slice(close + 1);
  }
  return parts;
}

/** Fill a template. Request paths encode each value so a path segment can't add its own "/" or "?". */
export function fillTemplate(template: string, scope: Scope, encode: boolean): string {
  return templateParts(template).map(p => {
    if (p.expr === undefined) return p.text;
    const value = FUNCTIONS.str(evalExpr(p.expr, scope)) as string;
    return encode ? encodeURIComponent(value) : value;
  }).join("");
}

/** Every expression inside a template, for validation and dependency checks. */
export function templateExprs(template: string): string[] {
  return templateParts(template).filter(p => p.expr !== undefined).map(p => p.expr as string);
}
