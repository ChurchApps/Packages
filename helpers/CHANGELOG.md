# @churchapps/helpers

## 1.8.4

### Patch Changes

- c49defa: Add pause/resume support for recurring donations, localize the recurrence editor, and extend a few interfaces.

  - New `pauseRecurring` provider capability (Stripe: true; Kingdom Funding and PayPal: false). `RecurringDonations` shows pause/resume buttons and a "Paused" badge for capable providers, calling the new GivingApi `/subscriptions/:id/pause` and `/subscriptions/:id/resume` endpoints, with new `donation.recurring.*` locale strings in all 28 languages.
  - `RRuleEditor` labels and aria text are now localized under `eventCalendar.recurring.*` (previously hard-coded English), and the never/count/until option handling uses `undefined` instead of `null as any`.
  - `FormSubmissionEdit` passes the saved submission to `updatedFunction` (parameter is optional, so existing callers are unaffected).
  - `@churchapps/helpers`: optional `FundInterface.visible` and `GroupInterface.archived` fields.

## 1.8.2

### Patch Changes

- 99f0fa9: Remove the unused `prayerRequest` member from the `SocketPayloadAction` union — a leftover of the removed live-stream "Request Prayer" chat feature. Nothing emitted or handled it, so there is no runtime impact.

## 1.8.1

### Patch Changes

- 39e47d3: Image craft + responsive image performance for the website builder.

  apphelper:

  - New pluggable image-optimizer seam (`setImageOptimizer` / `responsiveImgProps` / `optimizedBackgroundImage`). Default is identity, so non-Next hosts (the Vite editor) render plain `<img>` unchanged; B1App registers a Next.js `getImageProps`-backed optimizer to emit `srcset`/`sizes` and WebP/AVIF backgrounds.
  - Content images (`image`, `card`, `textWithPhoto`, `logo`) now route their `src` through the seam; `logo` also gains the missing `loading="lazy" decoding="async"`.
  - `BoxElement` image backgrounds get optimized loading, a `focalPoint` (`background-position`), and an opt-in tint overlay (`.boxBG:before`, driven by `--overlay-color` / `--overlay-opacity`, default off).

  helpers:

  - Documented the new `box` answer keys (`focalPoint`, `overlayColor`, `backgroundOpacity`) in `ElementTypes`.

## 1.8.0

### Minor Changes

- e24f75b: Add pledge campaign interfaces (CampaignInterface, PledgeInterface, PledgeStatus, PledgeProgressRowInterface, CampaignProgressInterface, MyPledgeInterface) for the GivingApi pledge campaigns feature.
- e24f75b: Add attendanceReminders flag to GroupInterface (per-group leader attendance-reminder emails, roadmap 3.6).

## 1.7.1

### Patch Changes

- 5e77858: Website builder element fixes.

  - apphelper: the Groups Browser element's "show search" / "show category" toggles now honor the string `"false"` the editor has always stored, instead of only the never-stored boolean — the toggles were previously inert.
  - apphelper: map element coerces `mapZoom` to a number before passing it to Google Maps (string values threw `setZoom: not a number`).
  - helpers: card element's default `titleAlignment` is now `center`, matching the renderer's long-standing fallback for cards saved without an explicit value.

## 1.7.0

### Minor Changes

- e8cb38b: Website builder element-type contract and renderer registry.

  - helpers: new `ElementTypes` catalog (canonical answers schemas, defaults, categories, and schemaVersion for all element types) and `validateElementAnswers()` for type-level server/client validation of answersJSON.
  - apphelper: new `ElementRegistry` (`registerElementRenderer`/`getElementRenderer`) replacing the hardcoded switch in `Element.tsx`; apps can override or add element renderers without forking the dispatch. Unknown element types now show a visible notice in edit mode instead of rendering an empty div.
  - apphelper: content images (`image`, `card`, `textWithPhoto` elements) now render with `loading="lazy"` and `decoding="async"`.

## 1.6.1

### Patch Changes

- 50cd16c: ApiHelper is properly typed as ApiHelperClass again — the singleton accessor's missing return annotation made the published declaration `ApiHelper: any`, which broke contextual typing of response callbacks in consumers.

## 1.6.0

### Minor Changes

- afebf7e: Canonical `FileUpload` component in apphelper and `FileInterface` in helpers, replacing the per-app copies that had drifted across B1Admin, B1App, B1Mobile, and LessonsApp.
