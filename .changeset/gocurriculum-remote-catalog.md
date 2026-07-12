---
"@churchapps/content-providers": patch
---

GoCurriculum provider now fetches its catalog from Go's hosted data.json (Dropbox) at runtime with a 1-hour cache, so catalog updates appear without republishing the package. The bundled data.json remains as the fallback when the fetch fails.
