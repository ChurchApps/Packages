---
"@churchapps/content-providers": patch
---

Fix Google Drive browsing returning an empty list: the file query no longer combines `includeItemsFromAllDrives` with a `root` parent lookup, which Google rejected, and failed API requests now log the response body (ChurchAppsSupport #944).
