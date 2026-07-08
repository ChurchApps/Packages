# Go Curriculum Provider

Content is curated by the ChurchApps team in `data.json` (pilot: one month of lessons, media hosted on Dropbox, play order taken from the lesson docs). Access is gated by a gocurriculum.com login.

## OAuth

gocurriculum.com runs the [WP OAuth Server plugin](https://wordpress.org/plugins/oauth2-provider/):

- Authorize: `https://gocurriculum.com/oauth/authorize` (standard PKCE S256 supported)
- Token: `https://gocurriculum.com/oauth/token` — the client is confidential, so `client_secret` is required on exchange **and** refresh (handled via `config.clientSecret`)
- User info: `https://gocurriculum.com/oauth/me` — used by `verifyAuth` to gate browsing; accepts `access_token` in the POST body. Includes a custom `memberpress` field (`active_memberships`, `subscriptions`) added by Go's developer.

Full flow (login → authorize → PKCE S256 exchange → `/oauth/me`) e2e-verified 2026-07-08 against the FreePlay relay callback redirect URI.

Open items on Go Curriculum's side (Brandon Kueker, brandon@blkrvn.co):

- The `refresh_token` grant is disabled for the client (`unauthorized_client`) — until enabled, sessions die after the 3600s access-token lifetime and users must re-authenticate
- Tier filtering is not wired up yet: `active_memberships` entries' shape is unknown (test account has none) and curated collections don't map to tiers — until then any valid login sees all curated content

## data.json

```json
{
  "collections": [
    {
      "id": "go-kids-2026-08",
      "name": "GO! Kids — August 2026",
      "image": "https://...",
      "lessons": [
        {
          "id": "week-1",
          "name": "Week 1",
          "image": "https://...",
          "files": [
            { "id": "w1-countdown", "name": "Countdown.mp4", "url": "https://dl.dropboxusercontent.com/...", "seconds": 300, "loop": true }
          ]
        }
      ]
    }
  ]
}
```

`fileType` (`"video"`/`"image"`) is optional — media type is sniffed from the URL and file name otherwise. Paths are `/{collectionId}` and `/{collectionId}/{lessonId}`, so keep ids URL-safe slugs.
