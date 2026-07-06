---
"@churchapps/apphelper": patch
---

Fix Kingdom Funding (Collect.js) fields rendering at 0px height. Toggle field visibility with `visibility` instead of `display:none` so Collect.js measures a real height at init, pin the iframe/field box height, and null out the script's `onload`/`onerror` on cleanup to avoid a stale script configuring the wrong field set after a remount.
