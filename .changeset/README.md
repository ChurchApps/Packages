# Changesets

Every PR that changes a package's published behavior must include a changeset:

```bash
yarn changeset
```

Pick the affected package(s), choose patch/minor/major, write a one-line summary, and commit
the generated file with your change. To release: `yarn version-packages`, then `yarn release`,
then commit the version bumps. Full instructions in the root README. Never run raw `npm publish`
in a single package — `yarn release` handles build order and skips already-published versions.

Docs: https://github.com/changesets/changesets
