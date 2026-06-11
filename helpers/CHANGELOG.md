# @churchapps/helpers

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
