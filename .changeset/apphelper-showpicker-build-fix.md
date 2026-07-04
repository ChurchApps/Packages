---
"@churchapps/apphelper": patch
---

Fix build: remove stale `@ts-expect-error` directives on `HTMLInputElement.showPicker` (now present in the TS lib defs), which triggered TS2578 and broke the topological package build.
