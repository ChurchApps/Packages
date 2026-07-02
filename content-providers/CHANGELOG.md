# @churchapps/content-providers

## 0.5.0

### Minor Changes

- df16287: Simplify the provider implementations around shared reusable functions (~900 lines removed, no behavior change except one capability-flag fix).

  Added:

  - `BaseProvider` abstract class (exported): identity metadata declarations, a protected `apiRequest()` fetch wrapper, and a config-driven `supportsDeviceFlow()`. All 11 built-in providers now extend it. Auth-flow methods (`initiateDeviceFlow`, `buildAuthUrl`, ...) deliberately stay on the individual providers because consumers feature-detect them with `"method" in provider`.
  - `filesToInstructions()` / `fileToActionItem()` in utils (internal): the section → play-action → file Instructions tree that was hand-built near-identically in eight providers (aPlay, cbn, dropbox, bibleProject, jesusFilm, lifeChurch, signPresenter, and planningCenter's dead copy) is now one function. Instruction file items now consistently carry `mediaType` (and real `seconds` where the provider knows them) — previously only some providers included these.
  - `toAuthData()` (exported): the OAuth token-response → `ContentProviderAuthData` mapping that was copy-pasted in seven places (OAuthHelper, TokenHelper, DeviceFlowHelper, B1ChurchAuth ×3, DropboxProvider).
  - Re-exported `OAuthHelper` and `DeviceFlowHelper` from the package root. 0.4.0 removed them as unused, but FreePlay drives device flow via `new DeviceFlowHelper()` + `provider.config`, so upgrading FreePlay past 0.3.x would have broken its import.

  Changed:

  - `ContentProviderConfig.endpoints` is now optional and deprecated. The endpoints map was pure ceremony — used only inside the package, and every single access needed a cast (`config.endpoints.foo as (id: string) => string`). URL templates now live inline in each provider.
  - Providers resolve each path once: `browse` (at leaf), `getPlaylist`, and `getInstructions` share a single private resolve step instead of re-fetching/re-walking the same path three times (bibleProject went from ~100 lines of duplicated tree-building to ~20).
  - PlanningCenter capabilities now report `playlist: false, instructions: false`. It never implemented either method — the old flags made UIs offer options that silently returned nothing.
  - B1Church: token assembly and PKCE challenge generation now use the shared helpers; the B1ChurchApi fetch functions all route through its `authFetch`.
  - Byte-identical outputs verified for bibleproject / highvoltagekids / lifechurch / lessonschurch across browse/getPlaylist/getInstructions/getCurrentPlan at every depth (only diff: the additive `mediaType`/`thumbnail` fields noted above).

  Removed (dead code, nothing outside the package referenced any of it):

  - `PlanningCenterConverters` (~90% was leftovers of the removed `getPresentations` contract; `formatDate` moved into the provider).
  - lessonsChurch `convertVenueToPlan` / `convertAddOnCategoryToPlan`; b1Church `sectionToFolder`, `planItemToPresentation`, `venueFeedToDefaultPlanItems`, `processVenueInstructionItem`, `fetchArrangementKey`, `fetchVenuePlanItems`, and its duplicate `getEmbedUrl`/`generateCodeChallenge`/itemType normalization (now imported from the shared/lessonsChurch versions).
  - README doc rot: the custom-provider example referenced a `ContentProvider` base class that never existed; it now documents `BaseProvider`.

  Known follow-up (not addressed here): Api/APINew's `ProviderProxyController` still calls `provider.getPresentations()` / `getExpandedInstructions()`, which only exist in the 0.3.x package it is pinned to. When Api upgrades, that controller needs updating; B1Church's proxy-side `"getPresentations"` request is kept because the deployed 0.3.1 server still serves it.

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
