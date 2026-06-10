/** `@churchapps/integration-sdk` — toolkit for building B1.church integrations. */
// Injected from package.json by tsup at build time so it can't drift
declare const __PACKAGE_VERSION__: string;
export const VERSION = __PACKAGE_VERSION__;

export * from "./types";
export * from "./webhooks";
export * from "./rest";
export * from "./oauth";
