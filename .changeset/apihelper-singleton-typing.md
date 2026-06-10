---
"@churchapps/helpers": patch
---

ApiHelper is properly typed as ApiHelperClass again — the singleton accessor's missing return annotation made the published declaration `ApiHelper: any`, which broke contextual typing of response callbacks in consumers.
