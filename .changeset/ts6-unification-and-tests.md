---
"@churchapps/apihelper": patch
"@churchapps/apphelper": patch
"@churchapps/content-providers": patch
"@churchapps/helpers": patch
"@churchapps/integration-sdk": patch
"@churchapps/texting": patch
---

Unify TypeScript to 6.0.3 across the workspace (tsconfig TS6 fixes: apihelper rootDir, ignoreDeprecations in tsup packages, texting node types); add unit test suites to helpers and apihelper via tsx --test; fix lint errors in apphelper calendar/markdown components
