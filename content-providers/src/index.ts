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
export { TokenHelper, OAuthHelper, DeviceFlowHelper } from "./helpers";
export { toAuthData } from "./helpers/TokenHelper";

export { BaseProvider } from "./providers/BaseProvider";

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

export {
  getProvider,
  getAllProviders,
  registerProvider,
  getProviderConfig,
  getAvailableProviders
} from "./providers";
