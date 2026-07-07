---
"@churchapps/content-providers": patch
---

B1Church plan playback fixes for provider (Dropbox) content:

- getPlaylist: resolve provider items placed at the top level of the service order (previously only children of sections were scanned, so plans made of bare Dropbox items returned no content).
- Skip the lessons.church venue-feed fetch when the plan's content belongs to another provider, removing a failing request on every playlist load.
- Media-type classification: trust an instruction item's declared mediaType, and fall back to sniffing the label (original filename) — extension-less URLs like Dropbox temporary links were classified as images, so videos rendered in the image pipeline and failed with "Video failed to load". Applied in instructionsToPlaylist and the paired-plan file collector (which previously omitted fileType entirely).
