---
"@churchapps/apphelper": patch
---

Stop ImageEditor from loading on every page via a circular chunk (C is not a function). Lazy-load the gallery and cropper, and import ImageEditor siblings directly.
