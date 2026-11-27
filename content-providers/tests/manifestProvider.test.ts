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

test("bundled index and manifests validate", () => {
  validateIndex(bundledIndex);
  validateManifest(cbnManifest);
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

// --- remote index ---

function serve(files: Record<string, unknown>) {
  return (async (url: string) => {
    const body = files[String(url)];
    return body === undefined ? new Response("", { status: 404 }) : new Response(typeof body === "string" ? body : JSON.stringify(body));
  }) as typeof fetch;
}

test("loadProviderIndex registers verified remote manifests and refuses to replace built-in providers", async () => {
  const remote = minimal();
  remote.id = "remote-example";
  const files = {
    "https://cdn.example.com/providers/index.json": {
      engine: 1,
      providers: [
        { id: "remote-example", manifest: "providers/remote-example.json" },
        { id: "b1church", manifest: "providers/b1church.json" },
        { id: "soon", comingSoon: true, name: "Soon" }
      ]
    },
    "https://cdn.example.com/providers/providers/remote-example.json": remote
  };
  const verified: string[] = [];
  const result = await loadProviderIndex("https://cdn.example.com/providers/index.json", { fetch: serve(files), verify: (_body, url) => { verified.push(url); return true; } });

  assert.deepEqual(result.loaded, ["remote-example"]);
  assert.deepEqual(result.skipped.map(s => s.id), ["b1church"]);
  assert.ok(getProvider("remote-example") instanceof ManifestProvider);
  assert.ok(!(getProvider("b1church") instanceof ManifestProvider), "built-in provider untouched");
  assert.deepEqual(verified, ["https://cdn.example.com/providers/index.json", "https://cdn.example.com/providers/providers/remote-example.json"]);
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
