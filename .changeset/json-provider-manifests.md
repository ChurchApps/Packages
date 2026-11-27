---
"@churchapps/content-providers": minor
---

Add JSON manifest providers: a generic `ManifestProvider` engine, a provider index, and `loadProviderIndex` for loading signed manifests from a server. Awana, CBN and SignPresenter now run from manifests. `AwanaProvider`, `CbnProvider` and `SignPresenterProvider` are no longer exported; use `getProvider(id)`.
