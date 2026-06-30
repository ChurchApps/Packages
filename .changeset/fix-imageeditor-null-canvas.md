---
"@churchapps/apphelper": patch
---

Guard against a null cropped canvas in `ImageEditor`.

`Cropper.getCroppedCanvas()` returns `null` when the crop box has no area (e.g. a zero-size or not-yet-laid-out image), so calling `.toDataURL()` on it threw and crashed the editor. The crop preview now bails out when the canvas is null instead of dereferencing it.
