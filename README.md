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

Versioning is tracked with changesets; **publishing to npm is manual and local** (nothing in CI publishes).

### With every change

Run `yarn changeset` at the root. Pick the package(s) you touched, the bump type (patch = fix, minor = new export/feature, major = breaking), and write a one-line summary — it becomes the CHANGELOG entry. Commit the generated `.changeset/*.md` file together with your code change (VS Code as usual). Changesets accumulate across commits until you release; `yarn changeset status` shows what's pending.

This is **enforced by a pre-commit hook** (`.githooks/pre-commit`, activated by `postinstall` setting `core.hooksPath`): committing staged changes to any package's `src/`, `public/`, or `package.json` without a staged changeset file is blocked. For changes that genuinely don't affect published behavior, bypass with `git commit --no-verify`. (On macOS/Linux clones, give the hook the executable bit once: `chmod +x .githooks/pre-commit`.)

### When ready to publish

```bash
yarn publish-all
```

That runs two steps you can also invoke separately:
- `yarn version-packages` — consumes pending changesets: bumps package.json versions, writes CHANGELOGs, syncs internal dep ranges, updates yarn.lock
- `yarn release` — builds everything in dependency order, then publishes the bumped packages to npm (uses your npm login; no git tags)

Then commit and push everything in VS Code (the version bumps, CHANGELOGs, lockfile, and deleted changeset files) with a message like `Version packages`. Publishing before committing is fine — npm reads what's on disk, and `--no-git-tag` means nothing touches git. (The pre-commit hook accepts this commit because the consumed `.changeset/*.md` deletions are staged.)

Notes:
- `npm whoami` must show an account with publish rights to `@churchapps`.
- `yarn release` is idempotent: it skips packages already published at their current version, so if a build fails halfway, fix and re-run.
- Internal dependents are bumped automatically (e.g. a `helpers` release patch-bumps `apihelper`/`apphelper` so their ranges stay current).
- Don't run raw `npm publish` inside a single package — it skips build ordering and the version bookkeeping `yarn release` handles.

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
