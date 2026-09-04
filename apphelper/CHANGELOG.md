# @churchapps/apphelper

## 1.6.0

### Minor Changes

- b6b5426: Add Japanese (`ja`) to the supported languages so `ja-*` browsers load the ja locale files instead of falling back to English, and repair the locale JSON files, which were stored double-encoded (UTF-8 read back as windows-1252). Every non-ASCII language was affected — Japanese rendered as `ã‚­ãƒ£ãƒ³ã‚»ãƒ«`, Spanish as `NÃºmero de Cuenta`, German as `SchlieÃŸen`. `ja.json` is also filled out to full coverage.

## 1.5.1

### Patch Changes

- 3f94541: Stop ImageEditor from loading on every page via a circular chunk (C is not a function). Lazy-load the gallery and cropper, and import ImageEditor siblings directly.

## 1.5.0

### Minor Changes

- 893da81: Fix guest donation forms (Stripe, PayPal, Paystack, Kingdom Funding) so a `?fundId=` and `?amount=` on the donate link actually preselect the fund and total, not just the amount field — the total, fee, and validation used to stay at $0 until the donor touched a field.
- a900eeb: Add PayPal Smart Buttons (PayPal + Venmo) above the Hosted Fields card form on the PayPal guest form and member entry, for one-time gifts only. The SDK now loads `components=buttons,hosted-fields&enable-funding=venmo` once for both widgets, and an approved order is charged through the existing `/donate/charge` capture path.

## 1.4.0

### Minor Changes

- 002eb79: Add inline image support to the markdown editor, including gallery insert and `![alt](src)` round-trip.
- d8c21b4: Guest donation forms get a "Give anonymously" option that skips person creation and sends the gift without a donor.
- ef7921e: Add Apple Pay and Google Pay to the Stripe guest donation form via the Express Checkout Element, and register the site's domain with Stripe so Apple Pay can offer itself.

## 1.3.6

### Patch Changes

- d11a669: Loading spinner and label default to white when `document.body` has `dark-theme`, instead of hard-coding `#222`.
- b2454b9: Restore SSO button labels lost in locale sync and add them to the English fallbacks
- 702e244: Website Theme now emits spacing tokens with units (`--spacing-md: 16px` instead of `16`) so saved numeric spacing scales produce valid declarations, and renders `customCss` as a sibling of `:root` rather than nesting it inside.

## 1.3.5

### Patch Changes

- 23b8b7c: Anonymous donation forms load church name via GET /churches/lookup instead of the auth-gated GET /churches/:id.
- e485e74: Website group cards link to /mobile/groups/<slug>, the route B1App serves.

## 1.3.4

### Patch Changes

- db32079: Add missing login.continueGoogle / login.continueMicrosoft labels

## 1.3.3

### Patch Changes

- 3f983a7: Set-password page no longer sticks on "Please wait" when the invite link's user lookup fails; shows expired-link state instead.

## 1.3.2

### Patch Changes

- 998eb1a: Add a Podcast link to the Social Icons element

## 1.3.1

### Patch Changes

- c959471: Kingdom Funding: Collect.js now loads from the new NMI host (lotusconsulting.transactiongateway.com), and a superseded Collect.js script can no longer auto-configure a second set of card fields (intermittent "Failed to tokenize card").

## 1.3.0

### Minor Changes

- a76a6f1: Stripe: support Canadian pre-authorized debit (acss_debit) for CAD gateways alongside US ACH.

## 1.2.0

### Minor Changes

- c385cb9: Add Paystack payment provider (cards + mobile money) for African churches

## 1.1.6

### Patch Changes

- fa15e27: Use theme-aware colors for notes and message reply in dark mode.

## 1.1.5

### Patch Changes

- f003d00: Fix fullscreen markdown editor bugs: TRANSFORMERS.splice mutated the shared Lexical export, a formatting-state check was comparing a boolean to a string, and MarkdownModal called onChange on every render instead of only on user edits.

## 1.1.4

### Patch Changes

- 19bb08e: Raise the markdown link editor Appearance/Variant/Size dropdowns above the floating popup so they are clickable (ChurchAppsSupport #993).
- 4f75024: Fail closed on JWT algorithm, escape email app name/url, treat SVG as private S3 content, and set Secure + 2-day JWT cookies.

## 1.1.3

### Patch Changes

- 2a8dab3: Rebuild weekly RRules from the event start date and match exception dates by calendar day.

## 1.1.2

### Patch Changes

- e41219a: Send the MessagingApi JWT on realtime room joins when one is configured. `SubscriptionManager.postConnection` and `SocketHelper.createAlertConnection` previously always used `postAnonymous`, which the API now rejects for non-public rooms (person notes, group chat, the per-person "alerts" room) — silently killing all realtime delivery for logged-in users. Anonymous POST remains the fallback for logged-out livestream viewers, the only audience the API still accepts anonymously.
- 4393391: Constrain S3 uploads: the server pins Content-Type and a content-length-range on presigned POSTs and chooses the ACL itself (a client-supplied ACL is ignored). Only allowlisted media types get `public-read`; every other type uploads to a private object rather than being rejected.
- b1b0829: Sanitize MarkdownPreviewLight HTML to block stored XSS. Link and image URLs are now checked against a scheme allowlist (http, https, mailto, tel, relative, plus raster `data:` image sources) at every point they can enter the preview - the `{...}` special-link syntax, marked's own link/image renderer, and raw HTML - so `javascript:` and `data:` URLs are dropped rather than relying on DOMPurify alone.

## 1.1.1

### Patch Changes

- ad6b276: apphelper: take Kingdom Funding out of beta — removed `betaOnly: true` from the KingdomFunding provider descriptor, so KF now appears in the production admin gateway dropdown (`GivingSettingsEdit`) for all churches, not just those that already had it configured. No behavior change to the donation flows themselves; the NMI-backed provider (charges, vaulting, recurring, webhooks) has been live-path code since the July provider refactor.
- 53fc9ee: apphelper: make the new zh-TW locale rollout-safe and fix locale resolution generally (#14). `Locale.init()` now loads `zh.json` alongside `zh-TW.json` and configures i18next with `fallbackLng: { "zh-TW": ["zh", "en"], default: ["en"] }`, so a consuming app that has not shipped a `zh-TW.json` yet — or has shipped a partial one — degrades to Simplified Chinese instead of English. Without this, adding `zh-TW` to `supportedLanguages` would have flipped every zh-TW/zh-HK/zh-MO/zh-Hant browser from a full Chinese UI to a full English one the moment the app picked up the new version. Traditional Chinese subtag matching is also now case-insensitive, so a non-canonical `zh-tw` or `ZH-HANT` still resolves correctly.

  The mapping was previously inert for everything except a literal `zh-TW` browser tag: i18next detected the raw `navigator.language`, so a `zh-HK` browser resolved to `zh-HK` → `zh` → English and never touched the `zh-TW` resource that had just been fetched. The same mismatch meant `nb-NO` never reached the `no` locale file despite the `extraCodes` mapping. `init()` now passes the mapped locale to i18next as `lng` directly, and the `i18next-browser-languagedetector` plugin is dropped — detection order was `navigator`-only and its localStorage cache was never read.

## 1.1.0

### Minor Changes

- 719a2ef: Bring-Your-Own-Storage support. `PresignedPostData` gains optional `method`, `headers`, `rawBody`, `chunkSize` and `externalIdField` so storage providers can presign raw-body PUT/POST and chunked-session uploads (Google Drive, Dropbox, OneDrive, S3-compatible), and `IStorageProvider` gains optional `getDownloadUrl` for minting short-lived download links. New `FileHelper.uploadPresignedFile` handles every presign shape client-side (legacy form-POST unchanged, raw-body, chunked) and returns the provider file id; `FileInterface` carries `provider`/`externalId`. `FileUpload` now sends `size`/`mimeType` with postUrl requests (fixes provider presigns), registers the returned `externalId`, and surfaces `storage_quota_exceeded` errors. All changes are additive and backward compatible.

## 1.0.4

### Patch Changes

- 7d3d01b: apphelper: make per-element font choices actually work in the website builder (#977). Setting "Font Family" on an individual element (e.g. a Text element) emitted `#el-{id} { font-family: X }` but nothing ever fetched that family from Google Fonts — only the global heading/body fonts were loaded — so the element silently fell back to the default and looked unchanged. `StyleHelper` now exposes `getFontFamilies(sections)` and `getFontUrls(sections)`, which collect the distinct font families used by section and element styles (skipping system fonts and `var(--…)` tokens) and build one Google Fonts url per family, so an unrecognized name only fails its own request instead of every font on the page. Hosts render those urls as stylesheet links alongside the generated CSS.

  Separately, an element's font now also applies to headings inside it: `pages.css` matches `.page h1`-`h6` directly and a directly-matched rule beats an inherited one, so the wrapper's `font-family` never reached headings within the element — body text changed while headings did not. `getStyle` emits a companion `#el-{id} h1…h6` rule whenever an element sets a font.

## 1.0.3

### Patch Changes

- bf5094b: apphelper: fix website-builder fonts not applying consistently (#977). The page-builder editor's Google Fonts loader built its URL with a non-global `replace(" ", "+")`, so any font family with more than two words (e.g. "IBM Plex Sans", "Big Shoulders Text" — all selectable from the full Google Fonts catalog) produced a malformed request that silently failed and fell back to the default font; it also only requested weight 400, so bold text got browser-synthesized faux bold instead of the real weight. `Theme` now matches the published-site renderer: global space replacement and `:wght@400;700`. The `pages.css` heading-font rule was also extended from `h1`-`h4` to include `h5`/`h6`, so FAQ titles and other h5/h6 content pick up the chosen heading font rather than falling back to the body font.

## 1.0.2

### Patch Changes

- fbb69cc: Fix cover-fee debounce race (stale checkbox state could drop the recalculated fee from the total), fund row mobile layout, and duplicate React keys on fund rows

## 1.0.1

### Patch Changes

- 14638b6: content-providers: two Lessons.church playback/labeling fixes. `collectFilesFromNode` now only emits leaf nodes (itemType `"file"` or childless), so B1 plan lessons no longer play each video/slide 2-4 times on FreePlay — the same `downloadUrl` legitimately appears on section, action, and file levels of the plan tree (#963). `convertAddOnToFile` falls back to the fetched add-on detail for `title` and `thumbnail`, so add-ons resolved by bare id (`getPlaylist`, `getInstructions`, `getAddOnFiles`) keep their real name instead of showing "Action" (#974).

  apphelper: registering a new church no longer re-enables the Save button while church selection is still in flight — the button stays disabled until navigation, closing the window where a second click created a duplicate church (#957). `LoginPage.selectChurch` now awaits `continueLoginProcess`, and `SelectChurchRegister`'s `selectChurch` prop accepts an async handler.

## 1.0.0

### Patch Changes

- Updated dependencies [289b504]
  - @churchapps/helpers@2.0.0

## 0.22.2

### Patch Changes

- 030b4d9: content-providers: remove the hardcoded GoCurriculum OAuth clientSecret from the published bundle; hosts now inject it at startup via the new `setProviderSecret("gocurriculum", secret)` export (FreePlay uses EXPO_PUBLIC_GOCURRICULUM_CLIENT_SECRET, Api uses GOCURRICULUM_CLIENT_SECRET). helpers: UserHelper.selectChurch now propagates context.setUser/setPerson after a church switch, adds a userChurches guard; FileHelper.postPresignedFile drops the duplicate "key" form field (matches the live upload flows; no existing callers). apphelper: delete the 8 shadow-duplicated local helper files and route internal components (GalleryModal, SiteHeader, ChurchList) through @churchapps/helpers — note dist/helpers/\* deep-import paths for those files no longer exist.
- 40aa620: Unify TypeScript to 6.0.3 across the workspace (tsconfig TS6 fixes: apihelper rootDir, ignoreDeprecations in tsup packages, texting node types); add unit test suites to helpers and apihelper via tsx --test; fix lint errors in apphelper calendar/markdown components

## 0.22.1

### Patch Changes

- b89a2c7: Enable full TypeScript strict mode across helpers, apihelper, and apphelper (tech-debt audit item 3). All three packages now extend a shared `tsconfig.base.json` that ships in the helpers package, so consuming apps can opt in via `"extends": "@churchapps/helpers/tsconfig.base.json"`. Fixes are type-level and behavior-preserving; notable declaration changes: `ApiHelper.onRequest`/`onError` are now optional, and several component props/state types widened to `| null` to reflect actual runtime values.

## 0.22.0

### Minor Changes

- 80fe1a4: Make donations fully provider-based. Each gateway (Stripe, PayPal, Kingdom Funding) now lives under `donations/providers/<gateway>/` and registers through the provider registry, so the shared donation flow no longer branches on gateway type. Removes the old per-gateway components and helpers (`StripeProvider`, `PayPalProvider`, `KingdomFundingProvider`, `StripeInstanceContext`, `*NonAuthDonationInner`, `PayPalHostedFields`, `CardForm`/`BankForm`, `StripePaymentMethod`/`PayPalPaymentMethod`, `PayPalDonationInterface`) in favor of the registry-driven `SavedPaymentMethod` and provider modules. Consumers no longer need `@stripe/*` deps and should reference providers via the registry rather than importing gateway components directly.

## 0.21.1

### Patch Changes

- 8ea2eeb: Fix Kingdom Funding (Collect.js) fields rendering at 0px height. Toggle field visibility with `visibility` instead of `display:none` so Collect.js measures a real height at init, pin the iframe/field box height, and null out the script's `onload`/`onerror` on cleanup to avoid a stale script configuring the wrong field set after a remount.

## 0.21.0

### Minor Changes

- fad0bc1: Harden realtime socket handling: automatic reconnect with resume-probe, server heartbeat handling, and always-push with client-side dedup. SubscriptionManager and ConversationStore updated to match. Note: `onSocketIdReady` now fires on every (re)connect rather than only the first connect.

## 0.20.1

### Patch Changes

- 7e0a5d6: Deepen the SiteHeader AppBar and PageHeader gradient to the darker `--c1d5` blue for a stronger, more uniform top edge; drop the now-unused `--c1d3` CSS var.
- e054052: Fix build: remove stale `@ts-expect-error` directives on `HTMLInputElement.showPicker` (now present in the TS lib defs), which triggered TS2578 and broke the topological package build.

## 0.20.0

### Minor Changes

- 4222002: Add optional `avatar`, `breadcrumbs`, and `chips` slots to `PageHeader`. `avatar` renders in place of the boxed `icon` (for a person/entity photo), `breadcrumbs` renders a trail above the title row, and `chips` renders status pills next to the title. All are optional and backward-compatible — existing `icon`/`title`/`subtitle` usage is unchanged.

### Patch Changes

- 96e5726: Clean up package source for stricter linting and TypeScript builds, including unused import removal, simplified helper comments, and minor internal typing/formatting updates across app helpers, content providers, SDK clients, environment helpers, and texting exports.

## 0.19.0

### Minor Changes

- caf257f: Add "Continue with Google" / "Continue with Microsoft" SSO buttons to the shared login UI. A new `SsoButtons` component fetches enabled providers from `GET /users/sso/providers` (MembershipApi), renders branded outlined buttons on the Login and Register cards, and starts the flow via a full-page redirect to `/users/sso/authorize/<provider>`. `LoginPage` now surfaces a `loginError` query param through the existing error display for SSO failures.

## 0.18.0

### Minor Changes

- 337a092: Add three church-data website-builder element types (contract + public renderers): `campaignProgress` (fund total vs. goal with animated progress bar, GivingApi), `staffGrid` (public group roster as photo/name/role cards, MembershipApi), and `serviceTimes` (schedule grouped by service with best-effort schema.org Event JSON-LD, AttendanceApi). All fetch in effects (SSR-safe), render nothing on public pages when empty and an editor-only hint when editing. Add two site-wide widget components with parse helpers: `AnnouncementBanner` (sticky dismissible bar with a date window, `parseAnnouncementConfig`) and `Launcher` (Nucleus-style floating action hub, `parseLauncherConfig`).
- 337a092: Add conversational (one-question-at-a-time) form mode. When a form's `displayMode` is `"conversational"`, `FormSubmissionEdit` renders questions one at a time with a progress indicator, Continue/Back navigation, Enter-to-advance, per-step required validation, and reduced-motion-aware transitions, instead of the full stacked form. Standard/absent `displayMode` is unchanged. Adds `displayMode` to `FormInterface` in `@churchapps/helpers`.
- 337a092: Add layout options to the `sermons` website element (`layout`: browse/grid/list/featuredLatest, plus `playlistId`, `itemCount`, `showTitles`, `showDates`) — the empty-answers default stays the legacy playlist browser. Add a shared `SectionDivider` component (SVG shape dividers: wave, waves, slant, curve, triangle, peaks) with a `parseDividerConfig` helper for wiring section top/bottom dividers.
- 337a092: Add six website-builder element types (contract + public renderers): `iconFeature` (icon + heading + text), `gallery` (photo grid/masonry with lightbox), `testimonial` (blockquote with optional auto-rotate), `socialIcons` (follow-link row with brand icons), `countdown` (fixed-date or weekly countdown timer, SSR-safe), and `stats` (count-up number row animated on scroll into view).

### Patch Changes

- 337a092: Raise announcement banner z-index above app-bar/drawer tiers so fixed transparent headers don't intercept its clicks.

## 0.17.6

### Patch Changes

- 91ccd1c: Fix the member donation form re-showing a stale error when re-previewing.

  `MultiGatewayDonationForm.handleSave` (the "Preview Donation" button) opened the preview modal without clearing the previous `errorMessage`. Because `ErrorMessages` re-opens its Snackbar whenever `props.errors` changes reference (and the parent passes a fresh `[errorMessage]` array on every render), re-previewing re-rendered the form and the old error toast popped up again — even after the donor fixed the problem (e.g. entered the missing postal code, which is captured in the isolated Stripe iframe and never clears the form's error state). `handleSave` now clears `errorMessage` before opening the preview, so each retry starts clean.

- 4530c1e: Guard against a null cropped canvas in `ImageEditor`.

  `Cropper.getCroppedCanvas()` returns `null` when the crop box has no area (e.g. a zero-size or not-yet-laid-out image), so calling `.toDataURL()` on it threw and crashed the editor. The crop preview now bails out when the canvas is null instead of dereferencing it.

- c49defa: Add pause/resume support for recurring donations, localize the recurrence editor, and extend a few interfaces.

  - New `pauseRecurring` provider capability (Stripe: true; Kingdom Funding and PayPal: false). `RecurringDonations` shows pause/resume buttons and a "Paused" badge for capable providers, calling the new GivingApi `/subscriptions/:id/pause` and `/subscriptions/:id/resume` endpoints, with new `donation.recurring.*` locale strings in all 28 languages.
  - `RRuleEditor` labels and aria text are now localized under `eventCalendar.recurring.*` (previously hard-coded English), and the never/count/until option handling uses `undefined` instead of `null as any`.
  - `FormSubmissionEdit` passes the saved submission to `updatedFunction` (parameter is optional, so existing callers are unaffected).
  - `@churchapps/helpers`: optional `FundInterface.visible` and `GroupInterface.archived` fields.

## 0.17.4

### Patch Changes

- 2198114: Fix donation portal error handling and a member "Add Card" crash.

  - **PaymentMethods**: adding a card via the member portal white-screened for Stripe churches. Stripe now exposes a `MemberEntry` (for inline donate), which made `usesTokenEntry` true and routed "Add Card" through the bare token dialog — rendering `useStripe()` with no `<Elements>` context. Stripe now correctly uses the `CardForm` + `<Elements>` path (token dialog is reserved for providers without a `MemberWrapper`, e.g. Kingdom Funding).
  - **MultiGatewayDonationForm**: the donation preview modal could hang with a stuck spinner if `finalizeResult` threw (3DS) or the charge response shape was unrecognized. The post-charge tail now always closes the modal and surfaces an error, and gateway error messages are cleaned (the human-readable reason is extracted instead of dumping the raw JSON response body to donors).
  - **CardForm**: hardened person field access (`person?.contactInfo?.email`, `person?.name?.display`) so a person record missing optional fields can't crash the add-card form.

## 0.17.3

### Patch Changes

- 1510e11: Fix donation portal freezing on charge errors. `MultiGatewayDonationForm` now catches API failures (4xx/5xx) and surfaces `results.error` bodies instead of leaving the preview modal stuck with no message (issue #928).

## 0.17.2

### Patch Changes

- d12226f: Kingdom Funding (NMI): fully reload Collect.js when toggling between card and ACH. Collect.js only honors one `configure()` per script load, so switching field sets previously left the bank/ACH form stuck on the loading spinner. A fail-safe timeout also prevents the spinner from hanging when the domain isn't whitelisted for the tokenization key.

## 0.17.1

### Patch Changes

- ff2e60a: Fix the member donation form crashing for non-Stripe gateways. `MultiGatewayDonationForm`'s shared inner unconditionally called Stripe's `useStripe()`, but only `StripeProvider` supplies an `<Elements>` context (Kingdom Funding and PayPal intentionally don't), so a Kingdom Funding / NMI church threw "Could not find Elements context; You need to wrap the part of your app that calls useStripe() in an `<Elements>` provider" and the form never rendered.

  The shared form now reads the Stripe instance through a neutral `StripeInstanceContext`/`useStripeInstance()` (default `null`); `StripeProvider.MemberWrapper` publishes the live instance from inside `<Elements>`. Non-Stripe providers no longer mount any Stripe components. Fixes the donation screen on Kingdom Funding churches (B1App `/mobile/donate`, B1Admin donation page); the Stripe member flow (including 3DS) is unchanged.

## 0.17.0

### Minor Changes

- 9111273: Kingdom Funding donations now tokenize via **NMI Collect.js** (replacing the Accept Blue hosted iframe) and support **ACH/bank** in addition to card. The member and guest donation forms gain a card/bank toggle, both routed through the single-use NMI `payment_token`; raw bank numbers no longer reach the backend. Saved methods are sent as `paymentMethodId`/`customerId` (the NMI customer vault id). The Kingdom Funding provider capabilities now expose `savedBank` and `guestAch`.

  Requires the matching Api change (the `kingdomfunding` gateway provider retargeted to NMI). No public API of the donations module changed for normal consumers — `MultiGatewayDonationForm`/`NonAuthDonation` pick up the updated provider automatically.

## 0.16.0

### Minor Changes

- e2e76b3: Stripe members with no saved card can now enter a card inline on the donation form. `StripeProvider` gains a `MemberEntry` widget that tokenizes the card and saves it via `/paymentmethods/addcard` (creating the customer), so the donation charges through the normal saved-method path and the card is saved on submit. Fixes the blank "Method" dropdown on the B1App `/mobile/donate` screen for first-time donors.

## 0.15.0

### Minor Changes

- 39e47d3: Image craft + responsive image performance for the website builder.

  apphelper:

  - New pluggable image-optimizer seam (`setImageOptimizer` / `responsiveImgProps` / `optimizedBackgroundImage`). Default is identity, so non-Next hosts (the Vite editor) render plain `<img>` unchanged; B1App registers a Next.js `getImageProps`-backed optimizer to emit `srcset`/`sizes` and WebP/AVIF backgrounds.
  - Content images (`image`, `card`, `textWithPhoto`, `logo`) now route their `src` through the seam; `logo` also gains the missing `loading="lazy" decoding="async"`.
  - `BoxElement` image backgrounds get optimized loading, a `focalPoint` (`background-position`), and an opt-in tint overlay (`.boxBG:before`, driven by `--overlay-color` / `--overlay-opacity`, default off).

  helpers:

  - Documented the new `box` answer keys (`focalPoint`, `overlayColor`, `backgroundOpacity`) in `ElementTypes`.

## 0.14.0

### Minor Changes

- ef2748d: Harden PayPal guest giving and add a capture-status helper.

  - PayPal guest donations now enforce reCAPTCHA before submitting (verification was being bypassed unconditionally).
  - A PayPal order that is only `CREATED` (not captured) is no longer treated as a successful donation — non-captured statuses now surface an error instead of a false thank-you screen.
  - The recurring option is no longer offered in the PayPal guest form; PayPal has no subscribe path (`capabilities.recurring === false`) and the toggle previously fell back to a silent one-time charge.
  - Added `DonationHelper.isPayPalCaptureComplete(status)`.
  - Removed the unused `PayPalCardForm` component and `PayPalCardData` type (dead code, not referenced by any consumer).

## 0.13.0

### Minor Changes

- a32228d: Introduce a client-side `PaymentProvider` registry so payment gateways are pluggable, mirroring the server's `GatewayFactory`. Each provider is a single adapter (capabilities + descriptor + charge-request builder + entry widget); the donor forms, guest flow, saved-payment-methods UI, and admin giving settings all resolve behavior from the registry instead of hard-coded `=== "stripe" | "paypal" | "kingdomfunding"` / `hasKF` / `isKingdomFunding` branches.

  - New exports from `@churchapps/apphelper/donations`: `getPaymentProvider`, `listPaymentProviders`, `registerPaymentProvider`, `hasPaymentProvider`, and the `PaymentProvider` types.
  - `MultiGatewayDonationForm` and `NonAuthDonation` are now provider-agnostic shells (tokenize → buildChargeRequest → finalizeResult).
  - `DonationHelper.isKingdomFunding` removed (use the registry); `provider` fields on `PaymentMethod`/`PaymentGateway`/`MultiGatewayDonationInterface`/`StripePaymentMethod` widened to `string`.
  - Adding a new gateway is one adapter file + one server `IGatewayProvider` impl — no edits to any shared form, page, or admin screen.

### Patch Changes

- e77266e: Remove the donor-facing payment-processor selector from the donation forms. The payment gateway is a church setting, not a donor choice, so `NonAuthDonation` and `MultiGatewayDonationForm` now always use the church's configured gateway instead of rendering a Stripe/PayPal/Kingdom Funding picker.

## 0.12.0

### Minor Changes

- e733fd2: Add Kingdom Funding payment gateway support to the donations module (card flows; ACH scaffolded but disabled).

## 0.11.0

### Minor Changes

- 5e77858: Per-device visibility for website elements.

  - `Element` wrappers emit `hiddenOnDesktop` / `hiddenOnMobile` classes when `styles.desktop.display` / `styles.mobile.display` is `"none"` (live render only; editors keep the classes on the inner `elementWrapper` so they can dim instead of hide).
  - `StyleHelper.getCss` appends the matching `display: none !important` utility rules (media-queried, or unwrapped under `forceDevice`), covering element types that render no `el-{id}` and public sections whose ids are stripped from the tree response.
  - The same utility rules ship in `website/styles/pages.css` (vendored into B1App on postinstall) so section-level hiding works even where the generated CSS is unavailable.

### Patch Changes

- 5e77858: Website builder element fixes.

  - apphelper: the Groups Browser element's "show search" / "show category" toggles now honor the string `"false"` the editor has always stored, instead of only the never-stored boolean — the toggles were previously inert.
  - apphelper: map element coerces `mapZoom` to a number before passing it to Google Maps (string values threw `setZoom: not a number`).
  - helpers: card element's default `titleAlignment` is now `center`, matching the renderer's long-standing fallback for cards saved without an explicit value.

## 0.10.0

### Minor Changes

- e8cb38b: Website builder element-type contract and renderer registry.

  - helpers: new `ElementTypes` catalog (canonical answers schemas, defaults, categories, and schemaVersion for all element types) and `validateElementAnswers()` for type-level server/client validation of answersJSON.
  - apphelper: new `ElementRegistry` (`registerElementRenderer`/`getElementRenderer`) replacing the hardcoded switch in `Element.tsx`; apps can override or add element renderers without forking the dispatch. Unknown element types now show a visible notice in edit mode instead of rendering an empty div.
  - apphelper: content images (`image`, `card`, `textWithPhoto` elements) now render with `loading="lazy"` and `decoding="async"`.

## 0.9.0

### Minor Changes

- afebf7e: Canonical `FileUpload` component in apphelper and `FileInterface` in helpers, replacing the per-app copies that had drifted across B1Admin, B1App, B1Mobile, and LessonsApp.
- afebf7e: `@churchapps/helpers` is now a peerDependency instead of a regular dependency, so consuming apps resolve exactly one copy (ApiHelper config state is a singleton). Consumers that relied on the transitive copy must add `@churchapps/helpers` to their own dependencies.
