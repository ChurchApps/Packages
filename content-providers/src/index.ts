/**
 * @churchapps/content-providers
 * Helper classes for interacting with third party content providers
 */

// Injected from package.json by tsup at build time so it can't drift
declare const __PACKAGE_VERSION__: string;
export const VERSION = __PACKAGE_VERSION__;

// Interfaces
export * from "./interfaces";

// Utilities
export { detectMediaType, isMediaFile, createFolder, createFile } from "./utils";
export { parsePath, getSegment, buildPath, appendToPath } from "./pathUtils";
export { navigateToPath, generatePath } from "./instructionPathUtils";
export {
  estimateDuration,
  estimateImageDuration,
  estimateTextDuration,
  countWords,
  DEFAULT_DURATION_CONFIG,
  type DurationEstimationConfig
} from "./durationUtils";

// Format conversion utilities (access via FormatConverters namespace)
export * as FormatConverters from "./FormatConverters";

// Format resolver
export { FormatResolver, type FormatResolverOptions, type ResolvedFormatMeta } from "./FormatResolver";

// Helper classes (for standalone use or custom providers)
export { OAuthHelper, TokenHelper, DeviceFlowHelper, ApiHelper } from "./helpers";

// Built-in providers
export { APlayProvider } from "./providers/aPlay";
export { SignPresenterProvider } from "./providers/signPresenter";
export { LessonsChurchProvider } from "./providers/lessonsChurch";
export { B1ChurchProvider } from "./providers/b1Church";
export { DropboxProvider } from "./providers/dropbox";
export { PlanningCenterProvider } from "./providers/planningCenter";
export { BibleProjectProvider } from "./providers/bibleProject";
export { HighVoltageKidsProvider } from "./providers/highVoltage";
export { JesusFilmProvider } from "./providers/jesusFilm";
export { CbnProvider } from "./providers/cbn";

// Registry functions
export {
  getProvider,
  getAllProviders,
  registerProvider,
  getProviderConfig,
  getAvailableProviders
} from "./providers";
