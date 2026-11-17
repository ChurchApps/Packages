---
"@churchapps/apphelper": patch
---

GalleryModal: when the API returns no presigned S3 slot (self-hosted installs on disk storage), post the image to `/gallery/upload` instead of silently dropping it.
