---
"@churchapps/content-providers": minor
---

Trim the content-providers utility surface to what consumers actually use.

Breaking:
- Removed the duration-estimation module (`estimateDuration`, `estimateImageDuration`, `estimateTextDuration`, `countWords`, `DEFAULT_DURATION_CONFIG`, `DurationEstimationConfig`). The never-used text-estimation code is gone; image duration is now a single internal `IMAGE_DURATION_SECONDS = 15` constant.
- Removed the path helpers `buildPath`, `appendToPath`, and `generatePath` — no consumer or internal caller used them.
- Stopped exporting internal-only utilities from the package root: `detectMediaType`, `isMediaFile`, `createFolder`, `createFile`, `parsePath`, `getSegment`, and the `OAuthHelper` / `DeviceFlowHelper` / `ApiHelper` classes. They're still used internally — just no longer part of the public API. `TokenHelper` and `navigateToPath` remain exported.
