import { ProviderInfo } from "../interfaces";
import { registerProvider, getProvider, getAllProviders } from "./registry";
import { createBundledProviders, getComingSoonEntries } from "../manifest/loader";

export { getProvider, getAllProviders, registerProvider, unregisterProvider } from "./registry";

// Every provider comes from a JSON manifest listed in src/manifests/index.json. Hosts can add or update providers at
// runtime with loadProviderIndex.
function initializeProviders() {
  for (const provider of createBundledProviders()) registerProvider(provider);
}

initializeProviders();

/**
 * Get provider configuration by ID (for backward compatibility).
 */
export function getProviderConfig(providerId: string) {
  const provider = getProvider(providerId);
  return provider?.config || null;
}

/** Get available providers (implemented and coming soon), optionally filtered by IDs. */
export function getAvailableProviders(ids?: string[]): ProviderInfo[] {
  // Implemented providers
  const implemented: ProviderInfo[] = getAllProviders().map((provider) => ({
    id: provider.id,
    name: provider.name,
    logos: provider.logos,
    implemented: true,
    requiresAuth: provider.requiresAuth,
    authTypes: provider.authTypes,
    capabilities: provider.capabilities
  }));

  // Coming soon providers
  const comingSoon: ProviderInfo[] = getComingSoonEntries().map((p) => ({
    id: p.id,
    name: p.name || p.id,
    logos: p.logos || { light: "", dark: "" },
    implemented: false,
    requiresAuth: false,
    authTypes: [],
    capabilities: { browse: false, playlist: false, instructions: false, mediaLicensing: false }
  }));

  const all = [...implemented, ...comingSoon];

  // Filter by IDs if provided
  if (ids && ids.length > 0) {
    const idSet = new Set(ids);
    return all.filter((provider) => idSet.has(provider.id));
  }

  return all;
}
