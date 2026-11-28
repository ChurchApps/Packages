/**
 * @churchapps/content-providers
 * Helper classes for interacting with third party content providers
 */

// Injected from package.json by tsup at build time so it can't drift.
declare const __PACKAGE_VERSION__: string | undefined;
export const VERSION = typeof __PACKAGE_VERSION__ !== "undefined" ? __PACKAGE_VERSION__ : "dev";

export * from "./interfaces";

export { navigateToPath } from "./instructionPathUtils";

// OAuthHelper/DeviceFlowHelper are part of the public contract (FreePlay uses device flow).
export { TokenHelper, OAuthHelper, DeviceFlowHelper, setProviderSecret } from "./helpers";
export { toAuthData, authIsExpired } from "./helpers/TokenHelper";

export { BaseProvider } from "./providers/BaseProvider";

// JSON-manifest providers: the engine, validation, and loading a hosted provider index.
export { ManifestProvider } from "./manifest/ManifestProvider";
export { ConfiguredProvider } from "./manifest/ConfiguredProvider";
export { validateManifest, validateIndex } from "./manifest/validate";
export { loadProviderIndex, createProvider, type LoadProviderIndexOptions, type LoadProviderIndexResult } from "./manifest/loader";
export { MANIFEST_ENGINE_VERSION, type ProviderManifest, type ManifestAuth, type ManifestGroup, type ManifestLeaf, type ManifestFileMapping, type ManifestRoute, type ManifestStep, type ManifestRequest, type ManifestProcedure, type ManifestOperation, type ProviderIndex, type ProviderIndexEntry } from "./manifest/types";

export { B1ChurchProvider } from "./providers/b1Church";
export { type FreeShowProvider } from "./providers/freeShow";
export { type GoCurriculumProvider, type GoCurriculumCatalogLoader, type GoCurriculumData } from "./providers/goCurriculum";
export {
  FREESHOW_REST_PORT,
  freeShowServicesToInstances,
  type MdnsService,
  networkInstanceToAuth,
  authToNetworkInstance,
  type FreeShowDiscoverer
} from "./providers/freeShow";

export {
  getProvider,
  getAllProviders,
  registerProvider,
  getProviderConfig,
  getAvailableProviders
} from "./providers";
