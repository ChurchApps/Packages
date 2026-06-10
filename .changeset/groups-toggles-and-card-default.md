---
"@churchapps/apphelper": patch
"@churchapps/helpers": patch
---

Website builder element fixes.

- apphelper: the Groups Browser element's "show search" / "show category" toggles now honor the string `"false"` the editor has always stored, instead of only the never-stored boolean — the toggles were previously inert.
- apphelper: map element coerces `mapZoom` to a number before passing it to Google Maps (string values threw `setZoom: not a number`).
- helpers: card element's default `titleAlignment` is now `center`, matching the renderer's long-standing fallback for cards saved without an explicit value.
