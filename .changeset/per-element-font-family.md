---
"@churchapps/apphelper": patch
---

apphelper: make per-element font choices actually work in the website builder (#977). Setting "Font Family" on an individual element (e.g. a Text element) emitted `#el-{id} { font-family: X }` but nothing ever fetched that family from Google Fonts — only the global heading/body fonts were loaded — so the element silently fell back to the default and looked unchanged. `StyleHelper` now exposes `getFontFamilies(sections)` and `getFontUrls(sections)`, which collect the distinct font families used by section and element styles (skipping system fonts and `var(--…)` tokens) and build one Google Fonts url per family, so an unrecognized name only fails its own request instead of every font on the page. Hosts render those urls as stylesheet links alongside the generated CSS.

Separately, an element's font now also applies to headings inside it: `pages.css` matches `.page h1`-`h6` directly and a directly-matched rule beats an inherited one, so the wrapper's `font-family` never reached headings within the element — body text changed while headings did not. `getStyle` emits a companion `#el-{id} h1…h6` rule whenever an element sets a font.
