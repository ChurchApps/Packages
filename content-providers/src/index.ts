/**
 * @churchapps/content-providers
 * Config-driven content providers powered by fixed shared auth, discovery, API, and transformation code.
 */

import type { ManifestProvider } from "./manifest/ManifestProvider";
import type { ContentProviderAuthData, CurrentPlan } from "./interfaces";

// Injected from package.json by tsup at build time so it can't drift.
declare const __PACKAGE_VERSION__: string | undefined;
export const VERSION = typeof __PACKAGE_VERSION__ !== "undefined" ? __PACKAGE_VERSION__ : "dev";

export * from "./interfaces";

export { navigateToPath } from "./instructionPathUtils";

// Fixed shared helpers: auth (OAuth PKCE, Device Flow, Form Login, Token refresh), LAN discovery, plan ordering, secrets.
export {
  TokenHelper,
  OAuthHelper,
  DeviceFlowHelper,
  FormLoginHelper,
  ApiHelper,
  setProviderSecret,
  setMdnsScanner,
  getMdnsScanner,
  probeLanHost,
  resolveMdnsServices,
  getOrderedFiles,
  findFirstThumbnail,
  type FormLoginConfig,
  type MdnsService,
  type MdnsScanner,
  type NetworkDiscoverer,
  type NetworkProbeConfig,
  type NetworkDiscoveryConfig,
  type PlanOrderItem
} from "./helpers";
export { toAuthData, authIsExpired } from "./helpers/TokenHelper";

export { BaseProvider } from "./providers/BaseProvider";

// Config-driven provider engine, validation, and remote/local config loaders.
export { ManifestProvider } from "./manifest/ManifestProvider";
export { validateManifest, validateIndex } from "./manifest/validate";
export {
  createProvider,
  registerProviderFromConfig,
  loadProviderFromUrl,
  loadProviderIndex,
  type LoadProviderOptions,
  type LoadProviderIndexOptions,
  type LoadProviderIndexResult
} from "./manifest/loader";
export {
  MANIFEST_ENGINE_VERSION,
  type ProviderManifest,
  type ManifestAuth,
  type ManifestFunction,
  type ManifestDataset,
  type ManifestGroup,
  type ManifestLeaf,
  type ManifestFileMapping,
  type ManifestRoute,
  type ManifestStep,
  type ManifestRequest,
  type ManifestProcedure,
  type ManifestOperation,
  type ProviderIndex,
  type ProviderIndexEntry
} from "./manifest/types";

// Convenience types & backward-compatible FreeShow/GoCurriculum/B1.Church helpers (zero provider-specific logic).
export type B1ChurchProvider = ManifestProvider & {
  setPairingData(data: unknown): void;
  getCurrentPlan(auth?: ContentProviderAuthData | null): Promise<CurrentPlan | null>;
  exchangeCodeForTokensWithSecret(code: string, redirectUri: string, clientSecret: string): Promise<ContentProviderAuthData | null>;
  refreshTokenWithSecret(authData: ContentProviderAuthData, clientSecret: string): Promise<ContentProviderAuthData | null>;
};
export { type FreeShowProvider } from "./providers/freeShow";
export { type GoCurriculumProvider, type GoCurriculumCatalogLoader, type GoCurriculumData } from "./providers/goCurriculum";
export {
  FREESHOW_REST_PORT,
  freeShowServicesToInstances,
  networkInstanceToAuth,
  authToNetworkInstance,
  type FreeShowDiscoverer
} from "./providers/freeShow";

export {
  getProvider,
  getAllProviders,
  registerProvider,
  unregisterProvider,
  getProviderConfig,
  getAvailableProviders
} from "./providers";
