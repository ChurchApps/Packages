---
"@churchapps/apphelper": patch
"@churchapps/helpers": patch
---

Add pause/resume support for recurring donations, localize the recurrence editor, and extend a few interfaces.

- New `pauseRecurring` provider capability (Stripe: true; Kingdom Funding and PayPal: false). `RecurringDonations` shows pause/resume buttons and a "Paused" badge for capable providers, calling the new GivingApi `/subscriptions/:id/pause` and `/subscriptions/:id/resume` endpoints, with new `donation.recurring.*` locale strings in all 28 languages.
- `RRuleEditor` labels and aria text are now localized under `eventCalendar.recurring.*` (previously hard-coded English), and the never/count/until option handling uses `undefined` instead of `null as any`.
- `FormSubmissionEdit` passes the saved submission to `updatedFunction` (parameter is optional, so existing callers are unaffected).
- `@churchapps/helpers`: optional `FundInterface.visible` and `GroupInterface.archived` fields.
