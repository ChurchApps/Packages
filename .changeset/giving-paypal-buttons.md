---
"@churchapps/apphelper": minor
---

Add PayPal Smart Buttons (PayPal + Venmo) above the Hosted Fields card form on the PayPal guest form and member entry, for one-time gifts only. The SDK now loads `components=buttons,hosted-fields&enable-funding=venmo` once for both widgets, and an approved order is charged through the existing `/donate/charge` capture path.
