---
"@churchapps/content-providers": minor
---

Every provider is now defined by a JSON manifest listed in a provider index. Fifteen providers are pure JSON, run by the new `ManifestProvider` (routes, steps, paging, caching, hooks, datasets and a sandboxed expression language); B1.Church keeps its logic in a built-in implementation that reads its settings from its manifest. Adds `loadProviderIndex` for loading signed manifests from a server. The per-provider classes (`APlayProvider`, `AwanaProvider`, `BibleProjectProvider`, `CbnProvider`, `DropboxProvider`, `HighVoltageKidsProvider`, `JesusFilmProvider`, `LessonsChurchProvider`, `LifeChurchProvider`, `SignPresenterProvider` and the plan-integration class) are no longer exported; use `getProvider(id)`. `FreeShowProvider` and `GoCurriculumProvider` are now types for the manifest providers.
