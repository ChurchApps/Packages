---
"@churchapps/apphelper": patch
---

apphelper: take Kingdom Funding out of beta — removed `betaOnly: true` from the KingdomFunding provider descriptor, so KF now appears in the production admin gateway dropdown (`GivingSettingsEdit`) for all churches, not just those that already had it configured. No behavior change to the donation flows themselves; the NMI-backed provider (charges, vaulting, recurring, webhooks) has been live-path code since the July provider refactor.
