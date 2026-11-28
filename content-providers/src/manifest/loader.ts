import { IProvider } from "../interfaces";
import { registerProvider } from "../providers/registry";
import { ManifestProvider } from "./ManifestProvider";
import { IMPLEMENTATIONS } from "../providers/implementations";
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

/** Manifests shipped inside the package, keyed by their path in index.json. */
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
  "providers/signpresenter.json": signpresenter
};

let comingSoon: ProviderIndexEntry[] = [];

/** Providers the current index lists as coming soon. */
export function getComingSoonEntries(): ProviderIndexEntry[] {
  return comingSoon;
}

/** Build the providers from the bundled index. A broken bundled manifest is a build bug, so this throws. */
export function createBundledProviders(): IProvider[] {
  const index = validateIndex(bundledIndex);
  comingSoon = index.providers.filter(p => p.comingSoon);
  return index.providers.filter(p => p.manifest).map(entry => {
    const manifest = BUNDLED[entry.manifest!];
    if (!manifest) throw new Error(`Bundled provider index lists ${entry.manifest}, which isn't bundled`);
    const provider = createProvider(manifest);
    if (provider.id !== entry.id) throw new Error(`${entry.manifest} has id "${provider.id}" but the index says "${entry.id}"`);
    return provider;
  });
}

/** Build a provider from a manifest: the named built-in implementation, or the generic engine for a tree manifest. */
export function createProvider(manifest: unknown): IProvider {
  const name = (manifest as { implementation?: unknown })?.implementation;
  if (name === undefined) return new ManifestProvider(manifest);
  const create = typeof name === "string" && Object.prototype.hasOwnProperty.call(IMPLEMENTATIONS, name) ? IMPLEMENTATIONS[name] : undefined;
  if (!create) throw new Error(`implementation "${String(name)}" isn't built into this version`);
  return create(manifest);
}

export interface LoadProviderIndexOptions {
  /**
   * Checks that a downloaded file (the index or a manifest) really came from you, e.g. an Ed25519 signature check
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

/**
 * Load providers from a hosted index.json and register them, replacing bundled providers with the same id.
 * Manifests stay data: a manifest can only name implementations already built into this version, so nothing
 * downloaded is ever run as code.
 */
export async function loadProviderIndex(indexUrl: string, options: LoadProviderIndexOptions): Promise<LoadProviderIndexResult> {
  if (!indexUrl.startsWith("https://")) throw new Error("Provider index must be served over https");
  if (typeof options?.verify !== "function") throw new Error("loadProviderIndex needs a verify function");
  const doFetch = options.fetch ?? fetch;

  const download = async (url: string): Promise<unknown> => {
    const response = await doFetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
    const body = await response.text();
    if (!(await options.verify(body, url))) throw new Error(`Verification failed for ${url}`);
    return JSON.parse(body);
  };

  const index = validateIndex(await download(indexUrl));
  if (index.engine > MANIFEST_ENGINE_VERSION) throw new Error(`Provider index needs engine ${index.engine}; this build supports ${MANIFEST_ENGINE_VERSION}`);

  const result: LoadProviderIndexResult = { loaded: [], skipped: [] };
  for (const entry of index.providers) {
    if (!entry.manifest) continue;
    try {
      const manifestUrl = new URL(entry.manifest, indexUrl).toString();
      const provider = createProvider(await download(manifestUrl));
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
