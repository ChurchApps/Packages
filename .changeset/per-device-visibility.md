---
"@churchapps/apphelper": minor
---

Per-device visibility for website elements.

- `Element` wrappers emit `hiddenOnDesktop` / `hiddenOnMobile` classes when `styles.desktop.display` / `styles.mobile.display` is `"none"` (live render only; editors keep the classes on the inner `elementWrapper` so they can dim instead of hide).
- `StyleHelper.getCss` appends the matching `display: none !important` utility rules (media-queried, or unwrapped under `forceDevice`), covering element types that render no `el-{id}` and public sections whose ids are stripped from the tree response.
- The same utility rules ship in `website/styles/pages.css` (vendored into B1App on postinstall) so section-level hiding works even where the generated CSS is unavailable.
