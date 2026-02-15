/**
 * @churchapps/texting
 * SMS texting provider abstraction for ChurchApps
 */

export const VERSION = "0.1.0";

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
