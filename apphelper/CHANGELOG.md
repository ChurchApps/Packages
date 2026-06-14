# @churchapps/apphelper

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
