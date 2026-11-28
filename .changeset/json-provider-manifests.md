---
"@churchapps/content-providers": minor
---

Every provider is now defined by a JSON manifest, listed in a provider index. Awana, CBN, SignPresenter and the plan-integration provider are pure JSON, run by the new `ManifestProvider`. The other twelve keep their logic in built-in implementations that read identity, auth settings and capabilities from their manifests. Adds `loadProviderIndex` for loading signed manifests from a server. `AwanaProvider`, `CbnProvider`, `SignPresenterProvider` and `PlanningCenterProvider` are no longer exported; use `getProvider(id)`.
