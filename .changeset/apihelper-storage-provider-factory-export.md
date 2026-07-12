---
"@churchapps/apihelper": patch
---

Publish the `StorageProviderFactory` export (already in source but missing from the published 0.8.0). Consumers such as Api's `StorageResolver` import it, and the stale published build threw at module load, unregistering the whole content module and 404ing every `/content/*` route.
