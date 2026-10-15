---
"@churchapps/content-providers": minor
---

FreeShow provider talks to real FreeShow machines over the REST API (projects, shows, local images via get_thumbnail) and exports `freeShowServicesToInstances` to turn `_freeshow._udp` mDNS results into connectable machines; the mock show and `MOCK_FREESHOW_INSTANCE` are removed.
