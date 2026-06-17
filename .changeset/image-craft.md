---
"@churchapps/apphelper": minor
"@churchapps/helpers": patch
---

Image craft + responsive image performance for the website builder.

apphelper:
- New pluggable image-optimizer seam (`setImageOptimizer` / `responsiveImgProps` / `optimizedBackgroundImage`). Default is identity, so non-Next hosts (the Vite editor) render plain `<img>` unchanged; B1App registers a Next.js `getImageProps`-backed optimizer to emit `srcset`/`sizes` and WebP/AVIF backgrounds.
- Content images (`image`, `card`, `textWithPhoto`, `logo`) now route their `src` through the seam; `logo` also gains the missing `loading="lazy" decoding="async"`.
- `BoxElement` image backgrounds get optimized loading, a `focalPoint` (`background-position`), and an opt-in tint overlay (`.boxBG:before`, driven by `--overlay-color` / `--overlay-opacity`, default off).

helpers:
- Documented the new `box` answer keys (`focalPoint`, `overlayColor`, `backgroundOpacity`) in `ElementTypes`.
