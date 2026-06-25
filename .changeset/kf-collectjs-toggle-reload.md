---
"@churchapps/apphelper": patch
---

Kingdom Funding (NMI): fully reload Collect.js when toggling between card and ACH. Collect.js only honors one `configure()` per script load, so switching field sets previously left the bank/ACH form stuck on the loading spinner. A fail-safe timeout also prevents the spinner from hanging when the domain isn't whitelisted for the tokenization key.
