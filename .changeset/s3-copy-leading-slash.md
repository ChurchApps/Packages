---
"@churchapps/apihelper": patch
---

S3Copy strips a leading slash from its keys like the other S3 helpers, so moving a pending profile photo no longer fails with NoSuchKey.
