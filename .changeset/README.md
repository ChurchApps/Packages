# Changesets

Every PR that changes a package's published behavior must include a changeset:

```bash
yarn changeset
```

Pick the affected package(s), choose patch/minor/major, write a one-line summary, and commit
the generated file with your change. Merging to `main` releases it: the Release workflow versions,
commits, and publishes via npm trusted publishing. Full instructions in the root README.

Docs: https://github.com/changesets/changesets
