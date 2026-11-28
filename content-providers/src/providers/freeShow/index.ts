import type { ManifestProvider } from "../../manifest/ManifestProvider";
import type { NetworkInstance, ContentProviderAuthData } from "../../interfaces";
import type { FreeShowDiscoverer } from "./FreeShowInterfaces";

export { FREESHOW_REST_PORT, servicesToInstances as freeShowServicesToInstances, type MdnsService } from "./FreeShowApi";
export {
  authToNetworkInstance,
  networkInstanceToAuth
} from "./FreeShowConverters";
export { type FreeShowDiscoverer } from "./FreeShowInterfaces";

/** getProvider("freeshow"): a JSON-manifest provider with these methods from its manifest. */
export type FreeShowProvider = ManifestProvider & {
  setDiscoverer(discoverer: FreeShowDiscoverer | null): void;
  discoverInstances(): Promise<NetworkInstance[]>;
  toAuth(instance: NetworkInstance): Promise<ContentProviderAuthData>;
  selectedInstance(auth?: ContentProviderAuthData | null): Promise<NetworkInstance | null>;
};
