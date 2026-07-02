---
"@churchapps/content-providers": minor
---

Simplify the provider implementations around shared reusable functions (~900 lines removed, no behavior change except one capability-flag fix).

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
