---
"@churchapps/apphelper": patch
---

Send the MessagingApi JWT on realtime room joins when one is configured. `SubscriptionManager.postConnection` and `SocketHelper.createAlertConnection` previously always used `postAnonymous`, which the API now rejects for non-public rooms (person notes, group chat, the per-person "alerts" room) — silently killing all realtime delivery for logged-in users. Anonymous POST remains the fallback for logged-out livestream viewers, the only audience the API still accepts anonymously.
