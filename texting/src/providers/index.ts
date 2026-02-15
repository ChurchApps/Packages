import { ITextingProvider, ProviderInfo } from "../interfaces.js";
import { TextInChurchProvider } from "./textInChurch/index.js";
import { ClearstreamProvider } from "./clearstream/index.js";

const providers = new Map<string, ITextingProvider>();

// Register built-in providers
providers.set("textinchurch", new TextInChurchProvider());
providers.set("clearstream", new ClearstreamProvider());

const providerMeta: Record<string, Omit<ProviderInfo, "id">> = {
  clearstream: {
    name: "Clearstream",
    requiresSecret: false,
    settingsUrl: "https://app.clearstream.io/settings/api/keys",
    helpText: "Create an API Key in your Clearstream Account Settings under API Keys."
  },
  textinchurch: {
    name: "Text In Church",
    requiresSecret: false,
    settingsUrl: "https://textinchurch.com/support",
    helpText: "Visit Text In Church Support to request developer API access. Once approved, create an API Key in your Account Settings > Developer API section."
  }
};

export function getProvider(providerName: string): ITextingProvider {
  const provider = providers.get(providerName.toLowerCase());
  if (!provider) {
    throw new Error(`Unsupported texting provider: ${providerName}. Available: ${getSupportedProviders().join(", ")}`);
  }
  return provider;
}

export function getSupportedProviders(): string[] {
  return Array.from(providers.keys());
}

export function registerProvider(name: string, provider: ITextingProvider): void {
  providers.set(name.toLowerCase(), provider);
}

export function isProviderAvailable(providerName: string): boolean {
  return providers.has(providerName.toLowerCase());
}

export function getProviderInfo(): ProviderInfo[] {
  return Array.from(providers.keys()).map((id) => ({
    id,
    ...(providerMeta[id] || { name: providers.get(id)!.name, requiresSecret: false, settingsUrl: "", helpText: "" })
  }));
}

export { TextInChurchProvider } from "./textInChurch/index.js";
export { ClearstreamProvider } from "./clearstream/index.js";
