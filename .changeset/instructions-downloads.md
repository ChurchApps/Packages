---
"@churchapps/content-providers": minor
---

Add `downloads` to `Instructions` (new `ContentDownload` interface) so providers can supply printable/leader files alongside the playlist. Lessons.church maps venue feed download bundles (skipping playlist media) and Go Curriculum maps lesson resources. Adds `FeedDownloadInterface`/`FeedVenueInterface.downloads` and an `isPlaylistMedia` util.
