---
"@churchapps/content-providers": minor
---

All 16 providers (including B1.Church and FreeShow) are now pure JSON config manifests run by fixed shared code (`ManifestProvider`, `OAuthHelper`, `DeviceFlowHelper`, `FormLoginHelper`, `TokenHelper`, `NetworkDiscoveryHelper`, `PlanHelper`, and the shared transformation library). Adds `loadProviderFromUrl`, `registerProviderFromConfig`, `unregisterProvider`, `loadProviderIndex`, `setMdnsScanner`, `resolveMdnsServices`, declarative `networkDiscovery`, `form_login`, JSON token exchange, per-instance manifest `state`, structured manifest `functions`, and inline/remote `datasets`. No per-provider TypeScript implementation classes remain; use `getProvider(id)`.
