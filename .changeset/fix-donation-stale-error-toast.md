---
"@churchapps/apphelper": patch
---

Fix the member donation form re-showing a stale error when re-previewing.

`MultiGatewayDonationForm.handleSave` (the "Preview Donation" button) opened the preview modal without clearing the previous `errorMessage`. Because `ErrorMessages` re-opens its Snackbar whenever `props.errors` changes reference (and the parent passes a fresh `[errorMessage]` array on every render), re-previewing re-rendered the form and the old error toast popped up again — even after the donor fixed the problem (e.g. entered the missing postal code, which is captured in the isolated Stripe iframe and never clears the form's error state). `handleSave` now clears `errorMessage` before opening the preview, so each retry starts clean.
