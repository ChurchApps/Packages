# @churchapps/helpers

## 1.11.1

### Patch Changes

- 030b4d9: content-providers: remove the hardcoded GoCurriculum OAuth clientSecret from the published bundle; hosts now inject it at startup via the new `setProviderSecret("gocurriculum", secret)` export (FreePlay uses EXPO_PUBLIC_GOCURRICULUM_CLIENT_SECRET, Api uses GOCURRICULUM_CLIENT_SECRET). helpers: UserHelper.selectChurch now propagates context.setUser/setPerson after a church switch, adds a userChurches guard; FileHelper.postPresignedFile drops the duplicate "key" form field (matches the live upload flows; no existing callers). apphelper: delete the 8 shadow-duplicated local helper files and route internal components (GalleryModal, SiteHeader, ChurchList) through @churchapps/helpers — note dist/helpers/\* deep-import paths for those files no longer exist.
- 40aa620: Unify TypeScript to 6.0.3 across the workspace (tsconfig TS6 fixes: apihelper rootDir, ignoreDeprecations in tsup packages, texting node types); add unit test suites to helpers and apihelper via tsx --test; fix lint errors in apphelper calendar/markdown components

## 1.11.0

### Minor Changes

- b89a2c7: Enable full TypeScript strict mode across helpers, apihelper, and apphelper (tech-debt audit item 3). All three packages now extend a shared `tsconfig.base.json` that ships in the helpers package, so consuming apps can opt in via `"extends": "@churchapps/helpers/tsconfig.base.json"`. Fixes are type-level and behavior-preserving; notable declaration changes: `ApiHelper.onRequest`/`onError` are now optional, and several component props/state types widened to `| null` to reflect actual runtime values.

## 1.10.1

### Patch Changes

- 96e5726: Clean up package source for stricter linting and TypeScript builds, including unused import removal, simplified helper comments, and minor internal typing/formatting updates across app helpers, content providers, SDK clients, environment helpers, and texting exports.

## 1.10.0

### Minor Changes

- b663fad: Phase 4 member features: add `EventRsvpInterface` and `EventInterface.rsvpDisabled` (GR-1 event RSVP), `GroupInterface.confidential` (confidential groups), `MessageInterface.reactions` + `MessageReactionSummaryInterface`, and the `"reaction"` socket action on `SocketPayloadAction` (chat reactions realtime protocol).
- b663fad: Add Phase 2 paid-registration interfaces: RegistrationType, RegistrationSelection, RegistrationSelectionChoice, RegistrationPayment, and RegistrationCoupon, plus new fields on RegistrationInterface (totalAmount, amountPaid, couponId, waitlistNotifiedDate, selectionChoices, payments), RegistrationMemberInterface (registrationTypeId), and EventInterface (waitlistEnabled).

## 1.9.2

### Patch Changes

- 8c026c9: Add age/grade fields to membership interfaces: `grade`/`school` on `PersonInterface` and `minAgeMonths`/`maxAgeMonths`/`minGrade`/`maxGrade` on `GroupInterface`.

## 1.9.0

### Minor Changes

- 337a092: Add three church-data website-builder element types (contract + public renderers): `campaignProgress` (fund total vs. goal with animated progress bar, GivingApi), `staffGrid` (public group roster as photo/name/role cards, MembershipApi), and `serviceTimes` (schedule grouped by service with best-effort schema.org Event JSON-LD, AttendanceApi). All fetch in effects (SSR-safe), render nothing on public pages when empty and an editor-only hint when editing. Add two site-wide widget components with parse helpers: `AnnouncementBanner` (sticky dismissible bar with a date window, `parseAnnouncementConfig`) and `Launcher` (Nucleus-style floating action hub, `parseLauncherConfig`).
- 337a092: Add conversational (one-question-at-a-time) form mode. When a form's `displayMode` is `"conversational"`, `FormSubmissionEdit` renders questions one at a time with a progress indicator, Continue/Back navigation, Enter-to-advance, per-step required validation, and reduced-motion-aware transitions, instead of the full stacked form. Standard/absent `displayMode` is unchanged. Adds `displayMode` to `FormInterface` in `@churchapps/helpers`.
- 337a092: Add layout options to the `sermons` website element (`layout`: browse/grid/list/featuredLatest, plus `playlistId`, `itemCount`, `showTitles`, `showDates`) — the empty-answers default stays the legacy playlist browser. Add a shared `SectionDivider` component (SVG shape dividers: wave, waves, slant, curve, triangle, peaks) with a `parseDividerConfig` helper for wiring section top/bottom dividers.
- 337a092: Add six website-builder element types (contract + public renderers): `iconFeature` (icon + heading + text), `gallery` (photo grid/masonry with lightbox), `testimonial` (blockquote with optional auto-rotate), `socialIcons` (follow-link row with brand icons), `countdown` (fixed-date or weekly countdown timer, SSR-safe), and `stats` (count-up number row animated on scroll into view).

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
