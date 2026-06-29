---
"@churchapps/apphelper": patch
---

Fix donation portal error handling and a member "Add Card" crash.

- **PaymentMethods**: adding a card via the member portal white-screened for Stripe churches. Stripe now exposes a `MemberEntry` (for inline donate), which made `usesTokenEntry` true and routed "Add Card" through the bare token dialog — rendering `useStripe()` with no `<Elements>` context. Stripe now correctly uses the `CardForm` + `<Elements>` path (token dialog is reserved for providers without a `MemberWrapper`, e.g. Kingdom Funding).
- **MultiGatewayDonationForm**: the donation preview modal could hang with a stuck spinner if `finalizeResult` threw (3DS) or the charge response shape was unrecognized. The post-charge tail now always closes the modal and surfaces an error, and gateway error messages are cleaned (the human-readable reason is extracted instead of dumping the raw JSON response body to donors).
- **CardForm**: hardened person field access (`person?.contactInfo?.email`, `person?.name?.display`) so a person record missing optional fields can't crash the add-card form.
