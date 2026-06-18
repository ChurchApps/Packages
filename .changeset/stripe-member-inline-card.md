---
"@churchapps/apphelper": minor
---

Stripe members with no saved card can now enter a card inline on the donation form. `StripeProvider` gains a `MemberEntry` widget that tokenizes the card and saves it via `/paymentmethods/addcard` (creating the customer), so the donation charges through the normal saved-method path and the card is saved on submit. Fixes the blank "Method" dropdown on the B1App `/mobile/donate` screen for first-time donors.
