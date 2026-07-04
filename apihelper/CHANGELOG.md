# @churchapps/apihelper

## 0.7.1

### Patch Changes

- 96e5726: Clean up package source for stricter linting and TypeScript builds, including unused import removal, simplified helper comments, and minor internal typing/formatting updates across app helpers, content providers, SDK clients, environment helpers, and texting exports.

## 0.7.0

### Minor Changes

- afebf7e: `EnvironmentBase.initBase(environment, { appName, configDir?, fileMap? })` resolves config/<env>.json (locally and in Lambda), parses it, runs populateBase, and returns the parsed data — replacing the config-file boilerplate previously duplicated in every API's Environment.ts.
- afebf7e: `@churchapps/helpers` is now a peerDependency instead of a regular dependency, so consuming apps resolve exactly one copy (ApiHelper config state is a singleton). Consumers that relied on the transitive copy must add `@churchapps/helpers` to their own dependencies.
