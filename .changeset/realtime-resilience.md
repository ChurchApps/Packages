---
"@churchapps/apphelper": minor
---

Harden realtime socket handling: automatic reconnect with resume-probe, server heartbeat handling, and always-push with client-side dedup. SubscriptionManager and ConversationStore updated to match. Note: `onSocketIdReady` now fires on every (re)connect rather than only the first connect.
