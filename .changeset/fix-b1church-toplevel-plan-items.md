---
"@churchapps/content-providers": patch
---

B1Church getPlaylist: resolve provider items placed at the top level of the service order (previously only children of sections were scanned, so plans made of bare Dropbox/provider items returned no content). Also skip the lessons.church venue-feed fetch when the plan's content belongs to another provider, which removed a failing request on every playlist load.
