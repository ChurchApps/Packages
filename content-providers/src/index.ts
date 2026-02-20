/**
 * @churchapps/content-provider-helper
 * Helper classes for interacting with third party content providers
 */

export const VERSION = "0.0.5";

// Interfaces
export * from "./interfaces";

// Utilities
export { detectMediaType, createFolder, createFile } from "./utils";
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

// Registry functions
export {
  getProvider,
  getAllProviders,
  registerProvider,
  getProviderConfig,
  getAvailableProviders
} from "./providers";
