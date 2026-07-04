# @churchapps/apphelper

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
