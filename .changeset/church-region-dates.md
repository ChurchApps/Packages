---
"@churchapps/helpers": minor
"@churchapps/apphelper": patch
---

DateHelper follows a per-church region (`DateHelper.setLocale("en-GB")`) for prettyDate, prettyDateTime, prettyTime and getShortDate via Intl. Unset or en-US keeps the existing output. Website sermon, podcast and stream dates use the same region.
