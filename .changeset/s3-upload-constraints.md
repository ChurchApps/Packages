---
"@churchapps/apihelper": patch
"@churchapps/helpers": patch
"@churchapps/apphelper": patch
---

Constrain S3 uploads: the server pins Content-Type and a content-length-range on presigned POSTs and chooses the ACL itself (a client-supplied ACL is ignored). Only allowlisted media types get `public-read`; every other type uploads to a private object rather than being rejected.
