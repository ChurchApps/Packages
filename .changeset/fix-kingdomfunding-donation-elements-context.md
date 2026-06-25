---
"@churchapps/apphelper": patch
---

Fix the member donation form crashing for non-Stripe gateways. `MultiGatewayDonationForm`'s shared inner unconditionally called Stripe's `useStripe()`, but only `StripeProvider` supplies an `<Elements>` context (Kingdom Funding and PayPal intentionally don't), so a Kingdom Funding / NMI church threw "Could not find Elements context; You need to wrap the part of your app that calls useStripe() in an `<Elements>` provider" and the form never rendered.

The shared form now reads the Stripe instance through a neutral `StripeInstanceContext`/`useStripeInstance()` (default `null`); `StripeProvider.MemberWrapper` publishes the live instance from inside `<Elements>`. Non-Stripe providers no longer mount any Stripe components. Fixes the donation screen on Kingdom Funding churches (B1App `/mobile/donate`, B1Admin donation page); the Stripe member flow (including 3DS) is unchanged.
