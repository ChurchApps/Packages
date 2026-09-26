# Packages

Shared `@churchapps/*` npm packages, managed as a single Yarn workspace and released with [changesets](https://github.com/changesets/changesets).

## The packages

| Package | Layer | What belongs here |
|---------|-------|-------------------|
| `@churchapps/helpers` | 0 — foundation | Pure TypeScript: interfaces (the cross-app data contract) and framework-free helper functions. No React, no Express, no AWS. |
| `@churchapps/apihelper` | 1 — server | Express/Inversify API infrastructure: auth, base controllers, DB pooling, AWS, email, logging, Environment config loading. |
| `@churchapps/apphelper` | 1 — web UI | React feature blocks with stable contracts (login, donations, forms, markdown editor, website builder) plus the small set of genuinely shared components. |
| `@churchapps/content-providers` | leaf | Third-party content provider abstraction (zero runtime deps). |
| `@churchapps/integration-sdk` | leaf | B1.church integration toolkit: webhooks, REST client, OAuth (zero runtime deps). |
| `@churchapps/texting` | leaf | SMS provider abstraction. |

Dependency direction is strictly downward: apps → layer 1 → helpers. Layer-1 packages declare `@churchapps/helpers` as a **peerDependency** so each app resolves exactly one copy (ApiHelper config state is a singleton); never move it back to `dependencies`.

## What earns a spot in a shared package

Code moves here only when it has **two or more real consumers today** and a **stable contract**. "Might be reusable someday" stays in the app that owns it — extracting later is cheap, premature extraction is how shims and forks happen. Page-level UI stays in the apps; only self-contained feature blocks belong in apphelper.

## Releasing

Versioning is tracked with changesets; **publishing is automatic**. Every push to `main` runs `.github/workflows/release.yml`, which consumes pending changesets, pushes a `Version packages` commit back to `main`, and publishes the bumped packages to npm via trusted publishing (OIDC, with provenance). Nobody publishes from a laptop, and no npm token exists.

### With every change

Run `yarn changeset` at the root. Pick the package(s) you touched, the bump type (patch = fix, minor = new export/feature, major = breaking), and write a one-line summary — it becomes the CHANGELOG entry. Commit the generated `.changeset/*.md` file together with your code change. Merging to `main` releases it; `yarn changeset status` shows what's pending.

This is **enforced by a pre-commit hook** (`.githooks/pre-commit`, activated by `postinstall` setting `core.hooksPath`): committing staged changes to any package's `src/`, `public/`, or `package.json` without a staged changeset file is blocked. For changes that genuinely don't affect published behavior, bypass with `git commit --no-verify`. (On macOS/Linux clones, give the hook the executable bit once: `chmod +x .githooks/pre-commit`.)

Notes:
- Pull after merging — the release job pushes the `Version packages` commit (bumps, CHANGELOGs, lockfile, deleted changesets) to `main`.
- The publish step is idempotent: it skips versions already on the registry, so re-run the workflow after a partial failure.
- Internal dependents are bumped automatically (e.g. a `helpers` release patch-bumps `apihelper`/`apphelper` so their ranges stay current).
- Each package's trusted publisher on npmjs.com names `ChurchApps/Packages` + `release.yml`. Renaming the workflow file breaks publishing until those are updated (`npm trust list <pkg>`).
- Don't publish locally (`yarn release`, `npm publish`). If CI is down and a release can't wait, `yarn publish-all` still works with an npm login + 2FA — then push the version commit yourself.

## Deprecation rule

Never remove or rename an export until **both** are true:

1. The replacement is published.
2. Every consumer in the workspace has been migrated (grep all repos before merging the removal).

Removing an export with a half-finished "moved to X" migration has broken consumer builds before (apphelper 0.8.0). Don't repeat it.

## Local development against a consuming app

Inside this workspace, packages already build against their siblings — no linking needed. To test an unpublished package build inside a consuming app (B1Admin, B1App, …), use a temporary Yarn portal in the consumer:

```bash
# in the consuming project
yarn link ../Packages/helpers          # adds a portal resolution to package.json
# ... test ...
yarn unlink ../Packages/helpers && yarn install
```

Never commit portal/resolution entries, and never copy package source into an app as a "temporary" shim. If you must ship before a package release, the changesets flow makes a release cheap — do that instead.

## Conventions

- Yarn Berry 4 (root `packageManager` is authoritative); single root lockfile and `.yarnrc.yml`.
- Build everything: `yarn build` (topological). Tests: `yarn test`.
- The exported `VERSION` constants are injected from package.json at build time — don't hardcode them.
- New shared interfaces go in `helpers/src/interfaces/` and are re-exported through its barrel; apphelper re-exports the ones its components use.
