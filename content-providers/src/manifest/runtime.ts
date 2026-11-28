import { ContentFile, ContentFolder, ContentItem, ContentProviderAuthData, Instructions } from "../interfaces";
import { parsePath } from "../pathUtils";
import { detectMediaType } from "../utils";
import { EvalContext, evalExpr, fillTemplate, Scope } from "./expression";
import { ManifestOperation, ManifestProcedure, ManifestRequest, ManifestRoute, ManifestStep, ProviderManifest } from "./types";

/** What the runtime needs from its provider. */
export interface RuntimeHost {
  manifest: ProviderManifest;
  id: string;
  requiresAuth: boolean;
  apiBase(): string;
  env(): Record<string, string>;
  secret(name: string): string;
  datasets: Record<string, unknown>;
  hooks: Map<string, (...args: unknown[]) => unknown>;
}

type Done = { done: true; value: unknown } | { done: false };
const NOT_DONE: Done = { done: false };

/** Per-call memo so one operation never fetches the same request twice. */
type Memo = Map<string, Promise<unknown>>;

const PRIVATE_V4 = /^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|127\.\d+\.\d+\.\d+)$/;
const FILE_KEYS = [
  "thumbnail", "downloadUrl", "muxPlaybackId", "decryptionKey", "mediaId", "pingbackUrl", "seconds", "loop", "loopVideo", "streamUrl", "providerData"
] as const;

const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

/** Turn whatever an operation returned into well-formed folders and files, dropping anything malformed. */
export function normalizeItems(value: unknown): ContentItem[] {
  if (!Array.isArray(value)) return [];
  const out: ContentItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const v = raw as Record<string, unknown>;
    if (v.type === "folder") {
      const folder: ContentFolder = { type: "folder", id: str(v.id), title: str(v.title), path: str(v.path) };
      if (v.thumbnail !== undefined && v.thumbnail !== null && v.thumbnail !== "") folder.thumbnail = str(v.thumbnail);
      if (v.isLeaf !== undefined && v.isLeaf !== null) folder.isLeaf = !!v.isLeaf;
      out.push(folder);
    } else if (v.type === "file") {
      out.push(normalizeFile(v));
    }
  }
  return out;
}

function normalizeFile(v: Record<string, unknown>): ContentFile {
  const url = str(v.url);
  const mediaType = v.mediaType === "video" || v.mediaType === "image" || v.mediaType === "audio" ? v.mediaType : detectMediaType(url);
  const file: ContentFile = { type: "file", id: str(v.id), title: str(v.title), mediaType, url };
  for (const key of FILE_KEYS) if (v[key] !== undefined && v[key] !== null) (file as unknown as Record<string, unknown>)[key] = v[key];
  return file;
}

export function normalizeFiles(value: unknown): ContentFile[] {
  return normalizeItems(value).filter((i): i is ContentFile => i.type === "file");
}

/** Match "/a/:b/*rest" against path segments. Returns the params, or null. */
export function matchRoute(pattern: string, segments: string[]): Record<string, unknown> | null {
  const parts = parsePath(pattern).segments;
  const params: Record<string, unknown> = {};
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith("*")) {
      params[part.slice(1)] = segments.slice(i);
      return params;
    }
    if (i >= segments.length) return null;
    if (part.startsWith(":")) params[part.slice(1)] = segments[i];
    else if (part !== segments[i]) return null;
  }
  return parts.length === segments.length ? params : null;
}

export class ManifestRuntime {
  private readonly stepCache = new Map<string, { at: number; value: unknown; fresh: boolean }>();
  readonly ctx: EvalContext;

  constructor(private readonly host: RuntimeHost) {
    this.ctx = {
      functions: host.manifest.functions,
      secret: name => (host.manifest.secrets?.includes(name) ? host.secret(name) : ""),
      globals: { settings: host.manifest.settings || {}, datasets: host.datasets }
    };
  }

  clearCaches(): void {
    this.stepCache.clear();
  }

  /** Names every expression can read. */
  globals(auth: ContentProviderAuthData | null | undefined): Scope {
    return { env: this.host.env(), datasets: this.host.datasets, settings: this.host.manifest.settings || {}, auth: auth ?? null, apiBase: this.host.apiBase() };
  }

  private eval(expr: string, scope: Scope): unknown {
    return evalExpr(expr, scope, this.ctx);
  }

  routeFor(path: string | null | undefined): { route: ManifestRoute; scope: Scope } | null {
    const { segments } = parsePath(path);
    for (const route of this.host.manifest.routes || []) {
      const params = matchRoute(route.path, segments);
      if (params) return { route, scope: { path: path || "/", segments, params } };
    }
    return null;
  }

  /** Run one operation of the route matching `path`. Returns undefined when no route or operation matches. */
  async runRoute(op: "browse" | "playlist" | "instructions", path: string | null | undefined, auth: ContentProviderAuthData | null | undefined, extra: Scope = {}): Promise<unknown> {
    const match = this.routeFor(path);
    const operation = match?.route[op];
    if (!match || operation === undefined) return undefined;
    const memo: Memo = new Map();
    const scope: Scope = { ...this.globals(auth), ...match.scope, ...extra };
    if (match.route.load) {
      const loaded = await this.runSteps(match.route.load, scope, auth, memo);
      if (loaded.done) return loaded.value;
    }
    return this.runOperation(operation, scope, auth, memo);
  }

  async runOperation(op: ManifestOperation, scope: Scope, auth: ContentProviderAuthData | null | undefined, memo: Memo): Promise<unknown> {
    if (typeof op === "string") return this.eval(op, scope);
    const result = await this.runSteps(op.steps || [], scope, auth, memo);
    if (result.done) return result.value;
    return op.return !== undefined ? this.eval(op.return, scope) : undefined;
  }

  async runProcedure(proc: ManifestProcedure, args: unknown[], auth: ContentProviderAuthData | null | undefined, memo: Memo = new Map()): Promise<unknown> {
    const scope: Scope = this.globals(auth);
    (proc.params || []).forEach((p, i) => { scope[p] = args[i]; });
    return this.runOperation({ steps: proc.steps, return: proc.return }, scope, auth, memo);
  }

  /** Run steps in order, binding results into `scope`. Stops at the first `return`. */
  async runSteps(steps: ManifestStep[], scope: Scope, auth: ContentProviderAuthData | null | undefined, memo: Memo): Promise<Done> {
    for (const step of steps) {
      if (step.when !== undefined && !this.eval(step.when, scope)) continue;
      if ("return" in step && !("cache" in step) && !("each" in step)) return { done: true, value: this.eval(step.return as string, scope) };
      if ("let" in step) {
        for (const [name, expr] of Object.entries(step.let)) scope[name] = this.eval(expr, scope);
      } else if ("fetch" in step) {
        scope[step.as] = await this.request(step.fetch, scope, auth, memo);
      } else if ("each" in step) {
        const list = this.eval(step.each, scope);
        const items = Array.isArray(list) ? list : [];
        const one = async (item: unknown, i: number) => {
          const inner: Scope = { ...scope, [step.as]: item };
          if (step.index) inner[step.index] = i;
          const r = await this.runSteps(step.steps || [], inner, auth, memo);
          if (r.done) return r.value;
          return step.return !== undefined ? this.eval(step.return, inner) : inner[step.as];
        };
        const results = step.parallel ? await Promise.all(items.map(one)) : await items.reduce<Promise<unknown[]>>(async (acc, item, i) => [...await acc, await one(item, i)], Promise.resolve([]));
        scope[step.into] = results.filter(r => r !== null && r !== undefined);
      } else if ("call" in step) {
        const proc = this.host.manifest.procedures?.[step.call];
        if (!proc) throw new Error(`[${this.host.id}] unknown procedure "${step.call}"`);
        const args = (proc.params || []).map(p => (step.args && p in step.args ? this.eval(step.args[p], scope) : undefined));
        scope[step.as] = await this.runProcedure(proc, args, auth, memo);
      } else if ("hook" in step) {
        const fn = this.host.hooks.get(step.hook);
        if (fn) {
          try {
            scope[step.as] = await fn(...(step.args || []).map(a => this.eval(a, scope)));
          } catch {
            scope[step.as] = null;
          }
        } else if (step.else) {
          const r = await this.runSteps(step.else, { ...scope }, auth, memo);
          scope[step.as] = r.done ? r.value : null;
        } else scope[step.as] = null;
      } else if ("if" in step) {
        const branch = this.eval(step.if, scope) ? step.then : step.else;
        const r = await this.runSteps(branch || [], scope, auth, memo);
        if (r.done) return r;
      } else if ("cache" in step) {
        scope[step.as] = await this.cached(step, scope, auth, memo);
      } else if ("fail" in step) {
        throw new Error(str(this.eval(step.fail, scope)));
      }
    }
    return NOT_DONE;
  }

  /** Reuse a value for `seconds`; only values passing keepWhen count as fresh, but the last value is always offered as `previous`. */
  private async cached(step: Extract<ManifestStep, { cache: unknown }>, scope: Scope, auth: ContentProviderAuthData | null | undefined, memo: Memo): Promise<unknown> {
    const { key, seconds, shared, keepWhen } = step.cache;
    const cacheKey = `${shared ? "" : auth?.access_token || ""}|${str(this.eval(key, scope))}`;
    const hit = this.stepCache.get(cacheKey);
    if (hit?.fresh && Date.now() - hit.at < seconds * 1000) return hit.value;
    const inner: Scope = { ...scope, previous: hit?.value ?? null };
    const r = await this.runSteps(step.steps || [], inner, auth, memo);
    const value = r.done ? r.value : step.return !== undefined ? this.eval(step.return, inner) : null;
    const fresh = value !== null && value !== undefined && (keepWhen === undefined || !!this.eval(keepWhen, { ...inner, value }));
    if (value !== null && value !== undefined) {
      if (this.stepCache.size >= 200) this.stepCache.delete(this.stepCache.keys().next().value as string);
      this.stepCache.set(cacheKey, { at: Date.now(), value, fresh });
    }
    return value;
  }

  /** Is this URL allowed? Listed hosts over https, or local-network addresses when the manifest lists "lan". */
  private allowed(url: string): boolean {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return false;
    }
    const hosts = this.host.manifest.hosts;
    if (hosts.includes("lan") && PRIVATE_V4.test(u.hostname) && (u.protocol === "http:" || u.protocol === "https:")) return true;
    return u.protocol === "https:" && hosts.includes(u.host);
  }

  async request(spec: ManifestRequest, scope: Scope, auth: ContentProviderAuthData | null | undefined, memo: Memo): Promise<unknown> {
    const req = typeof spec === "string" ? { path: spec } : spec;
    let url: string;
    let trusted = false;
    if (req.secretUrl) {
      let urls: Record<string, unknown> = {};
      try {
        urls = JSON.parse(this.host.secret(req.secretUrl.secret) || "{}");
      } catch {
        return null;
      }
      url = str(urls[str(this.eval(req.secretUrl.key, scope))]);
      if (!url) return null;
      trusted = true;
    } else if (req.url !== undefined) {
      url = str(this.eval(req.url, scope));
      if (!url) return null;
    } else {
      url = this.host.apiBase() + fillTemplate(req.path || "", scope, true, this.ctx);
    }
    if (req.query) {
      const params = new URLSearchParams();
      for (const [k, expr] of Object.entries(req.query)) {
        const v = this.eval(expr, scope);
        if (v !== null && v !== undefined) params.set(k, str(v));
      }
      const qs = params.toString();
      if (qs) url += (url.includes("?") ? "&" : "?") + qs;
    }
    if (!trusted && !this.allowed(url)) throw new Error(`[${this.host.id}] ${url} is not on this provider's host list`);

    const bearer = (req.auth ?? (req.url === undefined && !req.secretUrl ? "bearer" : "none")) === "bearer";
    if (bearer && this.host.requiresAuth && !auth?.access_token) return null;

    const method = req.method || (req.body !== undefined || req.form ? "POST" : "GET");
    const headers: Record<string, string> = { Accept: "application/json" };
    let body: string | undefined;
    if (req.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(this.eval(req.body, scope));
    } else if (req.form) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      body = new URLSearchParams(Object.fromEntries(Object.entries(req.form).map(([k, e]) => [k, str(this.eval(e, scope))]))).toString();
    }
    for (const [k, expr] of Object.entries(req.headers || {})) headers[k] = str(this.eval(expr, scope));
    if (bearer && auth?.access_token) headers.Authorization = `Bearer ${auth.access_token}`;

    const once = async (): Promise<unknown> => {
      const memoKey = `${method} ${url} ${body || ""} ${bearer ? auth?.access_token || "" : ""} ${req.raw ? "raw" : ""}`;
      const pending = memo.get(memoKey);
      if (pending) return pending;
      const promise = this.send(url, method, headers, body, req.raw, req.timeoutMs);
      memo.set(memoKey, promise);
      return promise;
    };

    const first = await once();
    if (!req.page) return first;
    const items: unknown[] = [];
    let response = first;
    for (let i = 0; response !== null && response !== undefined; i++) {
      const pageScope = { ...scope, response };
      const got = this.eval(req.page.items, pageScope);
      if (Array.isArray(got)) items.push(...got);
      if (i + 1 >= (req.page.max ?? 10) || !this.eval(req.page.while, pageScope)) break;
      response = await this.request(req.page.next, pageScope, auth, memo);
    }
    return items;
  }

  private async send(url: string, method: string, headers: Record<string, string>, body: string | undefined, raw?: boolean, timeoutMs?: number): Promise<unknown> {
    const controller = timeoutMs ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
    try {
      const response = await fetch(url, { method, headers, ...(body !== undefined ? { body } : {}), ...(controller ? { signal: controller.signal } : {}) });
      const parsed = response.status === 204 ? null : await response.json().catch(() => null);
      if (raw) return { ok: response.ok, status: response.status, body: parsed };
      if (!response.ok) {
        console.warn(`[${this.host.id}] request failed: ${method} ${url} → HTTP ${response.status}`);
        return null;
      }
      return parsed;
    } catch (err) {
      if (raw) return { ok: false, status: 0, body: null };
      console.warn(`[${this.host.id}] request error: ${method} ${url}`, err instanceof Error ? err.message : err);
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

export function toInstructions(value: unknown): Instructions | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Instructions;
  return Array.isArray(v.items) ? v : null;
}
