---
"@churchapps/content-providers": patch
---

Refresh tokens with a proportional expiry buffer and single-flight so short-lived JWTs and concurrent refreshes don't drop the session.
