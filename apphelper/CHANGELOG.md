# @churchapps/apphelper

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
