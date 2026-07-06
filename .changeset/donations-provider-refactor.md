---
"@churchapps/apphelper": minor
---

Make donations fully provider-based. Each gateway (Stripe, PayPal, Kingdom Funding) now lives under `donations/providers/<gateway>/` and registers through the provider registry, so the shared donation flow no longer branches on gateway type. Removes the old per-gateway components and helpers (`StripeProvider`, `PayPalProvider`, `KingdomFundingProvider`, `StripeInstanceContext`, `*NonAuthDonationInner`, `PayPalHostedFields`, `CardForm`/`BankForm`, `StripePaymentMethod`/`PayPalPaymentMethod`, `PayPalDonationInterface`) in favor of the registry-driven `SavedPaymentMethod` and provider modules. Consumers no longer need `@stripe/*` deps and should reference providers via the registry rather than importing gateway components directly.
