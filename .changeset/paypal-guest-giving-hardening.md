---
"@churchapps/apphelper": minor
---

Harden PayPal guest giving and add a capture-status helper.

- PayPal guest donations now enforce reCAPTCHA before submitting (verification was being bypassed unconditionally).
- A PayPal order that is only `CREATED` (not captured) is no longer treated as a successful donation — non-captured statuses now surface an error instead of a false thank-you screen.
- The recurring option is no longer offered in the PayPal guest form; PayPal has no subscribe path (`capabilities.recurring === false`) and the toggle previously fell back to a silent one-time charge.
- Added `DonationHelper.isPayPalCaptureComplete(status)`.
- Removed the unused `PayPalCardForm` component and `PayPalCardData` type (dead code, not referenced by any consumer).
