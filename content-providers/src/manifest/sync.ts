import { batchProviderUpdates, registerProvider, unregisterProvider } from "../providers/registry";
import { createProvider, loadManifestDatasets, setComingSoonEntries } from "./loader";
import { MANIFEST_ENGINE_VERSION, ProviderIndex, ProviderIndexEntry } from "./types";
import { validateIndex } from "./validate";

export const DEFAULT_CACHE_KEY = "churchapps:content-providers:cache:v1";

/** Default hosted provider index published automatically from ChurchApps/Packages. */
export const DEFAULT_MANIFEST_INDEX_URL = "https://churchapps.github.io/Packages/providers/v1/index.json";

/**
 * Minimal key-value storage interface for persisting downloaded provider configs for offline use.
 * Compatible with browser `localStorage`, React Native `AsyncStorage`, or a custom file/SQLite adapter.
 */
export interface ProviderCacheStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem?(key: string): void | Promise<void>;
}

/** Create an in-memory storage adapter (useful for tests or server-side environments without disk storage). */
export function createMemoryStorage(): ProviderCacheStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value); },
    removeItem: (key) => { map.delete(key); }
  };
}

interface CachedProviderRecord {
  id: string;
  manifestUrl: string;
  version?: string;
  sha256?: string;
  manifest: unknown;
  datasets: Record<string, unknown>;
}

interface ProviderCacheSnapshot {
  schemaVersion: 1;
  indexUrl: string;
  etag?: string;
  syncedAt: number;
  index: ProviderIndex;
  providers: Record<string, CachedProviderRecord>;
}

export interface HydrateCacheOptions {
  /** Storage adapter; defaults to `globalThis.localStorage` in browsers when available. */
  storage?: ProviderCacheStorage;
  /** Storage key override (defaults to DEFAULT_CACHE_KEY). */
  cacheKey?: string;
}

export interface HydrateCacheResult {
  restored: boolean;
  loaded: string[];
  skipped: { id: string; reason: string }[];
  syncedAt?: number;
}

export interface SyncProvidersOptions extends HydrateCacheOptions {
  /** HTTPS URL of the hosted provider index.json (e.g. "https://content.churchapps.org/providers/index.json"). */
  indexUrl: string;
  /**
   * Optional verifier (e.g. Ed25519 signature check) run on every downloaded file before parsing.
   * Return false to reject the file.
   */
  verify?: (body: string, url: string) => boolean | Promise<boolean>;
  /** Network request timeout in milliseconds (default 10000). */
  timeoutMs?: number;
  /** Custom fetch implementation (defaults to global fetch). */
  fetch?: typeof fetch;
}

export interface SyncProvidersResult {
  /** Where the active providers came from: freshly fetched "remote", "cache" (offline or 304), or "bundled" (first-launch offline). */
  source: "remote" | "cache" | "bundled";
  /** True when the remote check could not reach the server (app continues using cached/bundled providers). */
  offline: boolean;
  /** True when the server returned 304 Not Modified or no provider configs changed. */
  notModified: boolean;
  /** Provider IDs active from this sync/cache. */
  loaded: string[];
  /** Provider IDs newly downloaded or updated in this sync (empty on cache hit / 304 / offline). */
  updated: string[];
  /** Provider IDs that failed validation, verification, or download and were skipped. */
  skipped: { id: string; reason: string }[];
  /** Error message if the remote sync failed and fell back to cache/bundled. */
  error?: string;
}

function defaultStorage(): ProviderCacheStorage | null {
  try {
    const ls = (globalThis as { localStorage?: ProviderCacheStorage }).localStorage;
    if (ls && typeof ls.getItem === "function" && typeof ls.setItem === "function") return ls;
  } catch {
    // Accessing localStorage can throw in restricted contexts (e.g. Safari private mode or SSR)
  }
  return null;
}

function resolveStorage(storage?: ProviderCacheStorage): ProviderCacheStorage | null {
  return storage ?? defaultStorage();
}

async function readSnapshot(storage: ProviderCacheStorage | null, cacheKey: string): Promise<ProviderCacheSnapshot | null> {
  if (!storage) return null;
  try {
    const raw = await storage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProviderCacheSnapshot;
    if (!parsed || parsed.schemaVersion !== 1 || !parsed.index || !parsed.providers) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeSnapshot(storage: ProviderCacheStorage | null, cacheKey: string, snapshot: ProviderCacheSnapshot): Promise<void> {
  if (!storage) return;
  try {
    await storage.setItem(cacheKey, JSON.stringify(snapshot));
  } catch (err) {
    console.warn("[content-providers] Failed to persist provider cache:", err instanceof Error ? err.message : err);
  }
}

async function sha256Hex(text: string): Promise<string | null> {
  try {
    if (!globalThis.crypto?.subtle) return null;
    const bytes = new TextEncoder().encode(text);
    const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

async function fetchWithTimeout(doFetch: typeof fetch, url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await doFetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function applySnapshot(snapshot: ProviderCacheSnapshot): { loaded: string[]; skipped: { id: string; reason: string }[] } {
  const loaded: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  batchProviderUpdates(() => {
    for (const entry of snapshot.index.providers) {
      if (!entry.manifest) continue;
      const rec = snapshot.providers[entry.id];
      if (!rec) continue;
      try {
        const provider = createProvider(rec.manifest, rec.datasets);
        if (provider.id !== entry.id) throw new Error(`manifest id "${provider.id}" doesn't match the index`);
        registerProvider(provider);
        loaded.push(entry.id);
      } catch (e) {
        skipped.push({ id: entry.id, reason: (e as Error).message });
      }
    }
    setComingSoonEntries(snapshot.index.providers.filter(p => p.comingSoon));
  });
  return { loaded, skipped };
}

function entryMatchesCache(entry: ProviderIndexEntry, manifestUrl: string, cached?: CachedProviderRecord): boolean {
  if (!cached || cached.manifestUrl !== manifestUrl) return false;
  if (entry.sha256 && cached.sha256) return entry.sha256.toLowerCase() === cached.sha256.toLowerCase();
  if (entry.version && cached.version) return entry.version === cached.version;
  return false;
}

/**
 * Restore the last successfully downloaded provider configs from persistent storage without making any network calls.
 * Call this at startup if you want immediate offline hydration before (or independently of) `syncProviders`.
 */
export async function hydrateCachedProviders(options: HydrateCacheOptions = {}): Promise<HydrateCacheResult> {
  const storage = resolveStorage(options.storage);
  const cacheKey = options.cacheKey ?? DEFAULT_CACHE_KEY;
  const snapshot = await readSnapshot(storage, cacheKey);
  if (!snapshot) return { restored: false, loaded: [], skipped: [] };

  try {
    const index = validateIndex(snapshot.index);
    if (index.engine > MANIFEST_ENGINE_VERSION) return { restored: false, loaded: [], skipped: [] };
    const { loaded, skipped } = applySnapshot({ ...snapshot, index });
    return { restored: loaded.length > 0, loaded, skipped, syncedAt: snapshot.syncedAt };
  } catch {
    return { restored: false, loaded: [], skipped: [] };
  }
}

/** Remove the persisted provider cache snapshot from storage. */
export async function clearProviderCache(options: HydrateCacheOptions = {}): Promise<void> {
  const storage = resolveStorage(options.storage);
  const cacheKey = options.cacheKey ?? DEFAULT_CACHE_KEY;
  if (!storage) return;
  if (typeof storage.removeItem === "function") await storage.removeItem(cacheKey);
  else await storage.setItem(cacheKey, "");
}

/**
 * Check a hosted provider index on app launch, download any new or updated JSON configs (and their datasets),
 * register them live, and persist the snapshot for offline use.
 *
 * Offline behavior:
 * - Restores the last downloaded snapshot from `storage` first so previously synced providers are immediately available.
 * - If the network is unavailable, times out, or returns an error, never throws — the app seamlessly keeps using the
 *   last cached configs (or the built-in bundled configs if never synced before).
 * - Uses ETag (`If-None-Match`) and per-entry `sha256`/`version` so unchanged configs are not re-downloaded.
 */
export async function syncProviders(options: SyncProvidersOptions): Promise<SyncProvidersResult> {
  if (!options?.indexUrl || !options.indexUrl.startsWith("https://")) {
    throw new Error("syncProviders requires an https:// indexUrl");
  }
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10000;
  const storage = resolveStorage(options.storage);
  const cacheKey = options.cacheKey ?? DEFAULT_CACHE_KEY;

  // 1. Hydrate from last saved cache immediately so offline or slow launches still have prior remote providers.
  const cached = await readSnapshot(storage, cacheKey);
  let cachedLoaded: string[] = [];
  if (cached && cached.indexUrl === options.indexUrl) {
    try {
      const validCachedIndex = validateIndex(cached.index);
      if (validCachedIndex.engine <= MANIFEST_ENGINE_VERSION) {
        cachedLoaded = applySnapshot({ ...cached, index: validCachedIndex }).loaded;
      }
    } catch {
      // Ignore corrupt cache and proceed to remote fetch
    }
  }

  const downloadText = async (url: string, extraHeaders: Record<string, string> = {}): Promise<{ status: number; etag?: string; text: string }> => {
    if (!url.startsWith("https://")) throw new Error(`Remote provider config must be served over https: ${url}`);
    const response = await fetchWithTimeout(doFetch, url, { method: "GET", headers: { Accept: "application/json", ...extraHeaders } }, timeoutMs);
    if (response.status === 304) return { status: 304, etag: response.headers?.get("etag") ?? undefined, text: "" };
    if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
    const text = await response.text();
    if (options.verify && !(await options.verify(text, url))) throw new Error(`Verification failed for ${url}`);
    return { status: response.status, etag: response.headers?.get("etag") ?? undefined, text };
  };

  // 2. Check the remote server for an updated index.
  try {
    const indexHeaders: Record<string, string> = {};
    if (cached?.indexUrl === options.indexUrl && cached.etag) indexHeaders["If-None-Match"] = cached.etag;
    const indexRes = await downloadText(options.indexUrl, indexHeaders);

    if (indexRes.status === 304 && cached) {
      return { source: "cache", offline: false, notModified: true, loaded: cachedLoaded, updated: [], skipped: [] };
    }

    const index = validateIndex(JSON.parse(indexRes.text));
    if (index.engine > MANIFEST_ENGINE_VERSION) {
      throw new Error(`Provider index needs engine ${index.engine}; this build supports ${MANIFEST_ENGINE_VERSION}`);
    }

    const nextProviders: Record<string, CachedProviderRecord> = {};
    const loaded: string[] = [];
    const updated: string[] = [];
    const skipped: { id: string; reason: string }[] = [];
    const activeIds = new Set<string>();

    for (const entry of index.providers) {
      if (!entry.manifest) continue;
      const manifestUrl = new URL(entry.manifest, options.indexUrl).toString();
      const prev = cached?.indexUrl === options.indexUrl ? cached.providers[entry.id] : undefined;

      // Reuse cached manifest + datasets when version or sha256 matches
      if (entryMatchesCache(entry, manifestUrl, prev)) {
        try {
          createProvider(prev!.manifest, prev!.datasets);
          nextProviders[entry.id] = prev!;
          activeIds.add(entry.id);
          continue;
        } catch {
          // Fall through and re-download if cached copy is somehow invalid
        }
      }

      try {
        const res = await downloadText(manifestUrl);
        const digest = await sha256Hex(res.text);
        if (entry.sha256 && digest && digest !== entry.sha256.toLowerCase()) {
          throw new Error(`SHA-256 mismatch for ${manifestUrl}`);
        }
        const manifest = JSON.parse(res.text);
        const datasets = await loadManifestDatasets(manifest, async ref => {
          const dsUrl = new URL(ref, manifestUrl).toString();
          const dsRes = await downloadText(dsUrl);
          return JSON.parse(dsRes.text);
        });
        const provider = createProvider(manifest, datasets);
        if (provider.id !== entry.id) throw new Error(`manifest id "${provider.id}" doesn't match the index`);
        nextProviders[entry.id] = { id: entry.id, manifestUrl, version: entry.version, sha256: entry.sha256 ?? digest ?? undefined, manifest, datasets };
        activeIds.add(entry.id);
        updated.push(entry.id);
      } catch (e) {
        // If a single provider fails to download/verify, keep its previously cached copy if one exists
        if (prev) {
          nextProviders[entry.id] = prev;
          activeIds.add(entry.id);
        }
        skipped.push({ id: entry.id, reason: (e as Error).message });
      }
    }

    // 3. Apply all updates atomically so onProvidersChanged fires once.
    const previousRemoteIds = cached?.indexUrl === options.indexUrl ? Object.keys(cached.providers) : [];
    batchProviderUpdates(() => {
      for (const oldId of previousRemoteIds) {
        if (!activeIds.has(oldId)) unregisterProvider(oldId);
      }
      for (const entry of index.providers) {
        if (!entry.manifest) continue;
        const rec = nextProviders[entry.id];
        if (!rec) continue;
        registerProvider(createProvider(rec.manifest, rec.datasets));
        loaded.push(entry.id);
      }
      setComingSoonEntries(index.providers.filter(p => p.comingSoon));
    });

    // 4. Persist snapshot for offline launches.
    await writeSnapshot(storage, cacheKey, {
      schemaVersion: 1,
      indexUrl: options.indexUrl,
      etag: indexRes.etag,
      syncedAt: Date.now(),
      index,
      providers: nextProviders
    });

    return { source: "remote", offline: false, notModified: updated.length === 0, loaded, updated, skipped };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      source: cachedLoaded.length > 0 ? "cache" : "bundled",
      offline: true,
      notModified: true,
      loaded: cachedLoaded,
      updated: [],
      skipped: [],
      error: message
    };
  }
}
