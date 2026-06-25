# @churchapps/content-providers

## 0.4.1

### Patch Changes

- 0132787: Fix the dev playground (`npm run dev`) showing no providers after the 0.4.0 slim-down. Two load-time crashes aborted the playground's module graph before any provider rendered:

  - `VERSION` referenced the bare `__PACKAGE_VERSION__` token, which Vite's `define` only substitutes during `vite build` — `vite:define` is a no-op for client modules in dev, so the unresolved identifier threw a `ReferenceError` on load. Guarded with `typeof` so it degrades to `"dev"` (the tsup build still injects the real version).
  - The playground imported `OAuthHelper`/`DeviceFlowHelper` from the package root, but 0.4.0 dropped them from the public barrel; under native-ESM dev the missing named export is a hard `SyntaxError`. The playground now deep-imports them from `src/helpers`.

  No published API change — the fixes are confined to dev tooling and the `VERSION` constant is unchanged for consumers.

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
