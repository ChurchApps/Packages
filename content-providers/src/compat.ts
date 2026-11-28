import type { ManifestProvider } from "./manifest/ManifestProvider";
import type { ContentProviderAuthData, CurrentPlan, NetworkInstance } from "./interfaces";
import {
  MdnsService,
  NetworkDiscoverer,
  NetworkDiscoveryConfig,
  resolveMdnsServices,
  networkInstanceToAuth as genericNetworkInstanceToAuth,
  authToNetworkInstance
} from "./helpers/NetworkDiscoveryHelper";
import { getProvider } from "./providers/registry";

const FALLBACK_FREESHOW_DISCOVERY: NetworkDiscoveryConfig = {
  serviceType: "_freeshow._udp",
  defaultPort: 5506,
  groupBy: "lastDashSegment",
  nameTemplate: "FreeShow ({ip})",
  scope: "freeshow",
  probe: { method: "POST", path: "/", body: { action: "get_projects" }, expect: { action: "get_projects" }, timeoutMs: 2000 }
};

function getFreeShowDiscovery(): { config: NetworkDiscoveryConfig; name: string } {
  const provider = getProvider("freeshow") as ManifestProvider | null;
  return {
    config: provider?.manifest?.networkDiscovery ?? FALLBACK_FREESHOW_DISCOVERY,
    name: provider?.name ?? "FreeShow"
  };
}

/** Default FreeShow REST port. */
export const FREESHOW_REST_PORT = 5506;

export type FreeShowDiscoverer = NetworkDiscoverer;
export { authToNetworkInstance };

/** Turn a discovered LAN instance into a saved network auth record (defaults scope to "freeshow"). */
export function networkInstanceToAuth(instance: NetworkInstance, scope = "freeshow"): ContentProviderAuthData {
  return genericNetworkInstanceToAuth(instance, scope);
}

/** Resolve FreeShow mDNS records via the generic NetworkDiscoveryHelper and the active FreeShow manifest config. */
export function freeShowServicesToInstances(services: MdnsService[], port = FREESHOW_REST_PORT): Promise<NetworkInstance[]> {
  const { config, name } = getFreeShowDiscovery();
  return resolveMdnsServices(services, config, { port, providerName: name });
}

export type FreeShowProvider = ManifestProvider & {
  setDiscoverer(discoverer: FreeShowDiscoverer | null): void;
  discoverInstances(): Promise<NetworkInstance[]>;
  resolveDiscoveredServices(services: MdnsService[], port?: number): Promise<NetworkInstance[]>;
  toAuth(instance: NetworkInstance): ContentProviderAuthData;
  selectedInstance(auth?: ContentProviderAuthData | null): NetworkInstance | null;
};

export type B1ChurchProvider = ManifestProvider & {
  setPairingData(data: unknown): void;
  getCurrentPlan(auth?: ContentProviderAuthData | null): Promise<CurrentPlan | null>;
  exchangeCodeForTokensWithSecret(code: string, redirectUri: string, clientSecret: string): Promise<ContentProviderAuthData | null>;
  refreshTokenWithSecret(authData: ContentProviderAuthData, clientSecret: string): Promise<ContentProviderAuthData | null>;
};

export interface GoCurriculumData {
  generatedAt?: string;
  provider?: { name?: string };
  catalog: Array<{
    id: string;
    name: string;
    thumbnail?: string;
    lessons: Array<{
      id: string;
      name: string;
      thumbnail?: string;
      bigIdea?: string;
      bibleBasis?: string;
      keyVerse?: string;
      playlist: Array<{ title: string; file: string; url: string; mediaType?: string; duration?: number; thumbnail?: string; shareUrl?: string; tiers?: string[] }>;
      resources?: Array<{ title: string; file: string; url: string; shareUrl?: string }>;
      script?: { source?: string; sections: Array<{ name: string; role?: string; items: Array<{ type: string; content: string; files?: Array<{ file: string; url: string; mediaType?: string; thumbnail?: string; seconds?: number }> }> }> };
      smallGroup?: { source?: string; sections: Array<{ name: string; role?: string; items: Array<{ type: string; content: string; files?: Array<{ file: string; url: string; mediaType?: string; thumbnail?: string; seconds?: number }> }> }> };
    }>;
  }>;
}

/** A device host's way to load a catalog (e.g. through its server), instead of the private feed URLs. */
export type GoCurriculumCatalogLoader = (groupId: string, auth: ContentProviderAuthData) => Promise<GoCurriculumData | null>;

export type GoCurriculumProvider = ManifestProvider & {
  setCatalogLoader(loader: GoCurriculumCatalogLoader | null): void;
  getCatalog(groupId: string, auth?: ContentProviderAuthData | null): Promise<GoCurriculumData | null>;
};
