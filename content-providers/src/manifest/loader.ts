import { IProvider } from "../interfaces";
import { getProvider, registerProvider } from "../providers/registry";
import { ManifestProvider } from "./ManifestProvider";
import { MANIFEST_ENGINE_VERSION, ProviderIndexEntry } from "./types";
import { validateIndex } from "./validate";
import bundledIndex from "../manifests/index.json";
import awana from "../manifests/providers/awana.json";
import cbn from "../manifests/providers/cbn.json";
import signpresenter from "../manifests/providers/signpresenter.json";

/** Manifests shipped inside the package, keyed by their path in index.json. */
const BUNDLED: Record<string, unknown> = {
  "providers/awana.json": awana,
  "providers/cbn.json": cbn,
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
    const provider = new ManifestProvider(manifest);
    if (provider.id !== entry.id) throw new Error(`${entry.manifest} has id "${provider.id}" but the index says "${entry.id}"`);
    return provider;
  });
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
 * Load providers from a hosted index.json and register them, replacing bundled manifest providers with the same id.
 * Never replaces a built-in code provider. Manifests stay data: nothing downloaded is ever run as code.
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
    const existing = getProvider(entry.id);
    if (existing && !(existing instanceof ManifestProvider)) {
      result.skipped.push({ id: entry.id, reason: "a built-in provider already uses this id" });
      continue;
    }
    try {
      const manifestUrl = new URL(entry.manifest, indexUrl).toString();
      const provider = new ManifestProvider(await download(manifestUrl));
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
