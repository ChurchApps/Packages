---
"@churchapps/helpers": minor
"@churchapps/apihelper": patch
"@churchapps/apphelper": patch
---

Enable full TypeScript strict mode across helpers, apihelper, and apphelper (tech-debt audit item 3). All three packages now extend a shared `tsconfig.base.json` that ships in the helpers package, so consuming apps can opt in via `"extends": "@churchapps/helpers/tsconfig.base.json"`. Fixes are type-level and behavior-preserving; notable declaration changes: `ApiHelper.onRequest`/`onError` are now optional, and several component props/state types widened to `| null` to reflect actual runtime values.
