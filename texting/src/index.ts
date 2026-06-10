/**
 * @churchapps/texting
 * SMS texting provider abstraction for ChurchApps
 */

// Injected from package.json by tsup at build time so it can't drift
declare const __PACKAGE_VERSION__: string;
export const VERSION = __PACKAGE_VERSION__;

// Interfaces
export * from "./interfaces.js";

// Provider registry
export {
  getProvider,
  getSupportedProviders,
  registerProvider,
  isProviderAvailable,
  getProviderInfo
} from "./providers/index.js";

// Built-in providers
export { TextInChurchProvider } from "./providers/textInChurch/index.js";
export { ClearstreamProvider } from "./providers/clearstream/index.js";
export { MutualMinistryProvider } from "./providers/mutualMinistry/index.js";
