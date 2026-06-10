# @churchapps/helpers

## 1.6.1

### Patch Changes

- 50cd16c: ApiHelper is properly typed as ApiHelperClass again — the singleton accessor's missing return annotation made the published declaration `ApiHelper: any`, which broke contextual typing of response callbacks in consumers.

## 1.6.0

### Minor Changes

- afebf7e: Canonical `FileUpload` component in apphelper and `FileInterface` in helpers, replacing the per-app copies that had drifted across B1Admin, B1App, B1Mobile, and LessonsApp.
