---
"@churchapps/content-providers": minor
---

content-providers: add Google Drive provider (#944). New `GoogleDriveProvider` alongside Dropbox in the service-order picker: OAuth PKCE against accounts.google.com with `access_type=offline&prompt=consent` so a refresh_token is issued, token exchange/refresh through oauth2.googleapis.com via the generic `OAuthHelper`/`TokenHelper` (Google requires a client_secret even for PKCE — injected server-side via `setProviderSecret("googledrive", ...)`), and browse/playlist/instructions over the Drive v3 files API with shared-drive support. Paths are Drive folder ids; media is filtered by mimeType; leaf folders are detected with a single batched `in parents` query. Note: the OAuth `clientId` ships empty pending creation of the Google Cloud client — fill it before consuming this release.
