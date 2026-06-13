---
"@churchapps/apphelper": patch
---

Remove the donor-facing payment-processor selector from the donation forms. The payment gateway is a church setting, not a donor choice, so `NonAuthDonation` and `MultiGatewayDonationForm` now always use the church's configured gateway instead of rendering a Stripe/PayPal/Kingdom Funding picker.
