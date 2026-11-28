import { IProvider } from "../interfaces";
import { registerProvider } from "../providers/registry";
import { ManifestProvider } from "./ManifestProvider";
import { MANIFEST_ENGINE_VERSION, ProviderIndexEntry } from "./types";
import { validateIndex } from "./validate";
import bundledIndex from "../manifests/index.json";
import aplay from "../manifests/providers/aplay.json";
import awana from "../manifests/providers/awana.json";
import b1church from "../manifests/providers/b1church.json";
import bibleproject from "../manifests/providers/bibleproject.json";
import cbn from "../manifests/providers/cbn.json";
import dropbox from "../manifests/providers/dropbox.json";
import freeshow from "../manifests/providers/freeshow.json";
import gocurriculum from "../manifests/providers/gocurriculum.json";
import googledrive from "../manifests/providers/googledrive.json";
import highvoltagekids from "../manifests/providers/highvoltagekids.json";
import jesusfilm from "../manifests/providers/jesusfilm.json";
import lessonschurch from "../manifests/providers/lessonschurch.json";
import lifechurch from "../manifests/providers/lifechurch.json";
import onedrive from "../manifests/providers/onedrive.json";
import planningcenter from "../manifests/providers/planningcenter.json";
import signpresenter from "../manifests/providers/signpresenter.json";

import bibleprojectData from "../manifests/providers/data/bibleproject.json";
import highvoltagekidsData from "../manifests/providers/data/highvoltagekids.json";
import lifechurchData from "../manifests/providers/data/lifechurch.json";

/** Manifests and their datasets shipped inside the package, keyed by their path relative to index.json. */
const BUNDLED: Record<string, unknown> = {
  "providers/aplay.json": aplay,
  "providers/awana.json": awana,
  "providers/b1church.json": b1church,
  "providers/bibleproject.json": bibleproject,
  "providers/cbn.json": cbn,
  "providers/dropbox.json": dropbox,
  "providers/freeshow.json": freeshow,
  "providers/gocurriculum.json": gocurriculum,
  "providers/googledrive.json": googledrive,
  "providers/highvoltagekids.json": highvoltagekids,
  "providers/jesusfilm.json": jesusfilm,
  "providers/lessonschurch.json": lessonschurch,
  "providers/lifechurch.json": lifechurch,
  "providers/onedrive.json": onedrive,
  "providers/planningcenter.json": planningcenter,
  "providers/signpresenter.json": signpresenter,
  "providers/data/bibleproject.json": bibleprojectData,
  "providers/data/highvoltagekids.json": highvoltagekidsData,
  "providers/data/lifechurch.json": lifechurchData
};

/** "providers/x.json" + "data/x.json" → "providers/data/x.json" */
function beside(manifestPath: string, relative: string): string {
  const dir = manifestPath.includes("/") ? manifestPath.slice(0, manifestPath.lastIndexOf("/") + 1) : "";
  return dir + relative;
}

/** Load a manifest's external datasets with `read`, leaving inline datasets untouched. */
async function loadDatasets(manifest: unknown, read: (pathOrUrl: string) => Promise<unknown> | unknown): Promise<Record<string, unknown>> {
  const datasets: Record<string, unknown> = {};
  const declared = (manifest as { datasets?: Record<string, unknown> })?.datasets;
  if (!declared || typeof declared !== "object") return datasets;
  for (const [name, entry] of Object.entries(declared)) {
    if (typeof entry === "string") {
      if (entry.includes("..")) throw new Error(`dataset "${name}" must not contain ".."`);
      datasets[name] = await read(entry);
    } else if (entry && typeof entry === "object") {
      datasets[name] = entry;
    }
  }
  return datasets;
}

let comingSoon: ProviderIndexEntry[] = [];

/** Providers the current index lists as coming soon. */
export function getComingSoonEntries(): ProviderIndexEntry[] {
  return comingSoon;
}

/** Build every provider from the bundled JSON manifests. A broken bundled manifest is a build bug, so this throws. */
export function createBundledProviders(): IProvider[] {
  const index = validateIndex(bundledIndex);
  comingSoon = index.providers.filter(p => p.comingSoon);
  return index.providers.filter(p => p.manifest).map(entry => {
    const manifest = BUNDLED[entry.manifest!];
    if (!manifest) throw new Error(`Bundled provider index lists ${entry.manifest}, which isn't bundled`);
    const datasets: Record<string, unknown> = {};
    for (const [name, ref] of Object.entries((manifest as { datasets?: Record<string, unknown> }).datasets || {})) {
      if (typeof ref === "string") {
        const data = BUNDLED[beside(entry.manifest!, ref)];
        if (data === undefined) throw new Error(`${entry.manifest} needs ${ref}, which isn't bundled`);
        datasets[name] = data;
      } else if (ref && typeof ref === "object") {
        datasets[name] = ref;
      }
    }
    const provider = createProvider(manifest, datasets);
    if (provider.id !== entry.id) throw new Error(`${entry.manifest} has id "${provider.id}" but the index says "${entry.id}"`);
    return provider;
  });
}

/** Build a ManifestProvider from a JSON config object or JSON string. */
export function createProvider(manifest: unknown, datasets: Record<string, unknown> = {}): ManifestProvider {
  const parsed = typeof manifest === "string" ? JSON.parse(manifest) : manifest;
  return new ManifestProvider(parsed, { datasets });
}

/** Validate, build and register a provider directly from a parsed config object or JSON string. */
export function registerProviderFromConfig(manifest: unknown, options: { datasets?: Record<string, unknown> } = {}): ManifestProvider {
  const provider = createProvider(manifest, options.datasets);
  registerProvider(provider);
  return provider;
}

export interface LoadProviderOptions {
  /**
   * Checks that a downloaded config file really came from a trusted source (e.g. an Ed25519 signature check
   * against a public key built into the app). Return false to reject the file.
   * Required unless `allowUnverified: true` is explicitly set.
   */
  verify?: (body: string, url: string) => boolean | Promise<boolean>;
  /** Opt-in escape hatch to download without a `verify` callback (e.g. local dev or trusted private endpoints). */
  allowUnverified?: boolean;
  /** Whether to register the loaded provider in the global registry (default true). */
  register?: boolean;
  fetch?: typeof fetch;
}

export interface LoadProviderIndexOptions {
  /**
   * Checks that a downloaded file (the index, a manifest, or a dataset) really came from you, e.g. an Ed25519 signature check
   * against a public key built into the app. Return false to reject the file. Required: unsigned remote manifests
   * could point sign-in at someone else's server.
   */
  verify: (body: string, url: string) => boolean | Promise<boolean>;
  fetch?: typeof fetch;
}

export interface LoadProviderIndexResult {
  loaded: string[];
  skipped: { id: string; reason: string }[];
}

async function downloadJson(url: string, doFetch: typeof fetch, verify?: (body: string, url: string) => boolean | Promise<boolean>): Promise<unknown> {
  if (!url.startsWith("https://")) throw new Error(`Remote provider config must be served over https: ${url}`);
  const response = await doFetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
  const body = await response.text();
  if (verify && !(await verify(body, url))) throw new Error(`Verification failed for ${url}`);
  return JSON.parse(body);
}

/**
 * Download a single provider config JSON file from an HTTPS URL (along with any referenced datasets),
 * validate it, and register it in the provider registry.
 */
export async function loadProviderFromUrl(manifestUrl: string, options: LoadProviderOptions): Promise<ManifestProvider> {
  if (!manifestUrl.startsWith("https://")) throw new Error("Provider manifest must be served over https");
  if (typeof options?.verify !== "function" && !options?.allowUnverified) {
    throw new Error("loadProviderFromUrl needs a verify function (or allowUnverified: true)");
  }
  const doFetch = options.fetch ?? fetch;
  const manifest = await downloadJson(manifestUrl, doFetch, options.verify);
  const datasets = await loadDatasets(manifest, ref => downloadJson(new URL(ref, manifestUrl).toString(), doFetch, options.verify));
  const provider = createProvider(manifest, datasets);
  if (options.register !== false) registerProvider(provider);
  return provider;
}

/**
 * Load providers from a hosted index.json and register them, replacing bundled providers with the same id.
 * Every provider is pure data — nothing downloaded is ever evaluated as JavaScript.
 */
export async function loadProviderIndex(indexUrl: string, options: LoadProviderIndexOptions): Promise<LoadProviderIndexResult> {
  if (!indexUrl.startsWith("https://")) throw new Error("Provider index must be served over https");
  if (typeof options?.verify !== "function") throw new Error("loadProviderIndex needs a verify function");
  const doFetch = options.fetch ?? fetch;

  const index = validateIndex(await downloadJson(indexUrl, doFetch, options.verify));
  if (index.engine > MANIFEST_ENGINE_VERSION) throw new Error(`Provider index needs engine ${index.engine}; this build supports ${MANIFEST_ENGINE_VERSION}`);

  const result: LoadProviderIndexResult = { loaded: [], skipped: [] };
  for (const entry of index.providers) {
    if (!entry.manifest) continue;
    try {
      const manifestUrl = new URL(entry.manifest, indexUrl).toString();
      const manifest = await downloadJson(manifestUrl, doFetch, options.verify);
      const datasets = await loadDatasets(manifest, ref => downloadJson(new URL(ref, manifestUrl).toString(), doFetch, options.verify));
      const provider = createProvider(manifest, datasets);
      if (provider.id !== entry.id) throw new Error(`manifest id "${provider.id}" doesn't match the index`);
      registerProvider(provider);
      result.loaded.push(entry.id);
    } catch (e) {
      result.skipped.push({ id: entry.id, reason: (e as Error).message });
    }
  }
  comingSoon = index.providers.filter(p => p.comingSoon);
  return result;
}
