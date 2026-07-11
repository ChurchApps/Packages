---
"@churchapps/helpers": major
---

CurrencyHelper now caches exchange rates in memory. Call `initializeExchangeRates()` once at app start; `convertDonation`, `convertDonationTotals`, `convertAmount`, and `convertAmountWithLocale` then read the cached rates and no longer take a `rates` argument (breaking). Also: the localStorage rate cache is keyed per base currency, `convertDonation` gains an optional `withCurrencyLabel` flag, conversions round to 2 decimals, and `convertAmountWithLocale` is now synchronous.
