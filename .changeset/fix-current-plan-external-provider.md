---
"@churchapps/content-providers": patch
---

Fix `B1ChurchProvider.getCurrentPlan` for external-provider daily lessons (e.g. Dropbox). It resolved the plan's content by calling the inner provider directly with `null` auth, so any provider needing a token (Dropbox, etc.) returned no instructions and the current plan came back `null` — the lesson never appeared in FreePlay regardless of its scheduled date. It now resolves external content through the server-side `providerProxy` (which holds the church's provider token), passing the caller's auth through, mirroring the `browse`/`getInstructions` paths.
