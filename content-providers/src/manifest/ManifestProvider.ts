import { ContentDownload, ContentFile, ContentFolder, ContentItem, ContentProviderAuthData, DeviceAuthorizationResponse, DeviceFlowPollResult, Instructions } from "../interfaces";
import { ConfiguredProvider } from "./ConfiguredProvider";
import { getProviderSecret } from "../helpers/ProviderSecrets";
import { ManifestRuntime, normalizeFiles, normalizeItems, toInstructions } from "./runtime";
import { parsePath } from "../pathUtils";
import { createFile, filesToInstructions } from "../utils";
import { DeviceFlowHelper, OAuthHelper } from "../helpers";
import { toAuthData } from "../helpers/TokenHelper";
import { evalExpr, exprRoots, fillTemplate, Scope, templateExprs } from "./expression";
import { ManifestFileMapping, ManifestGroup, ManifestLeaf } from "./types";

type Target = { kind: "groups"; groups: ManifestGroup[] } | { kind: "leaf"; leaf: ManifestLeaf };

interface Resolved {
  target: Target;
  segments: string[];
  /** Items selected by each segment, when the manifest reads them (or verifyPaths is on). */
  parents: unknown[];
}

interface LeafResult {
  files: ContentFile[];
  downloads: ContentDownload[];
  scope: Scope;
  leaf: ManifestLeaf;
}

/** Per-call memo so one browse/playlist call never fetches the same URL twice. */
type Memo = Map<string, Promise<unknown>>;

const DEFAULT_FROM = [{ list: "response", as: "item" }];
const PARENT_NAMES = ["parent", "parents"];

/** Drop undefined/null values so mapped objects look like hand-built ones. */
function compact<T extends object>(obj: T): T {
  for (const key of Object.keys(obj) as (keyof T)[]) if (obj[key] === undefined || obj[key] === null) delete obj[key];
  return obj;
}

const toStr = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

/** Expressions in a group (not its children), or a whole leaf including its fallback. */
function groupExprs(g: ManifestGroup): string[] {
  const list = [
    g.when, g.thumbnail, g.items, g.where, g.folder?.id, g.folder?.title, g.folder?.thumbnail, g.folder?.segment
  ].filter((e): e is string => !!e);
  return g.request ? [...list, ...templateExprs(g.request)] : list;
}

/** A leaf's expressions; the title and instruction ids only count when building instructions. */
function leafExprs(leaf: ManifestLeaf, forInstructions: boolean): string[] {
  const list: string[] = [...templateExprs(leaf.request)];
  const add = (v: unknown) => {
    if (typeof v === "string") list.push(v);
    else if (v && typeof v === "object") Object.values(v).forEach(add);
  };
  add(leaf.from?.map(f => f.list));
  add(leaf.vars);
  add(leaf.playlist);
  add(leaf.downloads);
  if (forInstructions) {
    add(leaf.title);
    add(leaf.instructions);
  }
  if (leaf.fallback) list.push(...leafExprs(leaf.fallback, forInstructions));
  return list;
}

const readsParents = (exprs: string[]) => exprs.some(e => PARENT_NAMES.some(n => exprRoots(e).has(n)));

/**
 * A content provider defined entirely by a JSON manifest. Auth flows, API calls, the folder tree and file mapping all
 * come from the manifest; this class only knows the generic building blocks.
 */
export class ManifestProvider extends ConfiguredProvider {
  private readonly cache = new Map<string, { at: number; value: unknown }>();
  private readonly oauthHelper = new OAuthHelper();
  private readonly deviceFlowHelper = new DeviceFlowHelper();

  private readonly runtime: ManifestRuntime;
  private readonly hooks = new Map<string, (...args: unknown[]) => unknown>();

  /** `datasets` holds the manifest's static JSON files, already loaded (the loader does this). */
  constructor(manifest: unknown, options: { datasets?: Record<string, unknown> } = {}) {
    super(manifest);
    const m = this.manifest;
    if (m.implementation || (!m.tree && !m.routes)) throw new Error(`[${m.id}] ManifestProvider needs a tree or routes; "${m.implementation}" is a built-in implementation`);
    const auth = m.auth;
    this.runtime = new ManifestRuntime({
      manifest: m,
      id: m.id,
      requiresAuth: m.requiresAuth,
      apiBase: () => this.config.apiBase,
      env: () => this.env,
      secret: name => getProviderSecret(name),
      datasets: options.datasets || {},
      hooks: this.hooks
    });

    // Hosts feature-detect with `"method" in provider`, so only attach what this manifest declares.
    const methods: Record<string, (...args: any[]) => unknown> = {};
    if (m.capabilities.playlist) methods.getPlaylist = this.getPlaylistImpl;
    if (m.capabilities.instructions) methods.getInstructions = this.getInstructionsImpl;
    if (auth?.pkce) {
      methods.generateCodeVerifier = () => this.oauthHelper.generateCodeVerifier();
      methods.buildAuthUrl = async (codeVerifier: string, redirectUri: string, state?: string) => ({ url: this.authorizeUrl(await this.oauthHelper.generateCodeChallenge(codeVerifier), redirectUri, state || this.id), challengeMethod: "S256" });
      methods.buildAuthUrlFromChallenge = (codeChallenge: string, redirectUri: string, state: string) => this.authorizeUrl(codeChallenge, redirectUri, state);
      methods.exchangeCodeForTokens = this.exchangeCodeForTokensImpl;
    }
    for (const [name, proc] of Object.entries(m.methods || {})) {
      const count = (proc.params || []).length;
      methods[name] = (...args: unknown[]) => this.runtime.runProcedure(proc, args.slice(0, count), args[count] as ContentProviderAuthData | null | undefined);
    }
    for (const [setter, hook] of Object.entries(m.hooks || {})) {
      methods[setter] = (fn: unknown) => {
        if (typeof fn === "function") this.hooks.set(hook, fn as (...args: unknown[]) => unknown);
        else this.hooks.delete(hook);
        this.runtime.clearCaches();
      };
    }
    if (auth?.deviceFlow) {
      methods.initiateDeviceFlow = this.initiateDeviceFlowImpl;
      methods.pollDeviceFlowToken = this.pollDeviceFlowTokenImpl;
    }
    for (const [key, fn] of Object.entries(methods)) Object.defineProperty(this, key, { value: fn.bind(this), enumerable: false });
  }

  protected onEnvironmentChange(): void {
    this.cache.clear();
    this.runtime.clearCaches();
  }

  /** Call one of the manifest's named functions, e.g. for tests or host code that wants the same logic. */
  callFunction(name: string, ...args: unknown[]): unknown {
    if (!this.manifest.functions?.[name]) throw new Error(`[${this.id}] has no function "${name}"`);
    const names = args.map((_, i) => `a${i}`);
    return evalExpr(`${name}(${names.join(", ")})`, Object.fromEntries(args.map((a, i) => [names[i], a])), this.runtime.ctx);
  }

  private authorizeUrl(codeChallenge: string, redirectUri: string, state: string): string {
    const auth = this.manifest.auth!;
    const params = new URLSearchParams({ response_type: "code", client_id: this.config.clientId, redirect_uri: redirectUri, scope: this.config.scopes.join(" "), code_challenge: codeChallenge, code_challenge_method: "S256", state });
    for (const [k, v] of Object.entries(auth.authorizeParams || {})) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    const base = auth.authorizeUrl ? this.fill(auth.authorizeUrl) : `${this.config.oauthBase}/authorize`;
    this.checkHost(base);
    return `${base}?${params.toString()}`;
  }

  private async exchangeCodeForTokensImpl(code: string, codeVerifier: string, redirectUri: string): Promise<ContentProviderAuthData | null> {
    const auth = this.manifest.auth!;
    const tokenUrl = auth.tokenUrl ? this.fill(auth.tokenUrl) : `${this.config.oauthBase}/token`;
    this.checkHost(tokenUrl);
    try {
      const params = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: this.config.clientId, code_verifier: codeVerifier });
      if (this.config.clientSecret) params.set("client_secret", this.config.clientSecret);
      const response = await fetch(tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
      if (!response.ok) return null;
      return toAuthData(await response.json(), { scope: this.config.scopes.join(" ") });
    } catch {
      return null;
    }
  }

  /** Refuse any URL whose host the manifest didn't list. */
  private checkHost(url: string): true {
    let host = "";
    try {
      host = new URL(url).host;
    } catch {
      // fall through to the error below
    }
    if (!this.manifest.hosts.includes(host)) throw new Error(`[${this.id}] ${url || "(empty url)"} is not on this provider's host list`);
    return true;
  }

  private async request(path: string, auth: ContentProviderAuthData | null | undefined, memo: Memo): Promise<unknown> {
    if (this.requiresAuth && !auth?.access_token) return null;
    const url = this.config.apiBase + path;
    this.checkHost(url);
    const cacheKey = `${this.environment || ""}|${auth?.access_token || ""}|${url}`;
    const pending = memo.get(cacheKey);
    if (pending) return pending;

    const load = async () => {
      const ttl = this.manifest.cache ? this.manifest.cache.ttlSeconds * 1000 : 0;
      const hit = ttl ? this.cache.get(cacheKey) : undefined;
      if (hit && Date.now() - hit.at < ttl) return hit.value;
      const value = await this.apiRequest<unknown>(path, auth);
      if (ttl && value) {
        const max = this.manifest.cache?.max ?? 50;
        if (this.cache.size >= max) this.cache.delete(this.cache.keys().next().value as string);
        this.cache.set(cacheKey, { at: Date.now(), value });
      }
      return value;
    };
    const promise = load();
    memo.set(cacheKey, promise);
    return promise;
  }

  private baseScope(segments: string[], parents: unknown[]): Scope {
    return { segments, parents, parent: parents[parents.length - 1], env: this.env };
  }

  private segmentOf(group: ManifestGroup, item: unknown, scope: Scope): string {
    return toStr(evalExpr(group.folder!.segment || group.folder!.id, { ...scope, item }));
  }

  /** The raw items a dynamic group lists under the current path. */
  private async groupItems(group: ManifestGroup, scope: Scope, auth: ContentProviderAuthData | null | undefined, memo: Memo): Promise<unknown[]> {
    let response: unknown = null;
    if (group.request) {
      response = await this.request(fillTemplate(group.request, scope, true), auth, memo);
      if (response === null) return [];
    }
    const items = evalExpr(group.items || "response", { ...scope, response });
    if (!Array.isArray(items)) return [];
    return group.where ? items.filter(item => evalExpr(group.where!, { ...scope, response, item })) : items;
  }

  /** Walk the path to the groups it lists or the leaf it opens. Returns null when the path doesn't exist. */
  private async resolve(path: string | null | undefined, auth: ContentProviderAuthData | null | undefined, memo: Memo, forInstructions = false): Promise<Resolved | null> {
    const { segments } = parsePath(path);
    const chosen: ManifestGroup[] = [];
    let target: Target = { kind: "groups", groups: this.manifest.tree! };
    let ambiguous = false;

    // First pass: pick the group each segment belongs to without fetching anything.
    for (const segment of segments) {
      if (target.kind !== "groups") return null;
      const groups: ManifestGroup[] = target.groups;
      const group: ManifestGroup | undefined = groups.find(g => g.static?.some(s => (s.segment ?? s.id) === segment)) ?? groups.find(g => !g.static);
      if (!group) return null;
      if (!group.static && groups.filter(g => !g.static).length > 1) ambiguous = true;
      chosen.push(group);
      if (group.children) target = { kind: "groups", groups: group.children };
      else if (group.leaf) target = { kind: "leaf", leaf: group.leaf };
      else return null;
    }

    const targetExprs = target.kind === "leaf" ? leafExprs(target.leaf, forInstructions) : target.groups.flatMap(groupExprs);
    const needParents = !!this.manifest.verifyPaths || ambiguous || chosen.some(g => g.when) || readsParents([...targetExprs, ...chosen.flatMap(groupExprs)]);
    if (!needParents) return { target, segments, parents: [] };

    // Second pass: find the item each segment selects, so expressions can read parent/parents and paths are checked.
    const parents: unknown[] = [];
    let groups = this.manifest.tree!;
    for (let i = 0; i < segments.length; i++) {
      const scope = this.baseScope(segments.slice(0, i), parents);
      let found: { group: ManifestGroup; item: unknown } | null = null;
      for (const group of groups) {
        if (group.when && !evalExpr(group.when, scope)) continue;
        if (group.static) {
          const entry = group.static.find(s => (s.segment ?? s.id) === segments[i]);
          if (entry) { found = { group, item: entry }; break; }
        } else {
          const items = await this.groupItems(group, scope, auth, memo);
          const item = items.find(it => this.segmentOf(group, it, scope) === segments[i]);
          if (item !== undefined) { found = { group, item }; break; }
        }
      }
      if (!found) {
        if (this.manifest.verifyPaths || ambiguous || chosen[i].when) return null;
        found = { group: chosen[i], item: undefined };
      }
      parents.push(found.item);
      if (found.group.children) groups = found.group.children;
      else if (i < segments.length - 1) return null;
      if (i === segments.length - 1) target = found.group.children ? { kind: "groups", groups: found.group.children } : { kind: "leaf", leaf: found.group.leaf! };
    }
    return { target, segments, parents };
  }

  private async listGroups(groups: ManifestGroup[], path: string, resolved: Resolved, auth: ContentProviderAuthData | null | undefined, memo: Memo): Promise<ContentItem[]> {
    const scope = this.baseScope(resolved.segments, resolved.parents);
    const base = path.replace(/\/+$/, "");
    const out: ContentItem[] = [];
    for (const group of groups) {
      if (group.when && !evalExpr(group.when, scope)) continue;
      const isLeaf = group.leaf ? true : undefined;
      if (group.static) {
        const thumbnail = group.thumbnail ? toStr(evalExpr(group.thumbnail, scope)) || undefined : undefined;
        for (const s of group.static) out.push(compact<ContentFolder>({ type: "folder", id: s.id, title: s.title, path: `${base}/${s.segment ?? s.id}`, thumbnail, isLeaf }));
        continue;
      }
      for (const item of await this.groupItems(group, scope, auth, memo)) {
        const itemScope = { ...scope, item };
        const folder = group.folder!;
        const thumbnail = folder.thumbnail ? toStr(evalExpr(folder.thumbnail, itemScope)) || undefined : undefined;
        out.push(compact<ContentFolder>({ type: "folder", id: toStr(evalExpr(folder.id, itemScope)), title: toStr(evalExpr(folder.title, itemScope)), path: `${base}/${this.segmentOf(group, item, scope)}`, thumbnail, isLeaf }));
      }
    }
    return out;
  }

  private mapFile(mapping: ManifestFileMapping, scope: Scope): ContentFile {
    const get = (key: keyof ManifestFileMapping) => {
      const expr = mapping[key];
      if (typeof expr !== "string") return undefined;
      const value = evalExpr(expr, scope);
      return value === null ? undefined : value;
    };
    const url = toStr(get("url"));
    const mediaType = get("mediaType") as ContentFile["mediaType"] | undefined;
    const file = createFile(toStr(get("id")), toStr(get("title")), url, {
      mediaType: mediaType || undefined,
      thumbnail: get("thumbnail") as string | undefined,
      muxPlaybackId: get("muxPlaybackId") as string | undefined,
      seconds: get("seconds") as number | undefined,
      loop: get("loop") as boolean | undefined,
      loopVideo: get("loopVideo") as boolean | undefined,
      streamUrl: get("streamUrl") as string | undefined
    });
    if ("downloadUrl" in mapping) file.downloadUrl = get("downloadUrl") as string | undefined;
    if ("mediaId" in mapping) file.mediaId = get("mediaId") as string | undefined;
    if (mapping.providerData) {
      file.providerData = {};
      for (const [key, expr] of Object.entries(mapping.providerData)) file.providerData[key] = evalExpr(expr, scope) ?? undefined;
    }
    return file;
  }

  /** Every item a leaf's `from` steps reach, with each step's item and position in scope. */
  private flatten(from: { list: string; as: string }[], scope: Scope): Scope[] {
    let scopes: Scope[] = [{ ...scope, index: {} }];
    for (const step of from) {
      const next: Scope[] = [];
      for (const s of scopes) {
        const list = evalExpr(step.list, s);
        if (!Array.isArray(list)) continue;
        list.forEach((value, i) => next.push({ ...s, [step.as]: value, index: { ...(s.index as object), [step.as]: i } }));
      }
      scopes = next;
    }
    return scopes;
  }

  private async loadLeaf(leaf: ManifestLeaf, resolved: Resolved, auth: ContentProviderAuthData | null | undefined, memo: Memo): Promise<LeafResult> {
    const base = this.baseScope(resolved.segments, resolved.parents);
    const response = await this.request(fillTemplate(leaf.request, base, true), auth, memo);
    const scope = { ...base, response };
    const from = leaf.from || DEFAULT_FROM;

    const first = evalExpr(from[0].list, { ...scope, index: {} });
    if (leaf.fallback && (!Array.isArray(first) || first.length === 0)) return this.loadLeaf(leaf.fallback, resolved, auth, memo);

    const files: ContentFile[] = [];
    const downloads: ContentDownload[] = [];
    for (const itemScope of this.flatten(from, scope)) {
      for (const [name, expr] of Object.entries(leaf.vars || {})) itemScope[name] = evalExpr(expr, itemScope);
      if (!leaf.playlist.where || evalExpr(leaf.playlist.where, itemScope)) files.push(this.mapFile(leaf.playlist.file, itemScope));
      else if (leaf.downloads && (!leaf.downloads.where || evalExpr(leaf.downloads.where, itemScope))) {
        const d = leaf.downloads.file;
        const val = (expr?: string) => (expr ? evalExpr(expr, itemScope) ?? undefined : undefined);
        downloads.push({ id: d.id ? toStr(val(d.id)) : undefined, title: toStr(val(d.title)), url: toStr(val(d.url)), fileType: val(d.fileType) as string | undefined, bytes: (val(d.bytes) as number | undefined) || undefined });
      }
    }
    return { files, downloads, scope, leaf };
  }

  private async leafFor(path: string | null | undefined, auth: ContentProviderAuthData | null | undefined, forInstructions: boolean): Promise<LeafResult | null> {
    if (this.requiresAuth && !auth?.access_token) return null;
    const memo: Memo = new Map();
    const resolved = await this.resolve(path, auth, memo, forInstructions);
    if (!resolved || resolved.target.kind !== "leaf") return null;
    return this.loadLeaf(resolved.target.leaf, resolved, auth, memo);
  }

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    if (this.manifest.routes) return normalizeItems(await this.runtime.runRoute("browse", path, auth));
    const memo: Memo = new Map();
    const resolved = await this.resolve(path, auth, memo);
    if (!resolved) return [];
    if (resolved.target.kind === "leaf") return (await this.loadLeaf(resolved.target.leaf, resolved, auth, memo)).files;
    return this.listGroups(resolved.target.groups, path || "", resolved, auth, memo);
  }

  private async getPlaylistImpl(path: string, auth?: ContentProviderAuthData | null): Promise<ContentFile[] | null> {
    if (this.manifest.routes) {
      const files = normalizeFiles(await this.runtime.runRoute("playlist", path, auth));
      return files.length > 0 ? files : null;
    }
    const result = await this.leafFor(path, auth, false);
    return result && result.files.length > 0 ? result.files : null;
  }

  private async getInstructionsImpl(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    if (this.manifest.routes) return toInstructions(await this.runtime.runRoute("instructions", path, auth));
    const result = await this.leafFor(path, auth, true);
    if (!result || (result.files.length === 0 && result.downloads.length === 0)) return null;
    const { leaf, scope } = result;
    const name = toStr(leaf.title ? evalExpr(leaf.title, scope) : "") || this.name;

    const sectionId = leaf.instructions?.section ? toStr(evalExpr(leaf.instructions.section, scope)) : undefined;
    const instructions = filesToInstructions(name, result.files, sectionId ? { id: sectionId, label: name } : undefined);
    if (leaf.instructions?.header) {
      instructions.items = [{ id: toStr(evalExpr(leaf.instructions.header, scope)), itemType: "header", label: name, children: instructions.items }];
    }
    if (result.downloads.length > 0) instructions.downloads = result.downloads;
    return instructions;
  }

  private async initiateDeviceFlowImpl(): Promise<DeviceAuthorizationResponse | null> {
    const flow = this.manifest.auth!.deviceFlow!;
    this.checkHost(this.config.oauthBase);
    if (flow.encoding !== "form") return this.deviceFlowHelper.initiateDeviceFlow(this.config);
    try {
      const response = await fetch(`${this.config.oauthBase}${flow.endpoint}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: this.formBody({ scope: this.config.scopes.join(" ") }) });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  private async pollDeviceFlowTokenImpl(deviceCode: string): Promise<DeviceFlowPollResult> {
    const flow = this.manifest.auth!.deviceFlow!;
    this.checkHost(this.config.oauthBase);
    if (flow.encoding !== "form") return this.deviceFlowHelper.pollDeviceFlowToken(this.config, deviceCode);
    try {
      const response = await fetch(`${this.config.oauthBase}/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: this.formBody({ grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: deviceCode }) });
      if (response.ok) return toAuthData(await response.json(), { scope: this.config.scopes.join(" ") });
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error === "authorization_pending") return { error: "authorization_pending" };
      if (errorData.error === "slow_down") return { error: "slow_down", shouldSlowDown: true };
      return null;
    } catch {
      return { error: "network_error" };
    }
  }

  /** Keycloak-style form body; the confidential client's secret comes from setProviderSecret at runtime. */
  private formBody(fields: Record<string, string>): string {
    const params = new URLSearchParams({ client_id: this.config.clientId, ...fields });
    if (this.config.clientSecret) params.set("client_secret", this.config.clientSecret);
    return params.toString();
  }
}
