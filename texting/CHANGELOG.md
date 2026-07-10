# @churchapps/texting

## 0.3.0

### Minor Changes

- 33943af: Add MinistryStuff provider: flat-rate credit texting via MinistryStuffApi (X-Service-Key server-to-server auth, /sms/send, /sms/sendBulk, /check/credits with insufficient_credits surfaced per recipient); add tsx --test suite to the package

### Patch Changes

- 40aa620: Unify TypeScript to 6.0.3 across the workspace (tsconfig TS6 fixes: apihelper rootDir, ignoreDeprecations in tsup packages, texting node types); add unit test suites to helpers and apihelper via tsx --test; fix lint errors in apphelper calendar/markdown components

## 0.2.2

### Patch Changes

- 96e5726: Clean up package source for stricter linting and TypeScript builds, including unused import removal, simplified helper comments, and minor internal typing/formatting updates across app helpers, content providers, SDK clients, environment helpers, and texting exports.

## 0.2.1

### Patch Changes

- afebf7e: The exported `VERSION` constant is now injected from package.json at build time instead of being hardcoded (it had drifted several releases behind).
