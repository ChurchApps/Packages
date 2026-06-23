---
"@churchapps/apphelper": minor
---

Kingdom Funding donations now tokenize via **NMI Collect.js** (replacing the Accept Blue hosted iframe) and support **ACH/bank** in addition to card. The member and guest donation forms gain a card/bank toggle, both routed through the single-use NMI `payment_token`; raw bank numbers no longer reach the backend. Saved methods are sent as `paymentMethodId`/`customerId` (the NMI customer vault id). The Kingdom Funding provider capabilities now expose `savedBank` and `guestAch`.

Requires the matching Api change (the `kingdomfunding` gateway provider retargeted to NMI). No public API of the donations module changed for normal consumers — `MultiGatewayDonationForm`/`NonAuthDonation` pick up the updated provider automatically.
