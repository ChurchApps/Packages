# @churchapps/content-providers

## 0.7.0

### Minor Changes

- 86645c1: GoCurriculum: data.json now uses Go Curriculum's own catalog export format verbatim (`catalog`/`thumbnail`/`playlist` with `duration`, file ids slugified from filenames) instead of the hand-rolled `collections`/`files` schema — new exports from Go drop in unmodified. Lesson `resources` (PDF/docx leader material) are carried in the data but not surfaced.
- 030b4d9: content-providers: remove the hardcoded GoCurriculum OAuth clientSecret from the published bundle; hosts now inject it at startup via the new `setProviderSecret("gocurriculum", secret)` export (FreePlay uses EXPO_PUBLIC_GOCURRICULUM_CLIENT_SECRET, Api uses GOCURRICULUM_CLIENT_SECRET). helpers: UserHelper.selectChurch now propagates context.setUser/setPerson after a church switch, adds a userChurches guard; FileHelper.postPresignedFile drops the duplicate "key" form field (matches the live upload flows; no existing callers). apphelper: delete the 8 shadow-duplicated local helper files and route internal components (GalleryModal, SiteHeader, ChurchList) through @churchapps/helpers — note dist/helpers/\* deep-import paths for those files no longer exist.

### Patch Changes

- 40aa620: Unify TypeScript to 6.0.3 across the workspace (tsconfig TS6 fixes: apihelper rootDir, ignoreDeprecations in tsup packages, texting node types); add unit test suites to helpers and apihelper via tsx --test; fix lint errors in apphelper calendar/markdown components

## 0.6.1

### Patch Changes

- 970f04f: Fix `B1ChurchProvider.getCurrentPlan` for external-provider daily lessons (e.g. Dropbox). It resolved the plan's content by calling the inner provider directly with `null` auth, so any provider needing a token (Dropbox, etc.) returned no instructions and the current plan came back `null` — the lesson never appeared in FreePlay regardless of its scheduled date. It now resolves external content through the server-side `providerProxy` (which holds the church's provider token), passing the caller's auth through, mirroring the `browse`/`getInstructions` paths.

## 0.6.0

### Minor Changes

- 0bf1f64: Standardize the PKCE auth surface so consumers never need provider-specific classes.

  Added:

  - `IProvider.buildAuthUrlFromChallenge?(codeChallenge, redirectUri, state)` — the pre-computed-challenge variant for environments without Web Crypto (React Native). Previously this existed only on `DropboxProvider`, forcing FreePlay to cast every OAuth provider to `DropboxProvider`. Now implemented by all four oauth_pkce providers (dropbox, signpresenter, b1church, aplay), with `OAuthHelper.buildAuthUrlFromChallenge()` as the shared generic builder. A test asserts `buildAuthUrl(verifier)` and `buildAuthUrlFromChallenge(challenge)` produce identical URLs for every oauth_pkce provider.
  - APlay now implements the full PKCE method set (`generateCodeVerifier` / `buildAuthUrl` / `buildAuthUrlFromChallenge` / `exchangeCodeForTokens`). It declared `authTypes: ["oauth_pkce"]` but had no auth methods at all — linking it would have crashed any consumer.
  - B1Church now implements `generateCodeVerifier` (was missing despite declaring oauth_pkce).
  - A registry-wide conformance test: every declared authType and capability must have its matching methods implemented (oauth_pkce → the 4 PKCE methods, device_flow → initiate/poll, form_login → performLogin, playlist/instructions/mediaLicensing → their getters).

  Changed (breaking):

  - `B1ChurchProvider.exchangeCodeForTokensWithPKCE(code, redirectUri, codeVerifier)` is renamed to the standard `IProvider.exchangeCodeForTokens(code, codeVerifier, redirectUri)` (note the interface argument order). Only the package playground called the old name.
  - `PlanningCenterProvider.authTypes` is now `[]` (was `["oauth_pkce"]`). It has no client-side auth flow — no PKCE methods and an empty clientId — so declaring oauth_pkce made consumers offer a connect flow that could never work. `requiresAuth` stays `true`; tokens must be supplied externally.

### Patch Changes

- 2deab25: B1Church plan playback fixes for provider (Dropbox) content:

  - getPlaylist: resolve provider items placed at the top level of the service order (previously only children of sections were scanned, so plans made of bare Dropbox items returned no content).
  - Skip the lessons.church venue-feed fetch when the plan's content belongs to another provider, removing a failing request on every playlist load.
  - Media-type classification: trust an instruction item's declared mediaType, and fall back to sniffing the label (original filename) — extension-less URLs like Dropbox temporary links were classified as images, so videos rendered in the image pipeline and failed with "Video failed to load". Applied in instructionsToPlaylist and the paired-plan file collector (which previously omitted fileType entirely).

## 0.5.1

### Patch Changes

- 96e5726: Clean up package source for stricter linting and TypeScript builds, including unused import removal, simplified helper comments, and minor internal typing/formatting updates across app helpers, content providers, SDK clients, environment helpers, and texting exports.

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
