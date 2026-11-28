import { evalExpr, exprCalls, exprRoots, FUNCTIONS, templateExprs } from "./expression";
import { FORBIDDEN_KEYS } from "./transforms";
import { MANIFEST_ENGINE_VERSION, ManifestGroup, ManifestLeaf, ManifestOperation, ManifestRequest, ManifestStep, ProviderIndex, ProviderManifest } from "./types";

const ROOTS = new Set(["segments", "parent", "parents", "item", "response", "env", "index"]);
const TOP_KEYS = new Set([
  "engine",
  "id",
  "name",
  "logos",
  "hosts",
  "requiresAuth",
  "capabilities",
  "environments",
  "defaultEnvironment",
  "apiBase",
  "auth",
  "networkDiscovery",
  "cache",
  "verifyPaths",
  "tree",
  "authTypes",
  "settings",
  "state",
  "routes",
  "functions",
  "procedures",
  "methods",
  "hooks",
  "datasets",
  "secrets"
]);
/** Names every route, method and procedure expression can read. */
const GLOBALS = ["env", "datasets", "settings", "state", "auth", "apiBase"];
const RESERVED_METHODS = new Set([
  "browse",
  "getPlaylist",
  "getInstructions",
  "supportsDeviceFlow",
  "generateCodeVerifier",
  "buildAuthUrl",
  "buildAuthUrlFromChallenge",
  "exchangeCodeForTokens",
  "exchangeCodeForTokensWithSecret",
  "refreshTokenWithSecret",
  "initiateDeviceFlow",
  "pollDeviceFlowToken",
  "performLogin",
  "discoverInstances",
  "resolveDiscoveredServices",
  "callFunction",
  "constructor",
  "setEnvironment",
  "getEnvironment"
]);
const NAME = /^[A-Za-z_]\w*$/;
const GROUP_KEYS = new Set([
  "when", "static", "thumbnail", "request", "items", "where", "folder", "children", "leaf"
]);
const LEAF_KEYS = new Set([
  "request", "from", "vars", "playlist", "downloads", "title", "instructions", "fallback"
]);
const FILE_KEYS = new Set([
  "id", "title", "url", "mediaType", "thumbnail", "downloadUrl", "muxPlaybackId", "mediaId", "seconds", "loop", "loopVideo", "streamUrl", "providerData"
]);
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const AUTH_TYPES: string[] = ["none", "oauth_pkce", "device_flow", "form_login", "network_discovery"];

class Checker {
  readonly errors: string[] = [];
  /** Functions expressions may call: built-ins, secret(), and the manifest's own. */
  fns = new Set([...Object.keys(FUNCTIONS), "secret"]);
  /** The manifest's own functions, which can also be passed by name. */
  own = new Set<string>();

  fail(where: string, message: string) {
    this.errors.push(`${where}: ${message}`);
  }

  keys(where: string, value: unknown, allowed: Set<string>) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return this.fail(where, "must be an object");
    for (const key of Object.keys(value)) if (!allowed.has(key)) this.fail(where, `unknown field "${key}"`);
  }

  str(where: string, value: unknown) {
    if (typeof value !== "string") this.fail(where, "must be a string");
  }

  /** Parse an expression and make sure it only reads known names. */
  expr(where: string, value: unknown, names: Set<string>) {
    if (typeof value !== "string") return this.fail(where, "must be an expression string");
    try {
      for (const root of exprRoots(value)) if (!names.has(root) && !this.own.has(root)) this.fail(where, `unknown name "${root}"`);
      for (const fn of exprCalls(value)) if (!this.fns.has(fn) && !names.has(fn)) this.fail(where, `Unknown function "${fn}"`);
    } catch (e) {
      this.fail(where, (e as Error).message);
    }
  }

  template(where: string, value: unknown, names: Set<string>) {
    if (typeof value !== "string") return this.fail(where, "must be a template string");
    try {
      for (const e of templateExprs(value)) this.expr(where, e, names);
    } catch (e) {
      this.fail(where, (e as Error).message);
    }
  }
}

function checkGroups(c: Checker, where: string, groups: unknown) {
  if (!Array.isArray(groups) || groups.length === 0) return c.fail(where, "must be a non-empty array of groups");
  groups.forEach((g: ManifestGroup, i) => {
    const at = `${where}[${i}]`;
    c.keys(at, g, GROUP_KEYS);
    if (!g || typeof g !== "object") return;
    if (g.when !== undefined) c.expr(`${at}.when`, g.when, ROOTS);
    if (g.static !== undefined) {
      if (!Array.isArray(g.static)) c.fail(`${at}.static`, "must be an array");
      else g.static.forEach((s, j) => { c.str(`${at}.static[${j}].id`, s?.id); c.str(`${at}.static[${j}].title`, s?.title); });
      if (g.thumbnail !== undefined) c.expr(`${at}.thumbnail`, g.thumbnail, ROOTS);
      if (g.folder || g.request || g.items || g.where) c.fail(at, "a static group can't also have folder, request or items");
    } else {
      if (!g.folder) c.fail(at, "needs static entries or a folder mapping");
      else {
        c.expr(`${at}.folder.id`, g.folder.id, ROOTS);
        c.expr(`${at}.folder.title`, g.folder.title, ROOTS);
        if (g.folder.thumbnail !== undefined) c.expr(`${at}.folder.thumbnail`, g.folder.thumbnail, ROOTS);
        if (g.folder.segment !== undefined) c.expr(`${at}.folder.segment`, g.folder.segment, ROOTS);
      }
      if (g.request !== undefined) c.template(`${at}.request`, g.request, ROOTS);
      if (g.items !== undefined) c.expr(`${at}.items`, g.items, ROOTS);
      if (g.where !== undefined) c.expr(`${at}.where`, g.where, ROOTS);
    }
    if (g.children && g.leaf) c.fail(at, "can't have both children and leaf");
    if (g.children) checkGroups(c, `${at}.children`, g.children);
    if (g.leaf) checkLeaf(c, `${at}.leaf`, g.leaf);
  });
}

function checkLeaf(c: Checker, where: string, leaf: ManifestLeaf) {
  c.keys(where, leaf, LEAF_KEYS);
  if (!leaf || typeof leaf !== "object") return;
  const names = new Set(ROOTS);
  c.template(`${where}.request`, leaf.request, names);
  if (leaf.title !== undefined) c.expr(`${where}.title`, leaf.title, names);
  if (leaf.instructions) {
    if (leaf.instructions.section !== undefined) c.expr(`${where}.instructions.section`, leaf.instructions.section, names);
    if (leaf.instructions.header !== undefined) c.expr(`${where}.instructions.header`, leaf.instructions.header, names);
  }
  if (leaf.from !== undefined) {
    if (!Array.isArray(leaf.from) || leaf.from.length === 0) c.fail(`${where}.from`, "must be a non-empty array");
    else {
      leaf.from.forEach((step, i) => {
        c.expr(`${where}.from[${i}].list`, step?.list, names);
        if (typeof step?.as !== "string" || !NAME.test(step.as)) c.fail(`${where}.from[${i}].as`, "must be a name");
        else names.add(step.as);
      });
    }
  } else names.add("item");
  for (const [name, value] of Object.entries(leaf.vars || {})) {
    c.expr(`${where}.vars.${name}`, value, names);
    names.add(name);
  }
  if (!leaf.playlist?.file) c.fail(`${where}.playlist`, "needs a file mapping");
  else {
    if (leaf.playlist.where !== undefined) c.expr(`${where}.playlist.where`, leaf.playlist.where, names);
    const file = leaf.playlist.file;
    c.keys(`${where}.playlist.file`, file, FILE_KEYS);
    for (const [key, value] of Object.entries(file)) {
      if (key === "providerData") for (const [k, v] of Object.entries(value as Record<string, string>)) c.expr(`${where}.playlist.file.providerData.${k}`, v, names);
      else c.expr(`${where}.playlist.file.${key}`, value, names);
    }
    for (const key of ["id", "title", "url"]) if (!(key in file)) c.fail(`${where}.playlist.file`, `missing "${key}"`);
  }
  if (leaf.downloads) {
    if (leaf.downloads.where !== undefined) c.expr(`${where}.downloads.where`, leaf.downloads.where, names);
    for (const [key, value] of Object.entries(leaf.downloads.file || {})) c.expr(`${where}.downloads.file.${key}`, value, names);
  }
  if (leaf.fallback) checkLeaf(c, `${where}.fallback`, leaf.fallback);
}

function checkRequest(c: Checker, where: string, req: ManifestRequest, names: Set<string>, m: ProviderManifest) {
  if (typeof req === "string") return c.template(where, req, names);
  c.keys(where, req, new Set([
    "method", "path", "url", "secretUrl", "query", "body", "form", "headers", "auth", "raw", "timeoutMs", "page"
  ]));
  if (!req || typeof req !== "object") return;
  const targets = [req.path, req.url, req.secretUrl].filter(v => v !== undefined).length;
  if (targets !== 1) c.fail(where, "needs exactly one of path, url or secretUrl");
  if (req.path !== undefined) c.template(`${where}.path`, req.path, names);
  if (req.url !== undefined) c.expr(`${where}.url`, req.url, names);
  if (req.secretUrl !== undefined) {
    c.str(`${where}.secretUrl.secret`, req.secretUrl?.secret);
    if (!m.secrets?.includes(req.secretUrl?.secret)) c.fail(`${where}.secretUrl.secret`, "must be listed in \"secrets\"");
    c.expr(`${where}.secretUrl.key`, req.secretUrl?.key, names);
  }
  if (req.method !== undefined && !["GET", "POST"].includes(req.method)) c.fail(`${where}.method`, "must be GET or POST");
  if (req.timeoutMs !== undefined && !(typeof req.timeoutMs === "number" && req.timeoutMs > 0)) c.fail(`${where}.timeoutMs`, "must be a positive number");
  if (req.raw !== undefined && typeof req.raw !== "boolean") c.fail(`${where}.raw`, "must be true or false");
  if (req.auth !== undefined && !["bearer", "optional", "none"].includes(req.auth)) c.fail(`${where}.auth`, "must be bearer, optional or none");
  if (req.body !== undefined) c.expr(`${where}.body`, req.body, names);
  for (const group of ["query", "form", "headers"] as const) for (const [k, v] of Object.entries(req[group] || {})) c.expr(`${where}.${group}.${k}`, v, names);
  if (req.headers && Object.keys(req.headers).some(h => h.toLowerCase() === "authorization")) c.fail(`${where}.headers`, "can't set Authorization; use auth");
  if (req.page) {
    const pageNames = new Set([...names, "response"]);
    c.expr(`${where}.page.items`, req.page.items, pageNames);
    c.expr(`${where}.page.while`, req.page.while, pageNames);
    checkRequest(c, `${where}.page.next`, req.page.next, pageNames, m);
  }
}

/** Check steps in order; names they bind are added to `names` for the steps after them. */
function checkSteps(c: Checker, where: string, steps: unknown, names: Set<string>, m: ProviderManifest) {
  if (steps === undefined) return;
  if (!Array.isArray(steps)) return c.fail(where, "must be an array of steps");
  steps.forEach((step: ManifestStep, i) => {
    const at = `${where}[${i}]`;
    if (!step || typeof step !== "object") return c.fail(at, "must be a step object");
    if (step.when !== undefined) c.expr(`${at}.when`, step.when, names);
    const bind = (as: unknown) => {
      if (typeof as !== "string" || !NAME.test(as)) c.fail(`${at}.as`, "must be a name");
      else names.add(as);
    };
    if ("let" in step) {
      for (const [name, expr] of Object.entries(step.let || {})) {
        if (!NAME.test(name)) c.fail(`${at}.let`, `bad name "${name}"`);
        c.expr(`${at}.let.${name}`, expr, names);
        names.add(name);
      }
    } else if ("setState" in step) {
      if (!step.setState || typeof step.setState !== "object" || Array.isArray(step.setState)) c.fail(`${at}.setState`, "must be an object");
      else {
        for (const [name, expr] of Object.entries(step.setState)) {
          if (!m.state || !Object.prototype.hasOwnProperty.call(m.state, name)) c.fail(`${at}.setState.${name}`, "must be declared in \"state\"");
          c.expr(`${at}.setState.${name}`, expr, names);
        }
      }
    } else if ("fetch" in step) {
      checkRequest(c, `${at}.fetch`, step.fetch, names, m);
      bind(step.as);
    } else if ("each" in step) {
      c.expr(`${at}.each`, step.each, names);
      const inner = new Set(names);
      if (typeof step.as !== "string" || !NAME.test(step.as)) c.fail(`${at}.as`, "must be a name");
      else inner.add(step.as);
      if (step.index !== undefined) inner.add(step.index);
      checkSteps(c, `${at}.steps`, step.steps, inner, m);
      if (step.return !== undefined) c.expr(`${at}.return`, step.return, inner);
      if (typeof step.into !== "string" || !NAME.test(step.into)) c.fail(`${at}.into`, "must be a name");
      else names.add(step.into);
    } else if ("call" in step) {
      const proc = m.procedures?.[step.call];
      if (!proc) c.fail(`${at}.call`, `unknown procedure "${step.call}"`);
      for (const [k, v] of Object.entries(step.args || {})) {
        if (proc && !(proc.params || []).includes(k)) c.fail(`${at}.args`, `"${step.call}" has no parameter "${k}"`);
        c.expr(`${at}.args.${k}`, v, names);
      }
      bind(step.as);
    } else if ("hook" in step) {
      if (!Object.values(m.hooks || {}).includes(step.hook)) c.fail(`${at}.hook`, `no setter in "hooks" provides "${step.hook}"`);
      (step.args || []).forEach((a, j) => c.expr(`${at}.args[${j}]`, a, names));
      if (step.else) checkSteps(c, `${at}.else`, step.else, new Set(names), m);
      bind(step.as);
    } else if ("if" in step) {
      c.expr(`${at}.if`, step.if, names);
      checkSteps(c, `${at}.then`, step.then, names, m);
      checkSteps(c, `${at}.else`, step.else, names, m);
    } else if ("cache" in step) {
      c.expr(`${at}.cache.key`, step.cache?.key, names);
      if (!(typeof step.cache?.seconds === "number" && step.cache.seconds > 0)) c.fail(`${at}.cache.seconds`, "must be a positive number");
      const inner = new Set([...names, "previous"]);
      checkSteps(c, `${at}.steps`, step.steps, inner, m);
      if (step.return !== undefined) c.expr(`${at}.return`, step.return, inner);
      if (step.cache?.keepWhen !== undefined) c.expr(`${at}.cache.keepWhen`, step.cache.keepWhen, new Set([...inner, "value"]));
      bind(step.as);
    } else if ("fail" in step) {
      c.expr(`${at}.fail`, step.fail, names);
    } else if ("return" in step) {
      c.expr(`${at}.return`, step.return, names);
    } else c.fail(at, "unknown step");
  });
}

function checkOperation(c: Checker, where: string, op: ManifestOperation, names: Set<string>, m: ProviderManifest) {
  if (typeof op === "string") return c.expr(where, op, names);
  c.keys(where, op, new Set(["steps", "return"]));
  if (!op || typeof op !== "object") return;
  const inner = new Set(names);
  checkSteps(c, `${where}.steps`, op.steps, inner, m);
  if (op.return !== undefined) c.expr(`${where}.return`, op.return, inner);
}

function checkRoutes(c: Checker, m: ProviderManifest) {
  if (!Array.isArray(m.routes) || m.routes.length === 0) return c.fail("routes", "must be a non-empty array");
  m.routes.forEach((r, i) => {
    const at = `routes[${i}]`;
    c.keys(at, r, new Set(["path", "load", "browse", "playlist", "instructions"]));
    if (typeof r?.path !== "string" || !r.path.startsWith("/")) return c.fail(`${at}.path`, "must start with /");
    const parts = r.path.split("/").filter(Boolean);
    parts.forEach((p, j) => {
      if (p.startsWith("*") && j !== parts.length - 1) c.fail(`${at}.path`, "a *rest segment must come last");
      if ((p.startsWith(":") || p.startsWith("*")) && !NAME.test(p.slice(1))) c.fail(`${at}.path`, `bad parameter "${p}"`);
    });
    const names = new Set([...GLOBALS, "path", "segments", "params"]);
    checkSteps(c, `${at}.load`, r.load, names, m);
    for (const op of ["browse", "playlist", "instructions"] as const) {
      if (r[op] !== undefined) checkOperation(c, `${at}.${op}`, r[op]!, op === "playlist" ? new Set([...names, "resolution"]) : names, m);
    }
  });
}

function checkProcedures(c: Checker, where: string, procs: unknown, m: ProviderManifest, isMethod: boolean) {
  if (procs === undefined) return;
  if (!procs || typeof procs !== "object" || Array.isArray(procs)) return c.fail(where, "must be an object");
  for (const [name, proc] of Object.entries(procs as Record<string, unknown>)) {
    const at = `${where}.${name}`;
    if (isMethod && (!/^[a-z]\w*$/.test(name) || RESERVED_METHODS.has(name))) c.fail(at, "isn't a method name a manifest can define");
    c.keys(at, proc, new Set(["params", "steps", "return"]));
    const p = proc as { params?: unknown; steps?: unknown; return?: string };
    const params = Array.isArray(p?.params) ? p.params : [];
    if (p?.params !== undefined && (!Array.isArray(p.params) || p.params.some(x => typeof x !== "string" || !NAME.test(x)))) c.fail(`${at}.params`, "must be an array of names");
    const names = new Set([...GLOBALS, ...params as string[]]);
    checkSteps(c, `${at}.steps`, p?.steps, names, m);
    if (p?.return !== undefined) c.expr(`${at}.return`, p.return, names);
  }
}

function checkNetworkDiscovery(c: Checker, nd: ProviderManifest["networkDiscovery"]) {
  if (nd === undefined) return;
  c.keys("networkDiscovery", nd, new Set(["serviceType", "defaultPort", "groupBy", "nameTemplate", "scope", "probe"]));
  if (!nd || typeof nd !== "object") return;
  if (typeof nd.serviceType !== "string" || !nd.serviceType) c.fail("networkDiscovery.serviceType", "must be a non-empty string");
  if (typeof nd.defaultPort !== "number" || nd.defaultPort <= 0 || nd.defaultPort > 65535) c.fail("networkDiscovery.defaultPort", "must be a valid TCP port");
  if (nd.groupBy !== undefined && !["lastDashSegment", "name"].includes(nd.groupBy)) c.fail("networkDiscovery.groupBy", "must be lastDashSegment or name");
  if (nd.nameTemplate !== undefined) c.str("networkDiscovery.nameTemplate", nd.nameTemplate);
  if (nd.scope !== undefined) c.str("networkDiscovery.scope", nd.scope);
  if (nd.probe !== undefined) {
    c.keys("networkDiscovery.probe", nd.probe, new Set(["method", "path", "body", "expect", "timeoutMs"]));
    if (nd.probe.method !== undefined && !["GET", "POST"].includes(nd.probe.method)) c.fail("networkDiscovery.probe.method", "must be GET or POST");
    if (nd.probe.path !== undefined) c.str("networkDiscovery.probe.path", nd.probe.path);
    if (nd.probe.timeoutMs !== undefined && !(typeof nd.probe.timeoutMs === "number" && nd.probe.timeoutMs > 0)) c.fail("networkDiscovery.probe.timeoutMs", "must be a positive number");
  }
}

function isHttpsTemplate(value: string) {
  return value.startsWith("https://") || value.startsWith("{env.");
}

/** Validate a manifest's shape and parse every expression. Throws with every problem found. */
export function validateManifest(value: unknown): ProviderManifest {
  const c = new Checker();
  const m = value as ProviderManifest;
  c.keys("manifest", m, TOP_KEYS);
  if (!m || typeof m !== "object") throw new Error(c.errors.join("\n"));

  if (typeof m.engine !== "number") c.fail("engine", "must be a number");
  else if (m.engine > MANIFEST_ENGINE_VERSION) c.fail("engine", `needs engine ${m.engine}; this build supports ${MANIFEST_ENGINE_VERSION}`);
  if (typeof m.id !== "string" || !ID_PATTERN.test(m.id)) c.fail("id", "must be lowercase letters, digits and dashes");
  c.str("name", m.name);
  c.str("logos.light", m.logos?.light);
  c.str("logos.dark", m.logos?.dark);
  if (!Array.isArray(m.hosts) || m.hosts.some(h => typeof h !== "string" || !h || h.includes("/") || h.includes("*"))) c.fail("hosts", "must be an array of host names (or \"lan\" for local-network addresses)");
  else if (m.hosts.length === 0) c.fail("hosts", "must list at least one host");
  if (m.authTypes !== undefined && (!Array.isArray(m.authTypes) || m.authTypes.some(t => !AUTH_TYPES.includes(t)))) c.fail("authTypes", `must only contain ${AUTH_TYPES.join(", ")}`);
  if (m.settings !== undefined && (typeof m.settings !== "object" || m.settings === null || Array.isArray(m.settings))) c.fail("settings", "must be an object");
  if (m.state !== undefined) {
    if (typeof m.state !== "object" || m.state === null || Array.isArray(m.state)) c.fail("state", "must be an object");
    else for (const k of Object.keys(m.state)) if (!NAME.test(k) || FORBIDDEN_KEYS.has(k)) c.fail(`state.${k}`, "bad state key");
  }
  if (typeof m.requiresAuth !== "boolean") c.fail("requiresAuth", "must be a boolean");
  for (const key of ["browse", "playlist", "instructions", "mediaLicensing"] as const) {
    if (typeof m.capabilities?.[key] !== "boolean") c.fail(`capabilities.${key}`, "must be a boolean");
  }
  if (m.capabilities?.mediaLicensing && !m.methods?.checkMediaLicense) c.fail("capabilities.mediaLicensing", "needs a checkMediaLicense method");

  if (m.environments !== undefined) {
    const names = Object.keys(m.environments);
    if (names.length === 0) c.fail("environments", "must not be empty");
    if (!m.defaultEnvironment || !names.includes(m.defaultEnvironment)) c.fail("defaultEnvironment", "must name one of the environments");
  }

  c.template("apiBase", m.apiBase, ROOTS);
  if (typeof m.apiBase === "string" && !isHttpsTemplate(m.apiBase) && m.apiBase !== "") c.fail("apiBase", "must be https (or empty when every request uses a full url)");

  if (m.auth !== undefined) {
    const a = m.auth;
    c.keys("auth", a, new Set([
      "oauthBase", "clientId", "clientSecret", "scopes", "pkce", "supportsSecretExchange", "deviceFlow", "authorizeUrl", "tokenUrl", "tokenEncoding", "authorizeParams", "formLogin"
    ]));
    const usesOAuth = !!(a.oauthBase || a.pkce || a.deviceFlow || a.clientId !== undefined);
    for (const key of ["authorizeUrl", "tokenUrl"] as const) {
      if (a[key] === undefined) continue;
      c.template(`auth.${key}`, a[key], ROOTS);
      if (typeof a[key] === "string" && !isHttpsTemplate(a[key]!)) c.fail(`auth.${key}`, "must be https");
    }
    if (a.tokenEncoding !== undefined && !["form", "json"].includes(a.tokenEncoding)) c.fail("auth.tokenEncoding", "must be form or json");
    if (a.supportsSecretExchange !== undefined && typeof a.supportsSecretExchange !== "boolean") c.fail("auth.supportsSecretExchange", "must be a boolean");
    for (const [k, v] of Object.entries(a.authorizeParams || {})) if (v !== null && typeof v !== "string") c.fail(`auth.authorizeParams.${k}`, "must be a string or null");
    if (usesOAuth) {
      c.template("auth.oauthBase", a.oauthBase, ROOTS);
      if (typeof a.oauthBase === "string" && !isHttpsTemplate(a.oauthBase)) c.fail("auth.oauthBase", "must be https");
      c.str("auth.clientId", a.clientId);
      if (a.clientSecret !== undefined && !/^secret:[\w-]+$/.test(a.clientSecret)) c.fail("auth.clientSecret", "must be a \"secret:<name>\" reference, never the secret itself");
      if (!Array.isArray(a.scopes)) c.fail("auth.scopes", "must be an array");
    }
    if (a.deviceFlow) {
      c.keys("auth.deviceFlow", a.deviceFlow, new Set(["endpoint", "encoding", "tokenUrl"]));
      c.str("auth.deviceFlow.endpoint", a.deviceFlow.endpoint);
      if (a.deviceFlow.encoding !== undefined && !["json", "form"].includes(a.deviceFlow.encoding)) c.fail("auth.deviceFlow.encoding", "must be json or form");
      if (a.deviceFlow.tokenUrl !== undefined) {
        c.template("auth.deviceFlow.tokenUrl", a.deviceFlow.tokenUrl, ROOTS);
        if (typeof a.deviceFlow.tokenUrl === "string" && !isHttpsTemplate(a.deviceFlow.tokenUrl)) c.fail("auth.deviceFlow.tokenUrl", "must be https");
      }
    }
    if (a.formLogin) {
      const fl = a.formLogin;
      c.keys("auth.formLogin", fl, new Set([
        "path", "url", "encoding", "usernameField", "passwordField", "extraFields", "headers", "tokenExpr", "refreshTokenExpr", "expiresInExpr", "defaultExpiresIn"
      ]));
      const targets = [fl.path, fl.url].filter(v => v !== undefined).length;
      if (targets !== 1) c.fail("auth.formLogin", "needs exactly one of path or url");
      if (fl.path !== undefined) c.template("auth.formLogin.path", fl.path, ROOTS);
      if (fl.url !== undefined) {
        c.template("auth.formLogin.url", fl.url, ROOTS);
        if (typeof fl.url === "string" && !isHttpsTemplate(fl.url)) c.fail("auth.formLogin.url", "must be https");
      }
      if (fl.encoding !== undefined && !["json", "form"].includes(fl.encoding)) c.fail("auth.formLogin.encoding", "must be json or form");
      const respNames = new Set(["response"]);
      if (fl.tokenExpr !== undefined) c.expr("auth.formLogin.tokenExpr", fl.tokenExpr, respNames);
      if (fl.refreshTokenExpr !== undefined) c.expr("auth.formLogin.refreshTokenExpr", fl.refreshTokenExpr, respNames);
      if (fl.expiresInExpr !== undefined) c.expr("auth.formLogin.expiresInExpr", fl.expiresInExpr, respNames);
    }
  }
  checkNetworkDiscovery(c, m.networkDiscovery);
  if (m.requiresAuth && !m.auth && !m.networkDiscovery && !m.authTypes?.length) c.fail("auth", "required when requiresAuth is true");

  if (m.cache !== undefined && !(typeof m.cache.ttlSeconds === "number" && m.cache.ttlSeconds > 0)) c.fail("cache.ttlSeconds", "must be a positive number");

  for (const [name] of Object.entries(m.functions || {})) {
    if (!NAME.test(name) || FUNCTIONS[name]) c.fail(`functions.${name}`, "must be a new name, not a built-in function");
    c.fns.add(name);
    c.own.add(name);
  }
  for (const [name, fn] of Object.entries(m.functions || {})) {
    const at = `functions.${name}`;
    if (typeof fn === "string") {
      c.expr(at, fn, new Set(["settings", "datasets"]));
      try {
        if (typeof evalExpr(fn, {}) !== "function") c.fail(at, "must be a lambda, e.g. \"(x) => ...\"");
      } catch {
        // parse error already reported
      }
    } else if (fn && typeof fn === "object" && !Array.isArray(fn)) {
      c.keys(at, fn, new Set(["params", "let", "return"]));
      const params = Array.isArray(fn.params) ? fn.params : [];
      if (fn.params !== undefined && (!Array.isArray(fn.params) || fn.params.some(p => typeof p !== "string" || !NAME.test(p)))) c.fail(`${at}.params`, "must be an array of names");
      const fnNames = new Set(["settings", "datasets", ...params]);
      if (fn.let !== undefined) {
        if (!fn.let || typeof fn.let !== "object" || Array.isArray(fn.let)) c.fail(`${at}.let`, "must be an object");
        else {
          for (const [varName, expr] of Object.entries(fn.let)) {
            if (!NAME.test(varName)) c.fail(`${at}.let`, `bad name "${varName}"`);
            c.expr(`${at}.let.${varName}`, expr, fnNames);
            fnNames.add(varName);
          }
        }
      }
      c.expr(`${at}.return`, fn.return, fnNames);
    } else {
      c.fail(at, "must be a lambda string or { params, let, return } object");
    }
  }

  if (m.secrets !== undefined && (!Array.isArray(m.secrets) || m.secrets.some(s => typeof s !== "string" || !NAME.test(s)))) c.fail("secrets", "must be an array of names");
  for (const [name, dataset] of Object.entries(m.datasets || {})) {
    if (!NAME.test(name)) c.fail(`datasets.${name}`, "bad name");
    if (typeof dataset === "string") {
      const isRemote = dataset.startsWith("https://");
      const isRelative = !dataset.includes("..") && !dataset.startsWith("/") && !/^\w+:/.test(dataset);
      if (!isRemote && !isRelative) c.fail(`datasets.${name}`, "must be a relative path beside the manifest, an https URL, or inline JSON");
    } else if (!dataset || typeof dataset !== "object") {
      c.fail(`datasets.${name}`, "must be a path string or inline JSON object/array");
    }
  }
  for (const [setter, hook] of Object.entries(m.hooks || {})) {
    if (!/^set[A-Z]\w*$/.test(setter) || RESERVED_METHODS.has(setter)) c.fail(`hooks.${setter}`, "must be a setter name such as setLoader");
    if (typeof hook !== "string" || !NAME.test(hook)) c.fail(`hooks.${setter}`, "must name the hook");
  }
  checkProcedures(c, "procedures", m.procedures, m, false);
  checkProcedures(c, "methods", m.methods, m, true);

  if (m.routes !== undefined) {
    if (m.tree !== undefined) c.fail("tree", "use tree or routes, not both");
    checkRoutes(c, m);
  } else checkGroups(c, "tree", m.tree);

  if (c.errors.length) throw new Error(`Invalid provider manifest "${m.id}":\n${c.errors.join("\n")}`);
  return m;
}

export function validateIndex(value: unknown): ProviderIndex {
  const c = new Checker();
  const index = value as ProviderIndex;
  c.keys("index", index, new Set(["engine", "providers"]));
  if (typeof index?.engine !== "number") c.fail("engine", "must be a number");
  if (!Array.isArray(index?.providers)) c.fail("providers", "must be an array");
  else {
    index.providers.forEach((p, i) => {
      const at = `providers[${i}]`;
      c.keys(at, p, new Set(["id", "manifest", "comingSoon", "name", "logos"]));
      if (typeof p?.id !== "string" || !ID_PATTERN.test(p.id)) c.fail(`${at}.id`, "must be lowercase letters, digits and dashes");
      if (!p?.manifest === !p?.comingSoon) c.fail(at, "needs exactly one of manifest or comingSoon");
      if (p?.manifest !== undefined) {
        const isRemote = typeof p.manifest === "string" && p.manifest.startsWith("https://");
        const isRel = typeof p.manifest === "string" && !p.manifest.includes("..") && !/^\w+:/.test(p.manifest);
        if (!isRemote && !isRel) c.fail(`${at}.manifest`, "must be a relative path or https URL");
      }
      if (p?.comingSoon) c.str(`${at}.name`, p.name);
    });
  }
  if (c.errors.length) throw new Error(`Invalid provider index:\n${c.errors.join("\n")}`);
  return index;
}
