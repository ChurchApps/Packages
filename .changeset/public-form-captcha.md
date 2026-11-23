---
"@churchapps/apphelper": patch
---

FormSubmissionEdit: signed-out submitters check a reCAPTCHA before submitting, and the submission carries the `captchaPass` from `/donate/captcha-verify`. Forms with a payment question reuse the payment block's captcha instead of showing a second one. `FormPaymentHandle.handlePayment` now also returns that `captchaPass`, and `ConversationalForm` takes a `lastStepFooter`.
