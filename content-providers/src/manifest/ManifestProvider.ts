import { AuthType, ContentDownload, ContentFile, ContentFolder, ContentItem, ContentProviderAuthData, ContentProviderConfig, DeviceAuthorizationResponse, DeviceFlowPollResult, Instructions, NetworkInstance, ProviderCapabilities, ProviderLogos } from "../interfaces";
import { BaseProvider } from "../providers/BaseProvider";
import { getProviderSecret } from "../helpers/ProviderSecrets";
import { DeviceFlowHelper, FormLoginHelper, OAuthHelper, TokenHelper } from "../helpers";
import { authToNetworkInstance, getMdnsScanner, MdnsService, NetworkDiscoverer, networkInstanceToAuth, resolveMdnsServices } from "../helpers/NetworkDiscoveryHelper";
import { parsePath } from "../pathUtils";
import { createFile, filesToInstructions } from "../utils";
import { evalExpr, exprRoots, fillTemplate, Scope, templateExprs } from "./expression";
import { ManifestRuntime, normalizeFiles, normalizeItems, toInstructions } from "./runtime";
import { ManifestFileMapping, ManifestGroup, ManifestLeaf, ProviderManifest } from "./types";
import { validateManifest } from "./validate";

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
 * A content provider defined entirely by a JSON manifest.
 * Auth flows (PKCE, Device Flow, Form Login, LAN Network Discovery), API calls, pagination, caching,
 * instance state, and content transformations all run in fixed shared code driven by the manifest.
 */
export class ManifestProvider extends BaseProvider {
  readonly id: string;
  readonly name: string;
  readonly logos: ProviderLogos;
  readonly config: ContentProviderConfig;
  readonly requiresAuth: boolean;
  readonly authTypes: AuthType[];
  readonly capabilities: ProviderCapabilities;
  readonly manifest: ProviderManifest;

  private environment?: string;
  private readonly cache = new Map<string, { at: number; value: unknown }>();
  private readonly oauthHelper = new OAuthHelper();
  private readonly deviceFlowHelper = new DeviceFlowHelper();
  private readonly tokenHelper = new TokenHelper();
  private readonly formLoginHelper = new FormLoginHelper();

  private readonly runtime: ManifestRuntime;
  private readonly state: Record<string, unknown>;
  private readonly hooks = new Map<string, (...args: unknown[]) => unknown>();
  private discoverer: NetworkDiscoverer | null = null;

  /** `datasets` holds any externally loaded JSON datasets; inline datasets from `manifest.datasets` are merged automatically. */
  constructor(manifest: unknown, options: { datasets?: Record<string, unknown> } = {}) {
    super();
    const m = validateManifest(manifest);
    this.manifest = m;
    this.id = m.id;
    this.name = m.name;
    this.logos = { ...m.logos };
    this.requiresAuth = m.requiresAuth;
    this.capabilities = { ...m.capabilities };
    this.environment = m.defaultEnvironment;
    this.state = m.state ? structuredClone(m.state) : {};

    const auth = m.auth;
    if (m.authTypes) {
      this.authTypes = [...m.authTypes];
    } else {
      const derived: AuthType[] = [];
      if (auth?.pkce) derived.push("oauth_pkce");
      if (auth?.deviceFlow) derived.push("device_flow");
      if (auth?.formLogin) derived.push("form_login");
      if (m.networkDiscovery) derived.push("network_discovery");
      this.authTypes = derived.length > 0 ? derived : (auth ? [] : ["none"]);
    }

    // Build ContentProviderConfig with live getters so environment switches and runtime secrets stay up to date.
    const config = {
      id: m.id,
      name: m.name,
      clientId: auth?.clientId || "",
      scopes: [...(auth?.scopes || [])]
    } as ContentProviderConfig;
    Object.defineProperty(config, "apiBase", { get: () => this.fill(m.apiBase), enumerable: true });
    Object.defineProperty(config, "oauthBase", { get: () => (auth?.oauthBase ? this.fill(auth.oauthBase) : ""), enumerable: true });
    if (auth?.authorizeUrl) Object.defineProperty(config, "authorizeUrl", { get: () => this.fill(auth.authorizeUrl!), enumerable: true });
    if (auth?.tokenUrl || auth?.deviceFlow?.tokenUrl) {
      const tokenTpl = auth.tokenUrl || auth.deviceFlow?.tokenUrl;
      Object.defineProperty(config, "tokenUrl", { get: () => this.fill(tokenTpl!), enumerable: true });
    }
    if (auth?.tokenEncoding) config.tokenEncoding = auth.tokenEncoding;
    if (auth?.authorizeParams) config.authorizeParams = { ...auth.authorizeParams };
    if (auth?.clientSecret) {
      const secretName = auth.clientSecret.slice("secret:".length);
      Object.defineProperty(config, "clientSecret", { get: () => getProviderSecret(secretName), enumerable: true });
    }
    if (auth?.deviceFlow) {
      config.supportsDeviceFlow = true;
      config.deviceAuthEndpoint = auth.deviceFlow.endpoint;
      if (auth.deviceFlow.encoding) config.deviceFlowEncoding = auth.deviceFlow.encoding;
    }
    this.config = config;

    // Merge inline datasets declared directly in the manifest with externally loaded datasets.
    const datasets: Record<string, unknown> = { ...(options.datasets || {}) };
    for (const [name, entry] of Object.entries(m.datasets || {})) {
      if (typeof entry !== "string" && !(name in datasets)) datasets[name] = entry;
    }

    this.runtime = new ManifestRuntime({
      manifest: m,
      id: m.id,
      requiresAuth: m.requiresAuth,
      apiBase: () => this.config.apiBase,
      env: () => this.env,
      secret: name => getProviderSecret(name),
      datasets,
      state: this.state,
      hooks: this.hooks
    });

    // Hosts feature-detect with `"method" in provider`, so only attach what this manifest declares.
    const methods: Record<string, (...args: any[]) => unknown> = {};
    if (m.environments) {
      methods.setEnvironment = (name: string) => {
        if (!m.environments?.[name]) return;
        this.environment = name;
        this.cache.clear();
        this.runtime.clearCaches();
      };
      methods.getEnvironment = () => this.environment;
    }
    if (m.capabilities.playlist) methods.getPlaylist = this.getPlaylistImpl;
    if (m.capabilities.instructions) methods.getInstructions = this.getInstructionsImpl;
    if (auth?.pkce) {
      methods.generateCodeVerifier = () => this.oauthHelper.generateCodeVerifier();
      methods.buildAuthUrl = async (codeVerifier: string, redirectUri: string, state?: string) => {
        this.checkHost(this.config.authorizeUrl || `${this.config.oauthBase}/authorize`);
        return this.oauthHelper.buildAuthUrl(this.config, codeVerifier, redirectUri, state || this.id);
      };
      methods.buildAuthUrlFromChallenge = (codeChallenge: string, redirectUri: string, state: string) => {
        this.checkHost(this.config.authorizeUrl || `${this.config.oauthBase}/authorize`);
        return this.oauthHelper.buildAuthUrlFromChallenge(this.config, codeChallenge, redirectUri, state);
      };
      methods.exchangeCodeForTokens = (code: string, codeVerifier: string, redirectUri: string) => {
        this.checkHost(this.config.tokenUrl || `${this.config.oauthBase}/token`);
        return this.oauthHelper.exchangeCodeForTokens(this.config, this.id, code, codeVerifier, redirectUri);
      };
    }
    if (auth?.supportsSecretExchange) {
      methods.exchangeCodeForTokensWithSecret = (code: string, redirectUri: string, clientSecret: string) => {
        this.checkHost(this.config.tokenUrl || `${this.config.oauthBase}/token`);
        return this.oauthHelper.exchangeCodeForTokensWithSecret(this.config, code, redirectUri, clientSecret);
      };
      methods.refreshTokenWithSecret = (authData: ContentProviderAuthData, clientSecret: string) => {
        this.checkHost(this.config.tokenUrl || `${this.config.oauthBase}/token`);
        return this.tokenHelper.refreshTokenWithSecret(this.config, authData, clientSecret);
      };
    }
    if (auth?.deviceFlow) {
      methods.initiateDeviceFlow = this.initiateDeviceFlowImpl;
      methods.pollDeviceFlowToken = this.pollDeviceFlowTokenImpl;
    }
    if (auth?.formLogin) {
      methods.performLogin = this.performLoginImpl;
    }
    if (m.networkDiscovery || this.authTypes.includes("network_discovery")) {
      methods.setDiscoverer = (fn: NetworkDiscoverer | null) => {
        this.discoverer = typeof fn === "function" ? fn : null;
      };
      methods.discoverInstances = this.discoverInstancesImpl;
      if (m.networkDiscovery) {
        methods.resolveDiscoveredServices = (services: MdnsService[], port?: number) => resolveMdnsServices(services, m.networkDiscovery!, { port, providerName: this.name });
        methods.toAuth = (instance: NetworkInstance) => networkInstanceToAuth(instance, m.networkDiscovery!.scope || this.id);
        methods.selectedInstance = (authData?: ContentProviderAuthData | null) => authToNetworkInstance(authData);
      }
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
    for (const [key, fn] of Object.entries(methods)) Object.defineProperty(this, key, { value: fn.bind(this), enumerable: false });
  }

  private get env(): Record<string, string> {
    return (this.environment && this.manifest.environments?.[this.environment]) || {};
  }

  private fill(template: string): string {
    return fillTemplate(template, { env: this.env }, false);
  }

  /** Call one of the manifest's named functions, e.g. for tests or host code that wants the same logic. */
  callFunction(name: string, ...args: unknown[]): unknown {
    if (!this.manifest.functions?.[name]) throw new Error(`[${this.id}] has no function "${name}"`);
    const names = args.map((_, i) => `a${i}`);
    return evalExpr(`${name}(${names.join(", ")})`, Object.fromEntries(args.map((a, i) => [names[i], a])), this.runtime.ctx);
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
    return toStr(evalExpr(group.folder!.segment || group.folder!.id, { ...scope, item }, this.runtime.ctx));
  }

  /** The raw items a dynamic group lists under the current path. */
  private async groupItems(group: ManifestGroup, scope: Scope, auth: ContentProviderAuthData | null | undefined, memo: Memo): Promise<unknown[]> {
    let response: unknown = null;
    if (group.request) {
      response = await this.request(fillTemplate(group.request, scope, true, this.runtime.ctx), auth, memo);
      if (response === null) return [];
    }
    const items = evalExpr(group.items || "response", { ...scope, response }, this.runtime.ctx);
    if (!Array.isArray(items)) return [];
    return group.where ? items.filter(item => evalExpr(group.where!, { ...scope, response, item }, this.runtime.ctx)) : items;
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
        if (group.when && !evalExpr(group.when, scope, this.runtime.ctx)) continue;
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
      if (group.when && !evalExpr(group.when, scope, this.runtime.ctx)) continue;
      const isLeaf = group.leaf ? true : undefined;
      if (group.static) {
        const thumbnail = group.thumbnail ? toStr(evalExpr(group.thumbnail, scope, this.runtime.ctx)) || undefined : undefined;
        for (const s of group.static) out.push(compact<ContentFolder>({ type: "folder", id: s.id, title: s.title, path: `${base}/${s.segment ?? s.id}`, thumbnail, isLeaf }));
        continue;
      }
      for (const item of await this.groupItems(group, scope, auth, memo)) {
        const itemScope = { ...scope, item };
        const folder = group.folder!;
        const thumbnail = folder.thumbnail ? toStr(evalExpr(folder.thumbnail, itemScope, this.runtime.ctx)) || undefined : undefined;
        out.push(compact<ContentFolder>({ type: "folder", id: toStr(evalExpr(folder.id, itemScope, this.runtime.ctx)), title: toStr(evalExpr(folder.title, itemScope, this.runtime.ctx)), path: `${base}/${this.segmentOf(group, item, scope)}`, thumbnail, isLeaf }));
      }
    }
    return out;
  }

  private mapFile(mapping: ManifestFileMapping, scope: Scope): ContentFile {
    const get = (key: keyof ManifestFileMapping) => {
      const expr = mapping[key];
      if (typeof expr !== "string") return undefined;
      const value = evalExpr(expr, scope, this.runtime.ctx);
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
      for (const [key, expr] of Object.entries(mapping.providerData)) file.providerData[key] = evalExpr(expr, scope, this.runtime.ctx) ?? undefined;
    }
    return file;
  }

  /** Every item a leaf's `from` steps reach, with each step's item and position in scope. */
  private flatten(from: { list: string; as: string }[], scope: Scope): Scope[] {
    let scopes: Scope[] = [{ ...scope, index: {} }];
    for (const step of from) {
      const next: Scope[] = [];
      for (const s of scopes) {
        const list = evalExpr(step.list, s, this.runtime.ctx);
        if (!Array.isArray(list)) continue;
        list.forEach((value, i) => next.push({ ...s, [step.as]: value, index: { ...(s.index as object), [step.as]: i } }));
      }
      scopes = next;
    }
    return scopes;
  }

  private async loadLeaf(leaf: ManifestLeaf, resolved: Resolved, auth: ContentProviderAuthData | null | undefined, memo: Memo): Promise<LeafResult> {
    const base = this.baseScope(resolved.segments, resolved.parents);
    const response = await this.request(fillTemplate(leaf.request, base, true, this.runtime.ctx), auth, memo);
    const scope = { ...base, response };
    const from = leaf.from || DEFAULT_FROM;

    const first = evalExpr(from[0].list, { ...scope, index: {} }, this.runtime.ctx);
    if (leaf.fallback && (!Array.isArray(first) || first.length === 0)) return this.loadLeaf(leaf.fallback, resolved, auth, memo);

    const files: ContentFile[] = [];
    const downloads: ContentDownload[] = [];
    for (const itemScope of this.flatten(from, scope)) {
      for (const [name, expr] of Object.entries(leaf.vars || {})) itemScope[name] = evalExpr(expr, itemScope, this.runtime.ctx);
      if (!leaf.playlist.where || evalExpr(leaf.playlist.where, itemScope, this.runtime.ctx)) files.push(this.mapFile(leaf.playlist.file, itemScope));
      else if (leaf.downloads && (!leaf.downloads.where || evalExpr(leaf.downloads.where, itemScope, this.runtime.ctx))) {
        const d = leaf.downloads.file;
        const val = (expr?: string) => (expr ? evalExpr(expr, itemScope, this.runtime.ctx) ?? undefined : undefined);
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

  private async getPlaylistImpl(path: string, auth?: ContentProviderAuthData | null, resolution?: number): Promise<ContentFile[] | null> {
    if (this.manifest.routes) {
      const files = normalizeFiles(await this.runtime.runRoute("playlist", path, auth, { resolution: resolution ?? null }));
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
    const name = toStr(leaf.title ? evalExpr(leaf.title, scope, this.runtime.ctx) : "") || this.name;

    const sectionId = leaf.instructions?.section ? toStr(evalExpr(leaf.instructions.section, scope, this.runtime.ctx)) : undefined;
    const instructions = filesToInstructions(name, result.files, sectionId ? { id: sectionId, label: name } : undefined);
    if (leaf.instructions?.header) {
      instructions.items = [{ id: toStr(evalExpr(leaf.instructions.header, scope, this.runtime.ctx)), itemType: "header", label: name, children: instructions.items }];
    }
    if (result.downloads.length > 0) instructions.downloads = result.downloads;
    return instructions;
  }

  private async initiateDeviceFlowImpl(): Promise<DeviceAuthorizationResponse | null> {
    this.checkHost(`${this.config.oauthBase}${this.config.deviceAuthEndpoint}`);
    return this.deviceFlowHelper.initiateDeviceFlow(this.config);
  }

  private async pollDeviceFlowTokenImpl(deviceCode: string): Promise<DeviceFlowPollResult> {
    this.checkHost(this.config.tokenUrl || `${this.config.oauthBase}/token`);
    return this.deviceFlowHelper.pollDeviceFlowToken(this.config, deviceCode);
  }

  private async performLoginImpl(email: string, password: string): Promise<ContentProviderAuthData | null> {
    const fl = this.manifest.auth!.formLogin!;
    const url = fl.url ? this.fill(fl.url) : this.config.apiBase + this.fill(fl.path || "");
    this.checkHost(url);
    return this.formLoginHelper.login(url, email, password, fl, (expr, response) => evalExpr(expr, { response }, this.runtime.ctx));
  }

  private async discoverInstancesImpl(): Promise<NetworkInstance[]> {
    if (this.discoverer) {
      try {
        return (await this.discoverer()) || [];
      } catch {
        return [];
      }
    }
    const nd = this.manifest.networkDiscovery;
    const scanner = getMdnsScanner();
    if (!nd || !scanner) return [];
    try {
      const services = await scanner(nd.serviceType);
      return await resolveMdnsServices(services || [], nd, { providerName: this.name });
    } catch {
      return [];
    }
  }
}
