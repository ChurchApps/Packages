---
"@churchapps/apihelper": minor
"@churchapps/apphelper": minor
---

`@churchapps/helpers` is now a peerDependency instead of a regular dependency, so consuming apps resolve exactly one copy (ApiHelper config state is a singleton). Consumers that relied on the transitive copy must add `@churchapps/helpers` to their own dependencies.
