import { IProvider } from "../interfaces";

const providerRegistry: Map<string, IProvider> = new Map();

export type ProvidersChangedListener = () => void;
const listeners = new Set<ProvidersChangedListener>();
let batchDepth = 0;
let batchDirty = false;

function notifyListeners(): void {
  if (batchDepth > 0) {
    batchDirty = true;
    return;
  }
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (err) {
      console.warn("[content-providers] onProvidersChanged listener error:", err);
    }
  }
}

/** Group multiple register/unregister calls so onProvidersChanged fires once at the end. */
export function batchProviderUpdates<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0 && batchDirty) {
      batchDirty = false;
      notifyListeners();
    }
  }
}

/** Subscribe to changes in the registered provider list (e.g. after syncProviders downloads new configs). Returns an unsubscribe function. */
export function onProvidersChanged(listener: ProvidersChangedListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getProvider(providerId: string): IProvider | null {
  return providerRegistry.get(providerId) || null;
}

export function getAllProviders(): IProvider[] {
  return Array.from(providerRegistry.values());
}

export function registerProvider(provider: IProvider): void {
  providerRegistry.set(provider.id, provider);
  notifyListeners();
}

export function unregisterProvider(providerId: string): boolean {
  const deleted = providerRegistry.delete(providerId);
  if (deleted) notifyListeners();
  return deleted;
}
