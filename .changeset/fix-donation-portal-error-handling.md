---
"@churchapps/apphelper": patch
---

Fix donation portal freezing on charge errors. `MultiGatewayDonationForm` now catches API failures (4xx/5xx) and surfaces `results.error` bodies instead of leaving the preview modal stuck with no message (issue #928).
