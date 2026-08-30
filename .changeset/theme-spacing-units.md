---
"@churchapps/apphelper": patch
---

Website Theme now emits spacing tokens with units (`--spacing-md: 16px` instead of `16`) so saved numeric spacing scales produce valid declarations, and renders `customCss` as a sibling of `:root` rather than nesting it inside.
