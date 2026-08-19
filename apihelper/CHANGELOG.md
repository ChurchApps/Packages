# @churchapps/apihelper

## 1.1.2

### Patch Changes

- 4f75024: Fail closed on JWT algorithm, escape email app name/url, treat SVG as private S3 content, and set Secure + 2-day JWT cookies.

## 1.1.1

### Patch Changes

- c99e812: Guard local disk store paths against directory traversal.
- 4393391: Constrain S3 uploads: the server pins Content-Type and a content-length-range on presigned POSTs and chooses the ACL itself (a client-supplied ACL is ignored). Only allowlisted media types get `public-read`; every other type uploads to a private object rather than being rejected.

## 1.1.0

### Minor Changes

- 719a2ef: Bring-Your-Own-Storage support. `PresignedPostData` gains optional `method`, `headers`, `rawBody`, `chunkSize` and `externalIdField` so storage providers can presign raw-body PUT/POST and chunked-session uploads (Google Drive, Dropbox, OneDrive, S3-compatible), and `IStorageProvider` gains optional `getDownloadUrl` for minting short-lived download links. New `FileHelper.uploadPresignedFile` handles every presign shape client-side (legacy form-POST unchanged, raw-body, chunked) and returns the provider file id; `FileInterface` carries `provider`/`externalId`. `FileUpload` now sends `size`/`mimeType` with postUrl requests (fixes provider presigns), registers the returned `externalId`, and surfaces `storage_quota_exceeded` errors. All changes are additive and backward compatible.

## 1.0.0

### Patch Changes

- bffd124: Publish the `StorageProviderFactory` export (already in source but missing from the published 0.8.0). Consumers such as Api's `StorageResolver` import it, and the stale published build threw at module load, unregistering the whole content module and 404ing every `/content/*` route.
- Updated dependencies [289b504]
  - @churchapps/helpers@2.0.0

## 0.8.0

### Minor Changes

- 33943af: Add a pluggable storage-provider seam: new `IStorageProvider` interface (store/getUploadUrl/remove/removeFolder/list/move + optional confirmUpload/getQuota, `PresignedPostData`/`StorageQuota` types), `ChurchAppsStorageProvider` wrapping the existing S3/local-disk behavior verbatim, and `StorageProviderFactory` registry (register/getProvider/getDefault, seeded with "churchapps"). `FileStorageHelper` keeps its exact public API but now delegates to the default provider; existing call sites are unaffected. Enables external storage providers (e.g. MinistryStuff) to be registered by host apps.

### Patch Changes

- 40aa620: Unify TypeScript to 6.0.3 across the workspace (tsconfig TS6 fixes: apihelper rootDir, ignoreDeprecations in tsup packages, texting node types); add unit test suites to helpers and apihelper via tsx --test; fix lint errors in apphelper calendar/markdown components

## 0.7.2

### Patch Changes

- b89a2c7: Enable full TypeScript strict mode across helpers, apihelper, and apphelper (tech-debt audit item 3). All three packages now extend a shared `tsconfig.base.json` that ships in the helpers package, so consuming apps can opt in via `"extends": "@churchapps/helpers/tsconfig.base.json"`. Fixes are type-level and behavior-preserving; notable declaration changes: `ApiHelper.onRequest`/`onError` are now optional, and several component props/state types widened to `| null` to reflect actual runtime values.

## 0.7.1

### Patch Changes

- 96e5726: Clean up package source for stricter linting and TypeScript builds, including unused import removal, simplified helper comments, and minor internal typing/formatting updates across app helpers, content providers, SDK clients, environment helpers, and texting exports.

## 0.7.0

### Minor Changes

- afebf7e: `EnvironmentBase.initBase(environment, { appName, configDir?, fileMap? })` resolves config/<env>.json (locally and in Lambda), parses it, runs populateBase, and returns the parsed data — replacing the config-file boilerplate previously duplicated in every API's Environment.ts.
- afebf7e: `@churchapps/helpers` is now a peerDependency instead of a regular dependency, so consuming apps resolve exactly one copy (ApiHelper config state is a singleton). Consumers that relied on the transitive copy must add `@churchapps/helpers` to their own dependencies.
