---
"@churchapps/apphelper": patch
---

Card entry for Stripe and PayPal sends the guest captcha pass from its charge context, and GuestCaptcha is exported, so guest event registration payments keep working once the Api requires the captcha.
