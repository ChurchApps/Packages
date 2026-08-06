---
"@churchapps/apihelper": minor
"@churchapps/helpers": minor
"@churchapps/apphelper": minor
---

Bring-Your-Own-Storage support. `PresignedPostData` gains optional `method`, `headers`, `rawBody`, `chunkSize` and `externalIdField` so storage providers can presign raw-body PUT/POST and chunked-session uploads (Google Drive, Dropbox, OneDrive, S3-compatible), and `IStorageProvider` gains optional `getDownloadUrl` for minting short-lived download links. New `FileHelper.uploadPresignedFile` handles every presign shape client-side (legacy form-POST unchanged, raw-body, chunked) and returns the provider file id; `FileInterface` carries `provider`/`externalId`. `FileUpload` now sends `size`/`mimeType` with postUrl requests (fixes provider presigns), registers the returned `externalId`, and surfaces `storage_quota_exceeded` errors. All changes are additive and backward compatible.
