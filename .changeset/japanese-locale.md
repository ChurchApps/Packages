---
"@churchapps/apphelper": minor
---

Add Japanese (`ja`) to the supported languages so `ja-*` browsers load the ja locale files instead of falling back to English, and repair the locale JSON files, which were stored double-encoded (UTF-8 read back as windows-1252). Every non-ASCII language was affected — Japanese rendered as `ã‚­ãƒ£ãƒ³ã‚»ãƒ«`, Spanish as `NÃºmero de Cuenta`, German as `SchlieÃŸen`. `ja.json` is also filled out to full coverage.
