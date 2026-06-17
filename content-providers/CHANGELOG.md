# @churchapps/content-providers

## 0.4.0

### Minor Changes

- ddd001f: Slim down the content-providers surface to what the apps actually use.

  Breaking:

  - Removed `FormatResolver` and the `FormatConverters` namespace (plus the `ResolvedFormatMeta` and `FormatResolverOptions` types). No shipping consumer used them — apps call `provider.getPlaylist()` / `provider.getInstructions()` directly. The cross-format derivation that `FormatResolver` provided lives on only in the dev playground.
  - Removed the unused `presentations` field from `ProviderCapabilities` and retired the never-implemented "presentations" format (dead `getPresentations` stubs, `convertFilesToPresentations`). Capabilities are now `browse` / `playlist` / `instructions` / `mediaLicensing`.

  Added:

  - Export `LifeChurchProvider` from the package root (it was registered but not exported).

  Internal (no API change):

  - `instructionsToPlaylist` moved into `utils` (it's a general converter, used by B1Church and the playground).
  - B1Church device-flow now delegates to the shared `DeviceFlowHelper` instead of a duplicate copy.
  - Provider registration is a single list instead of constructing and registering each provider twice.

- 39e47d3: Trim the content-providers utility surface to what consumers actually use.

  Breaking:

  - Removed the duration-estimation module (`estimateDuration`, `estimateImageDuration`, `estimateTextDuration`, `countWords`, `DEFAULT_DURATION_CONFIG`, `DurationEstimationConfig`). The never-used text-estimation code is gone; image duration is now a single internal `IMAGE_DURATION_SECONDS = 15` constant.
  - Removed the path helpers `buildPath`, `appendToPath`, and `generatePath` — no consumer or internal caller used them.
  - Stopped exporting internal-only utilities from the package root: `detectMediaType`, `isMediaFile`, `createFolder`, `createFile`, `parsePath`, `getSegment`, and the `OAuthHelper` / `DeviceFlowHelper` / `ApiHelper` classes. They're still used internally — just no longer part of the public API. `TokenHelper` and `navigateToPath` remain exported.

## 0.3.1

### Patch Changes

- afebf7e: The exported `VERSION` constant is now injected from package.json at build time instead of being hardcoded (it had drifted several releases behind).
