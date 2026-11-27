import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { ManifestProvider } from "../src/manifest/ManifestProvider";
import awanaManifest from "../src/manifests/providers/awana.json";
import { setProviderSecret } from "../src/helpers/ProviderSecrets";
import { ContentProviderAuthData } from "../src/interfaces";

// Awana is defined by its JSON manifest; methods like setEnvironment are attached from the manifest at runtime.
const AwanaProvider = class extends ManifestProvider {
  constructor() { super(awanaManifest); }
} as unknown as new () => any;

const auth: ContentProviderAuthData = { access_token: "at", refresh_token: "rt", token_type: "Bearer", created_at: 0, expires_in: 60, scope: "" };
const DEV = "https://awanabritedev.wpengine.com/wp-json/content/v1";

// Shapes match the live dev API (2026-11-18), trimmed.
const library = {
  courses: [
    {
      id: 7,
      name: "Elementary",
      image: "https://x/elem.png",
      is_free: false,
      units: [
        { id: 46, name: "Patriarchs", image: "https://x/patriarchs.jpg", is_free: false, is_sample: false, has_files: true, lessons: [{ id: 389, name: "Abraham and Lot", description: "Genesis 13", is_sample: false, chapters: [] }] },
        { id: 47, name: "Exodus", is_free: false, is_sample: false, has_files: false, lessons: [{ id: 400, name: "Moses", chapters: [] }] }
      ]
    }
  ]
};

const lesson = {
  id: 389,
  name: "Abraham and Lot",
  description: "Genesis 13",
  is_sample: false,
  files: [
    { id: 1, name: "Intro Video", group: "Audio & Video", type: "video", mime: "video/mp4", size: 36749649, url: "https://x/intro.mp4" },
    { id: 2, name: "Books Of The Bible Song", group: "Audio & Video", type: "audio", mime: "audio/mpeg", size: 2969776, url: "https://x/song.mp3" },
    { id: 3, name: "Image 1", group: "Images", type: "image", mime: "image/png", size: 322392, url: "https://x/img1.png" },
    { id: 4, name: "Powerpoint", group: "Chapters", type: "document", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", size: 0, url: "https://x/l.pptx" },
    { id: 5, name: "Full Lesson Download", group: "Lesson", type: "document", mime: "application/zip", size: 0, url: "https://x/full.zip" }
  ]
};

const unit = { id: 46, name: "Patriarchs", is_free: false, is_sample: false, files: [{ id: 9, name: "Find It Video", group: "Unit", type: "video", mime: "video/mp4", size: 40792691, url: "https://x/findit.mp4" }] };

type Call = { url: string; init?: RequestInit };
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; setProviderSecret("awana", ""); });

function mockApi(routes: Record<string, { status?: number; body: unknown }>): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const route = routes[url];
    if (!route) return new Response(JSON.stringify({ code: "api/not_found" }), { status: 404 });
    return new Response(JSON.stringify(route.body), { status: route.status ?? 200 });
  }) as typeof fetch;
  return calls;
}

const devRoutes = { [`${DEV}/library`]: { body: library }, [`${DEV}/lessons/389`]: { body: lesson }, [`${DEV}/units/46`]: { body: unit } };

test("browse walks courses → units → lessons, with a Unit Files leaf only when the unit has files", async () => {
  const calls = mockApi(devRoutes);
  const p = new AwanaProvider();

  const courses = await p.browse("/", auth);
  assert.deepEqual(courses.map(c => [c.id, c.title, (c as any).path]), [["7", "Elementary", "/7"]]);

  const units = await p.browse("/7", auth);
  assert.deepEqual(units.map(u => (u as any).path), ["/7/46", "/7/47"]);
  assert.equal((units[1] as any).thumbnail, "https://x/elem.png", "falls back to the course image");

  const lessons = await p.browse("/7/46", auth);
  assert.deepEqual(lessons.map(l => [(l as any).path, (l as any).isLeaf]), [["/7/46/unit", true], ["/7/46/389", true]]);
  assert.deepEqual((await p.browse("/7/47", auth)).map(l => l.id), ["400"]);

  // library is fetched once and reused for the whole walk
  assert.equal(calls.filter(c => c.url.endsWith("/library")).length, 1);
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, "Bearer at");
});

test("lesson files: media is the playlist, documents are downloads", async () => {
  mockApi(devRoutes);
  const p = new AwanaProvider();

  const playlist = await p.getPlaylist("/7/46/389", auth);
  assert.deepEqual(playlist?.map(f => [f.id, f.mediaType, f.url]), [["1", "video", "https://x/intro.mp4"], ["2", "audio", "https://x/song.mp3"], ["3", "image", "https://x/img1.png"]]);
  assert.equal(playlist?.[0].thumbnail, "https://x/patriarchs.jpg");
  assert.deepEqual(await p.browse("/7/46/389", auth), playlist);

  const instructions = await p.getInstructions("/7/46/389", auth);
  assert.equal(instructions?.name, "Abraham and Lot");
  assert.equal(instructions?.items.length, 3);
  assert.deepEqual(instructions?.downloads?.map(d => [d.title, d.url, d.bytes]), [["Powerpoint", "https://x/l.pptx", undefined], ["Full Lesson Download", "https://x/full.zip", undefined]]);
});

test("unit files load from /units/{id}", async () => {
  const calls = mockApi(devRoutes);
  const playlist = await new AwanaProvider().getPlaylist("/7/46/unit", auth);
  assert.deepEqual(playlist?.map(f => f.title), ["Find It Video"]);
  assert.ok(calls.some(c => c.url === `${DEV}/units/46`));
});

test("paths outside the library, or that Awana refuses, return nothing", async () => {
  const calls = mockApi({ ...devRoutes, [`${DEV}/lessons/400`]: { status: 403, body: { code: "api/forbidden" } } });
  const p = new AwanaProvider();
  assert.equal(await p.getPlaylist("/7/46/999", auth), null, "lesson not in this unit");
  assert.equal(await p.getPlaylist("/7/47/unit", auth), null, "unit without files");
  assert.equal(await p.getPlaylist("/7/47/400", auth), null, "403 from Awana");
  assert.deepEqual(await p.browse("/8", auth), []);
  assert.ok(!calls.some(c => c.url.endsWith("/lessons/999")), "never asks Awana for a lesson outside the library");
});

test("no auth means no network calls", async () => {
  const calls = mockApi(devRoutes);
  const p = new AwanaProvider();
  assert.deepEqual(await p.browse("/", null), []);
  assert.equal(await p.getPlaylist("/7/46/389", null), null);
  assert.equal(await p.getInstructions("/7/46/389", undefined), null);
  assert.equal(calls.length, 0);
});

test("cache is per access token", async () => {
  const calls = mockApi(devRoutes);
  const p = new AwanaProvider();
  await p.browse("/", auth);
  await p.browse("/", { ...auth, access_token: "other" });
  assert.equal(calls.filter(c => c.url.endsWith("/library")).length, 2);
});

test("device flow posts a form body with the runtime client secret", async () => {
  setProviderSecret("awana", "test-secret");
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.endsWith("/auth/device")) return new Response(JSON.stringify({ device_code: "dc", user_code: "ABCD-EFGH", verification_uri: "https://sso/device", expires_in: 600, interval: 5 }));
    return new Response(JSON.stringify({ access_token: "new", refresh_token: "r", expires_in: 60, token_type: "Bearer", scope: "openid" }));
  }) as typeof fetch;

  const p = new AwanaProvider();
  const device = await p.initiateDeviceFlow();
  assert.equal(device?.user_code, "ABCD-EFGH");
  assert.equal(calls[0].url, "https://sso.awana.org/auth/realms/awana/protocol/openid-connect/auth/device");
  assert.equal((calls[0].init?.headers as Record<string, string>)["Content-Type"], "application/x-www-form-urlencoded");
  const initBody = new URLSearchParams(calls[0].init?.body as string);
  assert.equal(initBody.get("client_id"), "churchapps");
  assert.equal(initBody.get("client_secret"), "test-secret");
  assert.equal(initBody.get("scope"), "openid profile email");

  const token = await p.pollDeviceFlowToken("dc");
  assert.equal((token as ContentProviderAuthData).access_token, "new");
  const pollBody = new URLSearchParams(calls[1].init?.body as string);
  assert.equal(pollBody.get("grant_type"), "urn:ietf:params:oauth:grant-type:device_code");
  assert.equal(pollBody.get("device_code"), "dc");
  assert.equal(p.config.clientSecret, "test-secret");
});

test("device flow polling maps Keycloak errors", async () => {
  const p = new AwanaProvider();
  for (const [error, expected] of [["authorization_pending", { error: "authorization_pending" }], ["slow_down", { error: "slow_down", shouldSlowDown: true }], ["expired_token", null], ["access_denied", null]] as const) {
    globalThis.fetch = (async () => new Response(JSON.stringify({ error }), { status: 400 })) as typeof fetch;
    assert.deepEqual(await p.pollDeviceFlowToken("dc"), expected, error);
  }
});

test("setEnvironment switches site and Keycloak host", () => {
  const p = new AwanaProvider();
  assert.equal(p.getEnvironment(), "dev");
  p.setEnvironment("staging");
  assert.equal(p.config.apiBase, "https://awanabritestg.wpengine.com/wp-json/content/v1");
  assert.equal(p.config.oauthBase, "https://sso.awana.org/auth/realms/awana/protocol/openid-connect");
  p.setEnvironment("prod");
  assert.equal(p.config.apiBase, "https://britecurriculum.com/wp-json/content/v1");
  assert.equal(p.config.oauthBase, "https://login.awana.org/auth/realms/awana/protocol/openid-connect");
});
