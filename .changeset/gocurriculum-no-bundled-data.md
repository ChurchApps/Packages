---
"@churchapps/content-providers": patch
---

GoCurriculum: drop the bundled data.json fallback; the catalog now comes only from Go's hosted feeds, and a failed fetch retries on the next request instead of waiting an hour.
