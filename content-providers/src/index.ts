/**
 * @churchapps/content-providers
 * Helper classes for interacting with third party content providers
 */

// Injected from package.json by tsup at build time so it can't drift.
declare const __PACKAGE_VERSION__: string | undefined;
export const VERSION = typeof __PACKAGE_VERSION__ !== "undefined" ? __PACKAGE_VERSION__ : "dev";

// Interfaces
export * from "./interfaces";

// Utilities
export { navigateToPath } from "./instructionPathUtils";

// Helper classes (for standalone use or custom providers).
// OAuthHelper/DeviceFlowHelper were dropped in 0.4.0, but FreePlay drives device flow
// via `new DeviceFlowHelper()` + provider.config, so they are part of the real contract.
export { TokenHelper, OAuthHelper, DeviceFlowHelper } from "./helpers";
export { toAuthData } from "./helpers/TokenHelper";

// Base class for implementing custom providers
export { BaseProvider } from "./providers/BaseProvider";

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
export { LifeChurchProvider } from "./providers/lifeChurch";

// Registry functions
export {
  getProvider,
  getAllProviders,
  registerProvider,
  getProviderConfig,
  getAvailableProviders
} from "./providers";
