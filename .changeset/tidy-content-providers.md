---
"@churchapps/content-providers": minor
---

Slim down the content-providers surface to what the apps actually use.

Breaking:
- Removed `FormatResolver` and the `FormatConverters` namespace (plus the `ResolvedFormatMeta` and `FormatResolverOptions` types). No shipping consumer used them — apps call `provider.getPlaylist()` / `provider.getInstructions()` directly. The cross-format derivation that `FormatResolver` provided lives on only in the dev playground.
- Removed the unused `presentations` field from `ProviderCapabilities` and retired the never-implemented "presentations" format (dead `getPresentations` stubs, `convertFilesToPresentations`). Capabilities are now `browse` / `playlist` / `instructions` / `mediaLicensing`.

Added:
- Export `LifeChurchProvider` from the package root (it was registered but not exported).

Internal (no API change):
- `instructionsToPlaylist` moved into `utils` (it's a general converter, used by B1Church and the playground).
- B1Church device-flow now delegates to the shared `DeviceFlowHelper` instead of a duplicate copy.
- Provider registration is a single list instead of constructing and registering each provider twice.
