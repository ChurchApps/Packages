import { exprRoots, templateExprs } from "./expression";
import { MANIFEST_ENGINE_VERSION, ManifestGroup, ManifestLeaf, ProviderIndex, ProviderManifest } from "./types";

const ROOTS = new Set(["segments", "parent", "parents", "item", "response", "env", "index"]);
const TOP_KEYS = new Set([
  "engine", "id", "name", "logos", "hosts", "requiresAuth", "capabilities", "environments", "defaultEnvironment", "apiBase", "auth", "cache", "verifyPaths", "tree", "authTypes", "implementation", "settings"
]);
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
      for (const root of exprRoots(value)) if (!names.has(root)) this.fail(where, `unknown name "${root}"`);
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
        if (typeof step?.as !== "string" || !/^[A-Za-z_]\w*$/.test(step.as)) c.fail(`${where}.from[${i}].as`, "must be a name");
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
  const builtIn = m.implementation !== undefined;
  if (builtIn && (typeof m.implementation !== "string" || !ID_PATTERN.test(m.implementation))) c.fail("implementation", "must be a built-in implementation name");
  if (!Array.isArray(m.hosts) || m.hosts.some(h => typeof h !== "string" || !h)) c.fail("hosts", "must be an array of host names");
  else if (!builtIn && m.hosts.length === 0) c.fail("hosts", "must list at least one host");
  if (m.authTypes !== undefined && (!Array.isArray(m.authTypes) || m.authTypes.some(t => !AUTH_TYPES.includes(t)))) c.fail("authTypes", `must only contain ${AUTH_TYPES.join(", ")}`);
  if (m.settings !== undefined && (typeof m.settings !== "object" || m.settings === null || Array.isArray(m.settings))) c.fail("settings", "must be an object");
  if (typeof m.requiresAuth !== "boolean") c.fail("requiresAuth", "must be a boolean");
  for (const key of ["browse", "playlist", "instructions", "mediaLicensing"] as const) {
    if (typeof m.capabilities?.[key] !== "boolean") c.fail(`capabilities.${key}`, "must be a boolean");
  }
  if (m.capabilities?.mediaLicensing && !builtIn) c.fail("capabilities.mediaLicensing", "needs a built-in implementation");

  if (m.environments !== undefined) {
    const names = Object.keys(m.environments);
    if (names.length === 0) c.fail("environments", "must not be empty");
    if (!m.defaultEnvironment || !names.includes(m.defaultEnvironment)) c.fail("defaultEnvironment", "must name one of the environments");
  }

  c.template("apiBase", m.apiBase, ROOTS);
  if (typeof m.apiBase === "string" && !isHttpsTemplate(m.apiBase) && !(builtIn && m.apiBase === "")) c.fail("apiBase", "must be https");

  if (m.auth !== undefined) {
    const a = m.auth;
    c.keys("auth", a, new Set(["oauthBase", "clientId", "clientSecret", "scopes", "pkce", "deviceFlow"]));
    c.template("auth.oauthBase", a.oauthBase, ROOTS);
    if (typeof a.oauthBase === "string" && !isHttpsTemplate(a.oauthBase)) c.fail("auth.oauthBase", "must be https");
    c.str("auth.clientId", a.clientId);
    if (a.clientSecret !== undefined && !/^secret:[\w-]+$/.test(a.clientSecret)) c.fail("auth.clientSecret", "must be a \"secret:<name>\" reference, never the secret itself");
    if (!Array.isArray(a.scopes)) c.fail("auth.scopes", "must be an array");
    if (a.deviceFlow) {
      c.str("auth.deviceFlow.endpoint", a.deviceFlow.endpoint);
      if (a.deviceFlow.encoding !== undefined && !["json", "form"].includes(a.deviceFlow.encoding)) c.fail("auth.deviceFlow.encoding", "must be json or form");
    }
  }
  if (m.requiresAuth && !m.auth && !m.authTypes?.length) c.fail("auth", "required when requiresAuth is true");

  if (m.cache !== undefined && !(typeof m.cache.ttlSeconds === "number" && m.cache.ttlSeconds > 0)) c.fail("cache.ttlSeconds", "must be a positive number");

  if (builtIn) {
    if (m.tree !== undefined) c.fail("tree", "can't be combined with implementation");
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
      if (p?.manifest !== undefined && (typeof p.manifest !== "string" || p.manifest.includes(".."))) c.fail(`${at}.manifest`, "must be a relative path");
      if (p?.comingSoon) c.str(`${at}.name`, p.name);
    });
  }
  if (c.errors.length) throw new Error(`Invalid provider index:\n${c.errors.join("\n")}`);
  return index;
}
