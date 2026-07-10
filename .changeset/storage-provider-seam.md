---
"@churchapps/apihelper": minor
---

Add a pluggable storage-provider seam: new `IStorageProvider` interface (store/getUploadUrl/remove/removeFolder/list/move + optional confirmUpload/getQuota, `PresignedPostData`/`StorageQuota` types), `ChurchAppsStorageProvider` wrapping the existing S3/local-disk behavior verbatim, and `StorageProviderFactory` registry (register/getProvider/getDefault, seeded with "churchapps"). `FileStorageHelper` keeps its exact public API but now delegates to the default provider; existing call sites are unaffected. Enables external storage providers (e.g. MinistryStuff) to be registered by host apps.
