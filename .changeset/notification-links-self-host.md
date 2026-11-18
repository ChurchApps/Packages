---
"@churchapps/apphelper": patch
---

Notifications: "View Details" and task/assignment links open on the configured B1 and B1 Admin roots (`CommonEnvironmentHelper.B1Root` / `B1AdminRoot`) instead of hardcoded `<subDomain>.b1.church` and `admin.b1.church`, so self-hosted installs link to their own domain.
