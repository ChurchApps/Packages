---
"@churchapps/content-providers": minor
---

Standardize the PKCE auth surface so consumers never need provider-specific classes.

Added:

- `IProvider.buildAuthUrlFromChallenge?(codeChallenge, redirectUri, state)` — the pre-computed-challenge variant for environments without Web Crypto (React Native). Previously this existed only on `DropboxProvider`, forcing FreePlay to cast every OAuth provider to `DropboxProvider`. Now implemented by all four oauth_pkce providers (dropbox, signpresenter, b1church, aplay), with `OAuthHelper.buildAuthUrlFromChallenge()` as the shared generic builder. A test asserts `buildAuthUrl(verifier)` and `buildAuthUrlFromChallenge(challenge)` produce identical URLs for every oauth_pkce provider.
- APlay now implements the full PKCE method set (`generateCodeVerifier` / `buildAuthUrl` / `buildAuthUrlFromChallenge` / `exchangeCodeForTokens`). It declared `authTypes: ["oauth_pkce"]` but had no auth methods at all — linking it would have crashed any consumer.
- B1Church now implements `generateCodeVerifier` (was missing despite declaring oauth_pkce).
- A registry-wide conformance test: every declared authType and capability must have its matching methods implemented (oauth_pkce → the 4 PKCE methods, device_flow → initiate/poll, form_login → performLogin, playlist/instructions/mediaLicensing → their getters).

Changed (breaking):

- `B1ChurchProvider.exchangeCodeForTokensWithPKCE(code, redirectUri, codeVerifier)` is renamed to the standard `IProvider.exchangeCodeForTokens(code, codeVerifier, redirectUri)` (note the interface argument order). Only the package playground called the old name.
- `PlanningCenterProvider.authTypes` is now `[]` (was `["oauth_pkce"]`). It has no client-side auth flow — no PKCE methods and an empty clientId — so declaring oauth_pkce made consumers offer a connect flow that could never work. `requiresAuth` stays `true`; tokens must be supplied externally.
