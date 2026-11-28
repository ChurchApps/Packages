import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { ManifestProvider } from "../src/manifest/ManifestProvider";
import { validateManifest } from "../src/manifest/validate";
import { evalExpr } from "../src/manifest/expression";
import { setProviderSecret } from "../src/helpers/ProviderSecrets";
import { ContentProviderAuthData } from "../src/interfaces";

const auth: ContentProviderAuthData = { access_token: "at", refresh_token: "", token_type: "Bearer", created_at: 0, expires_in: 3600, scope: "" };
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

type Call = { url: string; init?: RequestInit };
function serve(handler: (url: URL, body: any) => unknown): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    let parsed: unknown;
    try { parsed = init?.body ? JSON.parse(String(init.body)) : undefined; } catch { parsed = String(init?.body); }
    const body = handler(new URL(String(url)), parsed);
    if (body instanceof Response) return body;
    return body === undefined ? new Response("{}", { status: 404 }) : new Response(JSON.stringify(body));
  }) as typeof fetch;
  return calls;
}

const base = (extra: Record<string, unknown>) => ({
  engine: 1,
  id: "routes-example",
  name: "Routes Example",
  logos: { light: "", dark: "" },
  hosts: ["api.example.com"],
  requiresAuth: true,
  capabilities: { browse: true, playlist: true, instructions: true, mediaLicensing: false },
  apiBase: "https://api.example.com",
  auth: { oauthBase: "https://api.example.com/oauth", clientId: "c", scopes: [], pkce: true },
  ...extra
});

// --- expression language ---

test("lambdas, literals, spread and list functions", () => {
  const scope = { items: [{ n: "10 b" }, { n: "2 a" }, { n: "B" }, { n: "a" }] };
  assert.deepEqual(evalExpr("map(sortBy(items, x => x.n, 'natural'), x => x.n)", scope), ["2 a", "10 b", "a", "B"]);
  assert.deepEqual(evalExpr("map(sortBy(items, x => x.n, 'raw'), x => x.n)", scope), ["10 b", "2 a", "B", "a"]);
  assert.deepEqual(evalExpr("{ ...items[0], extra: [1, ...[2, 3]] }", scope), { n: "10 b", extra: [1, 2, 3] });
  assert.deepEqual(evalExpr("map(groupConsecutive(['a1', 'a2', 'b', 'a3'], s => slice(s, 0, 1)), g => len(g.items))", {}), [2, 1, 1]);
  assert.equal(evalExpr("with(match('Point 12', '^(.+?)\\s*\\d+$'), m => m[1])", {}), "Point");
  assert.equal(evalExpr("replace('a**b**c', '\\*+', '')", {}), "abc");
  assert.equal(evalExpr("with(3, x => x * 2 + 1)", {}), 7);
  assert.equal(evalExpr("'id-' + missing", {}), "id-", "missing values join as empty text");
});

test("manifest functions can call each other, recurse, and be passed by name", () => {
  const p = new ManifestProvider(base({
    functions: { double: "(x) => x * 2", sum: "(list) => len(list) == 0 ? 0 : list[0] + sum(slice(list, 1))", doubled: "(list) => map(list, double)" },
    routes: [{ path: "/", browse: "[]" }]
  }));
  assert.equal(p.callFunction("sum", [1, 2, 3]), 6);
  assert.deepEqual(p.callFunction("doubled", [1, 2]), [2, 4]);
  const runaway = new ManifestProvider(base({ functions: { loop: "(x) => loop(x)" }, routes: [{ path: "/", browse: "[]" }] }));
  assert.throws(() => runaway.callFunction("loop", 1), /too deep/);
});

// --- validation ---

test("validation checks routes, steps, requests and declarations", () => {
  const cases: [string, Record<string, unknown>, RegExp][] = [
    ["unknown procedure", { routes: [{ path: "/", browse: { steps: [{ call: "nope", as: "x" }], return: "x" } }] }, /unknown procedure "nope"/],
    ["undeclared secret url", { routes: [{ path: "/", browse: { steps: [{ fetch: { secretUrl: { secret: "feeds", key: "'a'" } }, as: "x" }], return: "x" } }] }, /must be listed in "secrets"/],
    ["timeout as text", { routes: [{ path: "/", browse: { steps: [{ fetch: { path: "/x", timeoutMs: "fast" }, as: "x" }], return: "x" } }] }, /timeoutMs/],
    ["name used before it's bound", { routes: [{ path: "/", browse: { steps: [{ let: { a: "b" } }, { let: { b: "1" } }], return: "a" } }] }, /unknown name "b"/],
    ["reserved method", { routes: [{ path: "/", browse: "[]" }], methods: { browse: { return: "1" } } }, /isn't a method name/],
    ["bad hook setter", { routes: [{ path: "/", browse: "[]" }], hooks: { loader: "x" } }, /setter name/],
    ["function that isn't a lambda", { routes: [{ path: "/", browse: "[]" }], functions: { f: "1 + 1" } }, /must be a lambda/],
    ["tree and routes", { routes: [{ path: "/", browse: "[]" }], tree: [{ static: [{ id: "a", title: "A" }] }] }, /tree or routes, not both/],
    ["rest segment not last", { routes: [{ path: "/*rest/x", browse: "[]" }] }, /must come last/],
    ["Authorization header", { routes: [{ path: "/", browse: { steps: [{ fetch: { path: "/x", headers: { Authorization: "'x'" } }, as: "x" }], return: "x" } }] }, /can't set Authorization/]
  ];
  for (const [name, extra, error] of cases) assert.throws(() => validateManifest(base(extra)), error, name);
});

// --- runtime ---

test("routes match literal, :param and *rest segments, first match wins", async () => {
  const p = new ManifestProvider(base({
    routes: [
      { path: "/", browse: "[{ type: 'folder', id: 'r', title: 'Root', path: '/a' }]" },
      { path: "/special", browse: "[{ type: 'file', id: 'special', title: 'S', url: 'https://x/s.mp4' }]" },
      { path: "/:one", browse: "[{ type: 'file', id: params.one, title: 'One', url: 'https://x/1.png' }]" },
      { path: "/:one/*rest", browse: "[{ type: 'file', id: join(params.rest, '|'), title: 'Rest', url: 'https://x/r.mp3' }]" }
    ]
  }));
  assert.equal((await p.browse("/special", auth))[0].id, "special");
  assert.equal((await p.browse("/x", auth))[0].id, "x");
  const rest = (await p.browse("/x/y/z", auth))[0] as any;
  assert.equal(rest.id, "y|z");
  assert.equal(rest.mediaType, "audio", "media type is detected when not given");
});

test("requests page, share one fetch per call, and only send the token to apiBase paths", async () => {
  const calls = serve((url) => {
    if (url.pathname === "/list") return url.searchParams.get("page") === "2" ? { items: [3], more: false } : { items: [1, 2], more: true };
    if (url.hostname === "cdn.example.com") return { ok: true };
    return undefined;
  });
  const p = new ManifestProvider(base({
    hosts: ["api.example.com", "cdn.example.com"],
    routes: [{
      path: "/",
      browse: {
        steps: [
          { fetch: { path: "/list", page: { items: "response.items", while: "response.more", next: { path: "/list", query: { page: "'2'" } } } }, as: "all" },
          { fetch: { path: "/list", page: { items: "response.items", while: "false", next: "/list" } }, as: "again" },
          { fetch: { url: "'https://cdn.example.com/meta'" }, as: "meta" }
        ],
        return: "map(concat(all, [meta.ok]), (x, i) => ({ type: 'folder', id: str(x), title: 't', path: '/' + i }))"
      }
    }]
  }));
  const items = await p.browse("/", auth);
  assert.deepEqual(items.map(i => i.id), ["1", "2", "3", "true"]);
  assert.equal(calls.filter(c => c.url === "https://api.example.com/list").length, 1, "the same request runs once per call");
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, "Bearer at");
  const cdn = calls.find(c => c.url.startsWith("https://cdn."))!;
  assert.equal((cdn.init?.headers as Record<string, string>).Authorization, undefined);
});

test("unlisted hosts, plain http and LAN addresses follow the host list", async () => {
  serve(() => ({}));
  const make = (hosts: string[], url: string) => new ManifestProvider(base({ hosts: hosts.length ? hosts : ["api.example.com"], routes: [{ path: "/", browse: { steps: [{ fetch: { url: `'${url}'`, auth: "none" }, as: "r" }], return: "[]" } }] }));
  await assert.rejects(make(["api.example.com"], "https://evil.example.com/x").browse("/", auth), /not on this provider's host list/);
  await assert.rejects(make(["api.example.com"], "http://api.example.com/x").browse("/", auth), /not on this provider's host list/);
  await assert.rejects(make(["lan"], "http://8.8.8.8/x").browse("/", auth), /not on this provider's host list/);
  assert.deepEqual(await make(["lan"], "http://192.168.1.20:5506/").browse("/", auth), []);
});

test("cache steps keep fresh values, retry stale ones, and offer the previous value", async () => {
  let n = 0;
  serve(() => ({ n: ++n }));
  const p = new ManifestProvider(base({
    routes: [{
      path: "/",
      browse: {
        steps: [{ cache: { key: "'k'", seconds: 60, keepWhen: "value.n >= 2" }, as: "v", steps: [{ fetch: "/count", as: "r" }], return: "{ n: r.n, before: previous && previous.n }" }],
        return: "[{ type: 'folder', id: str(v.n), title: str(v.before), path: '/' }]"
      }
    }]
  }));
  assert.equal((await p.browse("/", auth))[0].id, "1");
  const second = (await p.browse("/", auth))[0];
  assert.deepEqual([second.id, second.title], ["2", "1"], "not fresh yet, so it refetches and sees the previous value");
  assert.equal((await p.browse("/", auth))[0].id, "2", "fresh now");
  assert.equal(n, 2);
});

test("hooks, methods, fail steps and secret urls", async () => {
  setProviderSecret("feeds", JSON.stringify({ a: "https://anywhere.example.net/a.json" }));
  const calls = serve((url) => (url.hostname === "anywhere.example.net" ? { from: "feed" } : undefined));
  const p = new ManifestProvider(base({
    secrets: ["feeds"],
    hooks: { setLoader: "loader" },
    procedures: {
      load: { params: ["key"], steps: [{ hook: "loader", args: ["key", "auth"], as: "data", else: [{ fetch: { secretUrl: { secret: "feeds", key: "key" } }, as: "feed" }, { return: "feed" }] }], return: "data" }
    },
    methods: {
      getThing: { params: ["key"], steps: [{ call: "load", args: { key: "key" }, as: "d" }, { fail: "'missing ' + key", when: "!d" }], return: "{ d, token: auth && auth.access_token }" }
    },
    routes: [{ path: "/", browse: "[]" }]
  })) as any;

  assert.deepEqual(await p.getThing("a", auth), { d: { from: "feed" }, token: "at" });
  assert.equal(calls[0].url, "https://anywhere.example.net/a.json", "a host-supplied secret url isn't host-checked");
  await assert.rejects(p.getThing("b", auth), /missing b/);

  p.setLoader(async (key: string, a: ContentProviderAuthData) => ({ from: "hook", key, token: a.access_token }));
  assert.deepEqual((await p.getThing("b", auth)).d, { from: "hook", key: "b", token: "at" });
  setProviderSecret("feeds", "");
});

test("pkce honors custom authorize and token urls and parameters", async () => {
  const p = new ManifestProvider(base({
    hosts: ["api.example.com", "login.example.com"],
    auth: { oauthBase: "https://api.example.com/oauth", authorizeUrl: "https://login.example.com/consent", tokenUrl: "https://login.example.com/token", authorizeParams: { scope: null, access_type: "offline" }, clientId: "c", scopes: ["a"], pkce: true },
    routes: [{ path: "/", browse: "[]" }]
  })) as any;
  const url = new URL(p.buildAuthUrlFromChallenge("chal", "https://cb", "st"));
  assert.equal(url.origin + url.pathname, "https://login.example.com/consent");
  assert.equal(url.searchParams.get("scope"), null);
  assert.equal(url.searchParams.get("access_type"), "offline");
  const calls = serve(() => ({ access_token: "new", expires_in: 60 }));
  assert.equal((await p.exchangeCodeForTokens("code", "verifier", "https://cb")).access_token, "new");
  assert.equal(calls[0].url, "https://login.example.com/token");
});
