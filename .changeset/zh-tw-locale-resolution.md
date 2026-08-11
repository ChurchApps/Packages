---
"@churchapps/apphelper": patch
---

apphelper: make the new zh-TW locale rollout-safe and fix locale resolution generally (#14). `Locale.init()` now loads `zh.json` alongside `zh-TW.json` and configures i18next with `fallbackLng: { "zh-TW": ["zh", "en"], default: ["en"] }`, so a consuming app that has not shipped a `zh-TW.json` yet — or has shipped a partial one — degrades to Simplified Chinese instead of English. Without this, adding `zh-TW` to `supportedLanguages` would have flipped every zh-TW/zh-HK/zh-MO/zh-Hant browser from a full Chinese UI to a full English one the moment the app picked up the new version. Traditional Chinese subtag matching is also now case-insensitive, so a non-canonical `zh-tw` or `ZH-HANT` still resolves correctly.

The mapping was previously inert for everything except a literal `zh-TW` browser tag: i18next detected the raw `navigator.language`, so a `zh-HK` browser resolved to `zh-HK` → `zh` → English and never touched the `zh-TW` resource that had just been fetched. The same mismatch meant `nb-NO` never reached the `no` locale file despite the `extraCodes` mapping. `init()` now passes the mapped locale to i18next as `lng` directly, and the `i18next-browser-languagedetector` plugin is dropped — detection order was `navigator`-only and its localStorage cache was never read.
