# @churchapps/apihelper

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
