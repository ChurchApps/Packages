import type { ManifestProvider } from "../../manifest/ManifestProvider";
import type { NetworkInstance, ContentProviderAuthData } from "../../interfaces";
import { MdnsService, NetworkDiscoverer, NetworkDiscoveryConfig, resolveMdnsServices, networkInstanceToAuth as genericNetworkInstanceToAuth, authToNetworkInstance } from "../../helpers/NetworkDiscoveryHelper";
import freeShowManifest from "../../manifests/providers/freeshow.json";

const discovery = freeShowManifest.networkDiscovery as NetworkDiscoveryConfig;

/** Default FreeShow REST port (read from freeshow.json). */
export const FREESHOW_REST_PORT = discovery.defaultPort;

export type FreeShowDiscoverer = NetworkDiscoverer;
export type { MdnsService };
export { authToNetworkInstance };

/** Turn a discovered LAN instance into a saved network auth record (defaults scope to "freeshow"). */
export function networkInstanceToAuth(instance: NetworkInstance, scope = discovery.scope || "freeshow"): ContentProviderAuthData {
  return genericNetworkInstanceToAuth(instance, scope);
}

/** Resolve FreeShow mDNS records via the generic NetworkDiscoveryHelper and freeshow.json's discovery config. */
export function freeShowServicesToInstances(services: MdnsService[], port = FREESHOW_REST_PORT): Promise<NetworkInstance[]> {
  return resolveMdnsServices(services, discovery, { port, providerName: freeShowManifest.name });
}

/** getProvider("freeshow"): a JSON-manifest provider with network discovery methods. */
export type FreeShowProvider = ManifestProvider & {
  setDiscoverer(discoverer: FreeShowDiscoverer | null): void;
  discoverInstances(): Promise<NetworkInstance[]>;
  resolveDiscoveredServices(services: MdnsService[], port?: number): Promise<NetworkInstance[]>;
  toAuth(instance: NetworkInstance): ContentProviderAuthData;
  selectedInstance(auth?: ContentProviderAuthData | null): NetworkInstance | null;
};
