---
"@churchapps/apphelper": patch
---

apphelper: fix website-builder fonts not applying consistently (#977). The page-builder editor's Google Fonts loader built its URL with a non-global `replace(" ", "+")`, so any font family with more than two words (e.g. "IBM Plex Sans", "Big Shoulders Text" — all selectable from the full Google Fonts catalog) produced a malformed request that silently failed and fell back to the default font; it also only requested weight 400, so bold text got browser-synthesized faux bold instead of the real weight. `Theme` now matches the published-site renderer: global space replacement and `:wght@400;700`. The `pages.css` heading-font rule was also extended from `h1`-`h4` to include `h5`/`h6`, so FAQ titles and other h5/h6 content pick up the chosen heading font rather than falling back to the body font.
