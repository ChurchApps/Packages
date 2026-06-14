---
"@churchapps/apphelper": minor
---

Introduce a client-side `PaymentProvider` registry so payment gateways are pluggable, mirroring the server's `GatewayFactory`. Each provider is a single adapter (capabilities + descriptor + charge-request builder + entry widget); the donor forms, guest flow, saved-payment-methods UI, and admin giving settings all resolve behavior from the registry instead of hard-coded `=== "stripe" | "paypal" | "kingdomfunding"` / `hasKF` / `isKingdomFunding` branches.

- New exports from `@churchapps/apphelper/donations`: `getPaymentProvider`, `listPaymentProviders`, `registerPaymentProvider`, `hasPaymentProvider`, and the `PaymentProvider` types.
- `MultiGatewayDonationForm` and `NonAuthDonation` are now provider-agnostic shells (tokenize → buildChargeRequest → finalizeResult).
- `DonationHelper.isKingdomFunding` removed (use the registry); `provider` fields on `PaymentMethod`/`PaymentGateway`/`MultiGatewayDonationInterface`/`StripePaymentMethod` widened to `string`.
- Adding a new gateway is one adapter file + one server `IGatewayProvider` impl — no edits to any shared form, page, or admin screen.
