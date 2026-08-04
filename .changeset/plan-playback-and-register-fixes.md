---
"@churchapps/content-providers": patch
"@churchapps/apphelper": patch
---

content-providers: two Lessons.church playback/labeling fixes. `collectFilesFromNode` now only emits leaf nodes (itemType `"file"` or childless), so B1 plan lessons no longer play each video/slide 2-4 times on FreePlay — the same `downloadUrl` legitimately appears on section, action, and file levels of the plan tree (#963). `convertAddOnToFile` falls back to the fetched add-on detail for `title` and `thumbnail`, so add-ons resolved by bare id (`getPlaylist`, `getInstructions`, `getAddOnFiles`) keep their real name instead of showing "Action" (#974).

apphelper: registering a new church no longer re-enables the Save button while church selection is still in flight — the button stays disabled until navigation, closing the window where a second click created a duplicate church (#957). `LoginPage.selectChurch` now awaits `continueLoginProcess`, and `SelectChurchRegister`'s `selectChurch` prop accepts an async handler.
