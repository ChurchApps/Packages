---
"@churchapps/helpers": patch
---

Remove the unused `prayerRequest` member from the `SocketPayloadAction` union — a leftover of the removed live-stream "Request Prayer" chat feature. Nothing emitted or handled it, so there is no runtime impact.
