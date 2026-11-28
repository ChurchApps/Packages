import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  syncProviders,
  hydrateCachedProviders,
  clearProviderCache,
  createMemoryStorage,
  onProvidersChanged,
  getProvider,
  getAvailableProviders,
  unregisterProvider
} from "../src/index";

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

const makeManifest = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  engine: 1,
  id,
  name,
  logos: { light: "https://cdn.example.com/logo.png", dark: "https://cdn.example.com/logo.png" },
  hosts: ["cdn.example.com"],
  requiresAuth: false,
  capabilities: { browse: true, playlist: true, instructions: false, mediaLicensing: false },
  apiBase: "https://cdn.example.com",
  routes: [
    { path: "/", browse: `[folder('root', '${name}', '/root')]` }
  ],
  ...extra
});

afterEach(() => {
  unregisterProvider("sync-alpha");
  unregisterProvider("sync-beta");
  unregisterProvider("sync-catalog");
});

test("syncProviders downloads new remote providers on launch, notifies listeners, and works offline on next launch", async () => {
  const storage = createMemoryStorage();
  const alpha = makeManifest("sync-alpha", "Sync Alpha");
  const catalogProvider = makeManifest("sync-catalog", "Sync Catalog", {
    datasets: { items: "data/sync-catalog.json" },
    routes: [
      { path: "/", browse: "map(datasets.items, x => folder(x.id, x.title, '/' + x.id, undefined, true))" },
      { path: "/:id", playlist: "with(find(datasets.items, x => x.id == params.id), it => it ? [file(it.id, it.title, it.url)] : null)" }
    ]
  });
  const catalogData = [{ id: "v1", title: "Offline Video", url: "https://cdn.example.com/v1.mp4" }];

  const files: Record<string, string> = {
    "https://cdn.example.com/providers/index.json": JSON.stringify({
      engine: 1,
      providers: [
        { id: "sync-alpha", manifest: "providers/sync-alpha.json", version: "1.0.0" },
        { id: "sync-catalog", manifest: "providers/sync-catalog.json", version: "1.0.0" }
      ]
    }),
    "https://cdn.example.com/providers/providers/sync-alpha.json": JSON.stringify(alpha),
    "https://cdn.example.com/providers/providers/sync-catalog.json": JSON.stringify(catalogProvider),
    "https://cdn.example.com/providers/providers/data/sync-catalog.json": JSON.stringify(catalogData)
  };

  let notifications = 0;
  const unsub = onProvidersChanged(() => { notifications++; });
  try {
    const onlineFetch = (async (url: string) => {
      const body = files[String(url)];
      return body ? new Response(body, { headers: { etag: '"v1"' } }) : new Response("", { status: 404 });
    }) as typeof fetch;

    const first = await syncProviders({
      indexUrl: "https://cdn.example.com/providers/index.json",
      storage,
      fetch: onlineFetch
    });

    assert.equal(first.source, "remote");
    assert.equal(first.offline, false);
    assert.equal(first.notModified, false);
    assert.deepEqual(first.loaded, ["sync-alpha", "sync-catalog"]);
    assert.deepEqual(first.updated, ["sync-alpha", "sync-catalog"]);
    assert.equal(notifications, 1, "batched into a single change notification");
    assert.ok(getAvailableProviders().some(p => p.id === "sync-alpha"));
    assert.equal((await getProvider("sync-catalog")!.getPlaylist!("/v1"))?.[0].title, "Offline Video");

    // Simulate a cold app launch while completely offline: remove from in-memory registry first
    unregisterProvider("sync-alpha");
    unregisterProvider("sync-catalog");
    assert.equal(getProvider("sync-alpha"), null);
    assert.equal(getProvider("sync-catalog"), null);

    const offlineFetch = (async () => { throw new Error("network down"); }) as unknown as typeof fetch;
    const offlineRes = await syncProviders({
      indexUrl: "https://cdn.example.com/providers/index.json",
      storage,
      fetch: offlineFetch
    });

    assert.equal(offlineRes.source, "cache");
    assert.equal(offlineRes.offline, true);
    assert.match(offlineRes.error || "", /network down/);
    assert.deepEqual(offlineRes.loaded, ["sync-alpha", "sync-catalog"]);
    assert.ok(getProvider("sync-alpha"), "previously downloaded provider works offline");
    assert.equal((await getProvider("sync-catalog")!.getPlaylist!("/v1"))?.[0].title, "Offline Video", "cached dataset also works offline");
  } finally {
    unsub();
  }
});

test("first launch while offline falls back cleanly to bundled providers without throwing", async () => {
  const storage = createMemoryStorage();
  const offlineFetch = (async () => { throw new Error("ENOTFOUND"); }) as unknown as typeof fetch;

  const res = await syncProviders({
    indexUrl: "https://cdn.example.com/providers/index.json",
    storage,
    fetch: offlineFetch
  });

  assert.equal(res.source, "bundled");
  assert.equal(res.offline, true);
  assert.deepEqual(res.loaded, []);
  assert.ok(getProvider("lessonschurch"), "bundled providers remain available");
});

test("ETag 304 Not Modified skips re-downloading manifests", async () => {
  const storage = createMemoryStorage();
  const alphaJson = JSON.stringify(makeManifest("sync-alpha", "Sync Alpha"));
  const indexJson = JSON.stringify({
    engine: 1,
    providers: [{ id: "sync-alpha", manifest: "providers/sync-alpha.json" }]
  });

  const requests: { url: string; ifNoneMatch: string | null }[] = [];
  const mockFetch = (async (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const ifNoneMatch = headers.get("if-none-match");
    requests.push({ url: String(url), ifNoneMatch });
    if (String(url).endsWith("index.json")) {
      if (ifNoneMatch === '"etag-1"') return new Response(null, { status: 304 });
      return new Response(indexJson, { headers: { etag: '"etag-1"' } });
    }
    return new Response(alphaJson);
  }) as typeof fetch;

  const first = await syncProviders({ indexUrl: "https://cdn.example.com/providers/index.json", storage, fetch: mockFetch });
  assert.equal(first.source, "remote");
  assert.equal(requests.length, 2);

  requests.length = 0;
  const second = await syncProviders({ indexUrl: "https://cdn.example.com/providers/index.json", storage, fetch: mockFetch });
  assert.equal(second.source, "cache");
  assert.equal(second.offline, false);
  assert.equal(second.notModified, true);
  assert.deepEqual(second.updated, []);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].ifNoneMatch, '"etag-1"');
});

test("incremental sync uses sha256 to download only newly published or changed providers", async () => {
  const storage = createMemoryStorage();
  const alphaJson = JSON.stringify(makeManifest("sync-alpha", "Sync Alpha"));
  const betaJson = JSON.stringify(makeManifest("sync-beta", "Sync Beta"));
  const alphaHash = sha256(alphaJson);
  const betaHash = sha256(betaJson);

  let phase = 1;
  const fetchedUrls: string[] = [];
  const mockFetch = (async (url: string) => {
    fetchedUrls.push(String(url));
    if (String(url).endsWith("index.json")) {
      const providers = phase === 1
        ? [{ id: "sync-alpha", manifest: "providers/sync-alpha.json", sha256: alphaHash }]
        : [
          { id: "sync-alpha", manifest: "providers/sync-alpha.json", sha256: alphaHash },
          { id: "sync-beta", manifest: "providers/sync-beta.json", sha256: betaHash }
        ];
      return new Response(JSON.stringify({ engine: 1, providers }));
    }
    if (String(url).endsWith("sync-alpha.json")) return new Response(alphaJson);
    if (String(url).endsWith("sync-beta.json")) return new Response(betaJson);
    return new Response("", { status: 404 });
  }) as typeof fetch;

  await syncProviders({ indexUrl: "https://cdn.example.com/providers/index.json", storage, fetch: mockFetch });
  assert.ok(getProvider("sync-alpha"));
  assert.equal(getProvider("sync-beta"), null);

  // Publish sync-beta on the server; sync-alpha is unchanged
  phase = 2;
  fetchedUrls.length = 0;
  const res = await syncProviders({ indexUrl: "https://cdn.example.com/providers/index.json", storage, fetch: mockFetch });
  assert.deepEqual(res.loaded, ["sync-alpha", "sync-beta"]);
  assert.deepEqual(res.updated, ["sync-beta"]);
  assert.ok(!fetchedUrls.some(u => u.endsWith("sync-alpha.json")), "unchanged provider is served from cache, not re-downloaded");
  assert.ok(fetchedUrls.some(u => u.endsWith("sync-beta.json")), "newly published provider is downloaded");
  assert.ok(getProvider("sync-beta"));
});

test("SHA-256 mismatch rejects corrupted manifest and preserves prior cached copy", async () => {
  const storage = createMemoryStorage();
  const alphaV1 = JSON.stringify(makeManifest("sync-alpha", "Alpha V1"));
  const alphaBad = JSON.stringify(makeManifest("sync-alpha", "Tampered"));

  let phase = 1;
  const mockFetch = (async (url: string) => {
    if (String(url).endsWith("index.json")) {
      return new Response(JSON.stringify({
        engine: 1,
        providers: [{ id: "sync-alpha", manifest: "providers/sync-alpha.json", sha256: phase === 1 ? sha256(alphaV1) : "0".repeat(64) }]
      }));
    }
    return new Response(phase === 1 ? alphaV1 : alphaBad);
  }) as typeof fetch;

  await syncProviders({ indexUrl: "https://cdn.example.com/providers/index.json", storage, fetch: mockFetch });
  assert.equal(getProvider("sync-alpha")?.name, "Alpha V1");

  phase = 2;
  const res = await syncProviders({ indexUrl: "https://cdn.example.com/providers/index.json", storage, fetch: mockFetch });
  assert.match(res.skipped[0]?.reason || "", /SHA-256 mismatch/);
  assert.equal(getProvider("sync-alpha")?.name, "Alpha V1", "keeps last known good version");
});

test("hydrateCachedProviders restores offline snapshot independently and clearProviderCache wipes it", async () => {
  const storage = createMemoryStorage();
  const alphaJson = JSON.stringify(makeManifest("sync-alpha", "Cached Alpha"));
  const mockFetch = (async (url: string) => {
    if (String(url).endsWith("index.json")) {
      return new Response(JSON.stringify({ engine: 1, providers: [{ id: "sync-alpha", manifest: "providers/sync-alpha.json" }] }));
    }
    return new Response(alphaJson);
  }) as typeof fetch;

  await syncProviders({ indexUrl: "https://cdn.example.com/providers/index.json", storage, fetch: mockFetch });
  unregisterProvider("sync-alpha");
  assert.equal(getProvider("sync-alpha"), null);

  const hydrated = await hydrateCachedProviders({ storage });
  assert.equal(hydrated.restored, true);
  assert.deepEqual(hydrated.loaded, ["sync-alpha"]);
  assert.equal(getProvider("sync-alpha")?.name, "Cached Alpha");

  await clearProviderCache({ storage });
  unregisterProvider("sync-alpha");
  const afterClear = await hydrateCachedProviders({ storage });
  assert.equal(afterClear.restored, false);
  assert.equal(getProvider("sync-alpha"), null);
});

test("removing a remote provider from the index unregisters it on next sync", async () => {
  const storage = createMemoryStorage();
  const alphaJson = JSON.stringify(makeManifest("sync-alpha", "Sync Alpha"));

  let phase = 1;
  const mockFetch = (async (url: string) => {
    if (String(url).endsWith("index.json")) {
      return new Response(JSON.stringify({
        engine: 1,
        providers: phase === 1 ? [{ id: "sync-alpha", manifest: "providers/sync-alpha.json" }] : []
      }));
    }
    return new Response(alphaJson);
  }) as typeof fetch;

  await syncProviders({ indexUrl: "https://cdn.example.com/providers/index.json", storage, fetch: mockFetch });
  assert.ok(getProvider("sync-alpha"));

  phase = 2;
  await syncProviders({ indexUrl: "https://cdn.example.com/providers/index.json", storage, fetch: mockFetch });
  assert.equal(getProvider("sync-alpha"), null);
});
