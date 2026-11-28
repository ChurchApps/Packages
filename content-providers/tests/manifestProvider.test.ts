import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { ManifestProvider } from "../src/manifest/ManifestProvider";
import { validateManifest, validateIndex } from "../src/manifest/validate";
import { evalExpr, fillTemplate } from "../src/manifest/expression";
import { loadProviderIndex } from "../src/manifest/loader";
import { getProvider } from "../src/providers/index";
import { ContentProviderAuthData } from "../src/interfaces";
import cbnManifest from "../src/manifests/providers/cbn.json";
import bundledIndex from "../src/manifests/index.json";
import b1Manifest from "../src/manifests/providers/b1church.json";
import { B1ChurchProvider } from "../src/providers/b1Church";
import { ConfiguredProvider } from "../src/manifest/ConfiguredProvider";
import { getAllProviders } from "../src/providers/index";

const auth: ContentProviderAuthData = { access_token: "at", refresh_token: "rt", token_type: "Bearer", created_at: 0, expires_in: 3600, scope: "" };
const CBN = "https://sbamemberdev.wpenginepowered.com/wp-json/superbook/v1";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function mockApi(routes: Record<string, unknown>): string[] {
  const calls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    calls.push(String(url));
    const body = routes[String(url)];
    return body === undefined ? new Response("{}", { status: 404 }) : new Response(JSON.stringify(body));
  }) as typeof fetch;
  return calls;
}

const minimal = () => ({
  engine: 1,
  id: "example",
  name: "Example",
  logos: { light: "https://x/l.png", dark: "https://x/d.png" },
  hosts: ["api.example.com"],
  requiresAuth: false,
  capabilities: { browse: true, playlist: true, instructions: true, mediaLicensing: false },
  apiBase: "https://api.example.com",
  tree: [{ request: "/videos", items: "response", folder: { id: "item.id", title: "item.name" }, leaf: { request: "/videos/{segments[0]}", playlist: { file: { id: "item.id", title: "item.name", url: "item.url" } } } }]
});

// --- expressions ---

test("expressions read paths, coalesce, compare and branch", () => {
  const scope = { item: { name: "A", n: 2, tags: ["x", "y"], empty: "" }, segments: ["a", "b"] };
  assert.equal(evalExpr("item.name", scope), "A");
  assert.equal(evalExpr("item.tags[1]", scope), "y");
  assert.equal(evalExpr("segments[0] + '-' + item.n", scope), "a-2");
  assert.equal(evalExpr("item.n + 1", scope), 3);
  assert.equal(evalExpr("item.missing ?? 'none'", scope), "none");
  assert.equal(evalExpr("item.empty || 'fallback'", scope), "fallback");
  assert.equal(evalExpr("item.n == 2 ? 'two' : 'other'", scope), "two");
  assert.equal(evalExpr("!item.missing && oneOf(item.name, 'A', 'B')", scope), true);
  assert.deepEqual(evalExpr("list(item, 'nope', 'tags')", scope), ["x", "y"]);
});

test("expressions can't reach prototypes or call anything outside the whitelist", () => {
  const scope = { item: {} };
  assert.equal(evalExpr("item.constructor", scope), undefined);
  assert.equal(evalExpr("item['__proto__']", scope), undefined);
  assert.equal(evalExpr("item.toString", scope), undefined);
  assert.throws(() => evalExpr("fetch('https://evil')", scope), /Unknown function/);
  assert.throws(() => evalExpr("item.name = 1", scope), /Unexpected/);
});

test("request templates encode values so a segment can't change the path", () => {
  assert.equal(fillTemplate("/videos/{segments[0]}", { segments: ["a/../b?x=1"] }, true), "/videos/a%2F..%2Fb%3Fx%3D1");
  assert.equal(fillTemplate("{env.site}/api", { env: { site: "https://x.org" } }, false), "https://x.org/api");
});

// --- validation ---

test("every provider comes from a bundled manifest listed in the index", () => {
  const index = validateIndex(bundledIndex);
  const listed = index.providers.filter(p => p.manifest).map(p => p.id);
  assert.deepEqual(getAllProviders().map(p => p.id), listed, "registry order follows the index");
  for (const provider of getAllProviders()) {
    assert.ok(provider instanceof ConfiguredProvider, `${provider.id} is manifest-backed`);
    assert.equal((provider as ConfiguredProvider).manifest.id, provider.id);
  }
  validateManifest(cbnManifest);
});

test("built-in implementations take their identity and auth config from the manifest", () => {
  const p = new B1ChurchProvider({ ...b1Manifest, name: "Renamed", auth: { ...b1Manifest.auth, clientId: "other-client" } });
  assert.equal(p.id, "b1church");
  assert.equal(p.name, "Renamed");
  assert.equal(p.config.clientId, "other-client");
  assert.equal(p.config.oauthBase, "https://api.churchapps.org/membership/oauth");
  assert.deepEqual(p.authTypes, ["oauth_pkce", "device_flow"]);
});

test("a manifest can't name an implementation and also define a tree", () => {
  assert.throws(() => validateManifest({ ...minimal(), implementation: "b1church" }), /can't be combined with implementation/);
});

test("validation rejects unsafe or broken manifests", () => {
  const cases: [string, (m: any) => void, RegExp][] = [
    ["literal client secret", m => { m.requiresAuth = true; m.auth = { oauthBase: "https://api.example.com/oauth", clientId: "c", clientSecret: "hunter2", scopes: [], pkce: true }; }, /secret:<name>/],
    ["http api", m => { m.apiBase = "http://api.example.com"; }, /https/],
    ["bad expression", m => { m.tree[0].folder.title = "item.name +"; }, /end of expression/],
    ["unknown function", m => { m.tree[0].folder.title = "eval(item)"; }, /Unknown function/],
    ["unknown name", m => { m.tree[0].folder.title = "window.name"; }, /unknown name "window"/],
    ["unknown field", m => { m.script = "alert(1)"; }, /unknown field "script"/],
    ["newer engine", m => { m.engine = 99; }, /needs engine 99/],
    ["auth required", m => { m.requiresAuth = true; }, /required when requiresAuth/]
  ];
  for (const [name, change, error] of cases) {
    const m = minimal();
    change(m);
    assert.throws(() => validateManifest(m), error, name);
  }
});

test("requests to hosts the manifest doesn't list are refused", async () => {
  const m = minimal();
  m.apiBase = "https://elsewhere.example.com";
  const calls = mockApi({});
  await assert.rejects(new ManifestProvider(m).browse("/", null), /not on this provider's host list/);
  assert.equal(calls.length, 0);
});

test("only the methods a manifest declares exist on the provider", () => {
  const m = minimal();
  m.capabilities.instructions = false;
  const p = new ManifestProvider(m) as any;
  assert.ok("getPlaylist" in p);
  assert.ok(!("getInstructions" in p));
  assert.ok(!("buildAuthUrl" in p));
  assert.ok(!("initiateDeviceFlow" in p));
  assert.deepEqual(p.authTypes, ["none"]);
});

// --- CBN (manifest-only provider) ---

test("CBN browses catalog → courses → lessons → videos from its manifest", async () => {
  const calls = mockApi({
    [`${CBN}/catalog`]: [{ id: 5, title: "Superbook S1", thumb: { url: "https://x/full.jpg", sizes: { medium: "https://x/med.jpg" } } }],
    [`${CBN}/catalog/5`]: { lessons: [{ id: 51, title: "Creation", thumb: "https://x/creation.jpg" }] },
    [`${CBN}/lesson-playlist/51`]: { brightcove_policy_key: "pk", lesson_title: "Creation", playlist: [{ title: "Episode", video_id: "v1", account_id: "acc", playback_url: "https://x/v1.m3u8", mp4_url: null }] }
  });
  const p = getProvider("cbn")!;

  assert.deepEqual(await p.browse("/", auth), [{ type: "folder", id: "catalog-root", title: "Catalog", path: "/catalog" }]);
  assert.equal(calls.length, 0);

  const courses = await p.browse("/catalog", auth);
  assert.deepEqual(courses.map(c => [c.id, c.title, (c as any).path, c.thumbnail]), [["5", "Superbook S1", "/catalog/5", "https://x/med.jpg"]]);

  const lessons = await p.browse("/catalog/5", auth);
  assert.deepEqual(lessons.map(l => [l.id, (l as any).path, (l as any).isLeaf, l.thumbnail]), [["51", "/catalog/5/51", true, "https://x/creation.jpg"]]);

  const files = await p.getPlaylist!("/catalog/5/51", auth);
  assert.equal(files?.length, 1);
  const [file] = files!;
  assert.equal(file.url, "https://x/v1.m3u8", "falls back to the playback url when there's no mp4");
  assert.equal(file.mediaType, "video");
  assert.equal(file.mediaId, "v1");
  assert.deepEqual(file.providerData, { brightcovePolicyKey: "pk", brightcoveAccountId: "acc", brightcoveVideoId: "v1", brightcovePlaybackUrl: "https://x/v1.m3u8", brightcoveMp4Url: undefined });

  const instructions = await p.getInstructions!("/catalog/5/51", auth);
  assert.equal(instructions?.name, "Creation");
  assert.equal(instructions?.items[0].children?.[0].downloadUrl, "https://x/v1.m3u8");
});

test("CBN playlist loads only the lesson, without re-walking the catalog", async () => {
  const calls = mockApi({ [`${CBN}/lesson-playlist/51`]: { lesson_title: "Creation", playlist: [{ title: "E", video_id: "v1", playback_url: "https://x/v.m3u8", mp4_url: "https://x/v.mp4" }] } });
  const files = await getProvider("cbn")!.getPlaylist!("/catalog/5/51", auth);
  assert.equal(files?.[0].url, "https://x/v.mp4");
  assert.deepEqual(calls, [`${CBN}/lesson-playlist/51`]);
});

test("CBN device flow uses the shared JSON device flow", async () => {
  const calls: { url: string; body: string }[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), body: String(init?.body) });
    return new Response(JSON.stringify({ device_code: "dc", user_code: "U", verification_uri: "https://x", expires_in: 600 }));
  }) as typeof fetch;
  const p = getProvider("cbn") as any;
  assert.equal(p.supportsDeviceFlow(), true);
  assert.equal((await p.initiateDeviceFlow())?.user_code, "U");
  assert.equal(calls[0].url, `${CBN}/auth/device`);
  assert.equal(JSON.parse(calls[0].body).client_id, "freeplay");
});

// --- plan provider (manifest-only, with a date filter) ---

test("plan provider lists service types and upcoming plans from its manifest", async () => {
  const API = "https://api.planningcenteronline.com/services/v2/service_types";
  const soon = new Date(Date.now() + 2 * 86400000).toISOString();
  const later = new Date(Date.now() + 30 * 86400000).toISOString();
  mockApi({
    [API]: { data: [{ id: "st1", attributes: { name: "Sunday" } }] },
    [`${API}/st1/plans?filter=future&order=sort_date`]: { data: [
      { id: "p1", attributes: { title: "", sort_date: soon, items_count: 4 } },
      { id: "p2", attributes: { title: "Empty", sort_date: soon, items_count: 0 } },
      { id: "p3", attributes: { title: "Far off", sort_date: later, items_count: 4 } }
    ] },
    [`${API}/st1/plans/p1/items?per_page=100`]: { data: [{ id: "i1", attributes: { title: "Welcome" } }] }
  });
  const p = getProvider("planningcenter")!;
  assert.deepEqual(p.authTypes, []);
  assert.deepEqual((await p.browse("/", auth)).map(f => (f as any).path), ["/serviceTypes"]);
  assert.deepEqual((await p.browse("/serviceTypes", auth)).map(f => [f.id, f.title]), [["st1", "Sunday"]]);
  const plans = await p.browse("/serviceTypes/st1", auth);
  assert.deepEqual(plans.map(f => [f.id, f.title, (f as any).isLeaf]), [["p1", soon.slice(0, 10), true]], "skips empty and far-off plans; untitled plans show their date");
  assert.deepEqual((await p.browse("/serviceTypes/st1/p1", auth)).map(f => [f.id, f.title]), [["i1", "Welcome"]]);
});

// --- remote index ---

function serve(files: Record<string, unknown>) {
  return (async (url: string) => {
    const body = files[String(url)];
    return body === undefined ? new Response("", { status: 404 }) : new Response(typeof body === "string" ? body : JSON.stringify(body));
  }) as typeof fetch;
}

test("loadProviderIndex registers verified remote manifests; unknown implementations are skipped", async () => {
  const remote = minimal();
  remote.id = "remote-example";
  const codeOnly = { ...minimal(), id: "needs-code", implementation: "not-in-this-build", tree: undefined };
  const files = {
    "https://cdn.example.com/providers/index.json": {
      engine: 1,
      providers: [
        { id: "remote-example", manifest: "providers/remote-example.json" },
        { id: "needs-code", manifest: "providers/needs-code.json" },
        { id: "soon", comingSoon: true, name: "Soon" }
      ]
    },
    "https://cdn.example.com/providers/providers/remote-example.json": remote,
    "https://cdn.example.com/providers/providers/needs-code.json": codeOnly
  };
  const verified: string[] = [];
  const result = await loadProviderIndex("https://cdn.example.com/providers/index.json", { fetch: serve(files), verify: (_body, url) => { verified.push(url); return true; } });

  assert.deepEqual(result.loaded, ["remote-example"]);
  assert.deepEqual(result.skipped.map(s => s.id), ["needs-code"]);
  assert.match(result.skipped[0].reason, /isn't built into this version/);
  assert.ok(getProvider("remote-example") instanceof ManifestProvider);
  assert.equal(getProvider("needs-code"), null);
  assert.deepEqual(verified, ["https://cdn.example.com/providers/index.json", "https://cdn.example.com/providers/providers/remote-example.json", "https://cdn.example.com/providers/providers/needs-code.json"]);
});

test("a signed remote manifest can update a built-in provider's settings", async () => {
  const updated = { ...b1Manifest, auth: { ...b1Manifest.auth, scopes: ["plans", "extra"] } };
  const files = { "https://cdn.example.com/index.json": { engine: 1, providers: [{ id: "b1church", manifest: "b1church.json" }] }, "https://cdn.example.com/b1church.json": updated };
  const result = await loadProviderIndex("https://cdn.example.com/index.json", { fetch: serve(files), verify: () => true });
  assert.deepEqual(result.loaded, ["b1church"]);
  const provider = getProvider("b1church")!;
  assert.ok(provider instanceof B1ChurchProvider, "still the built-in implementation");
  assert.deepEqual(provider.config.scopes, ["plans", "extra"]);
});

test("loadProviderIndex rejects unverified files and non-https indexes", async () => {
  const files = { "https://cdn.example.com/index.json": { engine: 1, providers: [] } };
  await assert.rejects(loadProviderIndex("https://cdn.example.com/index.json", { fetch: serve(files), verify: () => false }), /Verification failed/);
  await assert.rejects(loadProviderIndex("http://cdn.example.com/index.json", { fetch: serve(files), verify: () => true }), /https/);
  await assert.rejects(loadProviderIndex("https://cdn.example.com/index.json", { fetch: serve(files) } as any), /verify function/);
});

test("a remote manifest that fails verification is skipped, not registered", async () => {
  const remote = minimal();
  remote.id = "tampered";
  const files = { "https://cdn.example.com/index.json": { engine: 1, providers: [{ id: "tampered", manifest: "tampered.json" }] }, "https://cdn.example.com/tampered.json": remote };
  const result = await loadProviderIndex("https://cdn.example.com/index.json", { fetch: serve(files), verify: (_b, url) => url.endsWith("index.json") });
  assert.deepEqual(result.loaded, []);
  assert.match(result.skipped[0].reason, /Verification failed/);
  assert.equal(getProvider("tampered"), null);
});
