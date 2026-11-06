---
"@churchapps/content-providers": patch
---

Go Curriculum: age groups now open only for members whose memberships include them. A Preschool-only member no longer sees Elementary at the root, by path, or in getCatalog (which returns an empty catalog for that group), and a login with no recognized membership sees nothing.
