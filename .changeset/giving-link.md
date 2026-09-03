---
"@churchapps/apphelper": minor
---

Fix guest donation forms (Stripe, PayPal, Paystack, Kingdom Funding) so a `?fundId=` and `?amount=` on the donate link actually preselect the fund and total, not just the amount field — the total, fee, and validation used to stay at $0 until the donor touched a field.
