---
"@churchapps/content-providers": minor
---

Go Curriculum: feed URLs are no longer in the package. Server hosts pass them with `setProviderSecret("gocurriculumFeeds", json)`; device hosts call `GoCurriculumProvider.setCatalogLoader` to fetch through their server, which serves `getCatalog`.
