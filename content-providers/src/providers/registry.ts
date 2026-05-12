import { IProvider } from "../interfaces";

export const providerRegistry: Map<string, IProvider> = new Map();

export function getProvider(providerId: string): IProvider | null {
  return providerRegistry.get(providerId) || null;
}

export function getAllProviders(): IProvider[] {
  return Array.from(providerRegistry.values());
}

export function registerProvider(provider: IProvider): void {
  providerRegistry.set(provider.id, provider);
}
