---
"@churchapps/apphelper": patch
---

Harden client URLs: sanitize CustomLinkNode hrefs, scheme-check notification links, block `/\` login returnUrls, pass cross-app JWTs in the URL fragment instead of the query string, and encode map addresses.
