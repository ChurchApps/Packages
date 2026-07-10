---
"@churchapps/content-providers": minor
"@churchapps/helpers": patch
"@churchapps/apphelper": patch
---

content-providers: remove the hardcoded GoCurriculum OAuth clientSecret from the published bundle; hosts now inject it at startup via the new `setProviderSecret("gocurriculum", secret)` export (FreePlay uses EXPO_PUBLIC_GOCURRICULUM_CLIENT_SECRET, Api uses GOCURRICULUM_CLIENT_SECRET). helpers: UserHelper.selectChurch now propagates context.setUser/setPerson after a church switch, adds a userChurches guard; FileHelper.postPresignedFile drops the duplicate "key" form field (matches the live upload flows; no existing callers). apphelper: delete the 8 shadow-duplicated local helper files and route internal components (GalleryModal, SiteHeader, ChurchList) through @churchapps/helpers — note dist/helpers/* deep-import paths for those files no longer exist.
