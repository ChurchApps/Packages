---
"@churchapps/content-providers": patch
---

Fix B1Church plan browsing showing "No content available" in timezones behind UTC. The plan-type folder filtered plans with `new Date(serviceDate)`, which parses the date-only serviceDate as UTC midnight and shifts it to the previous local day — dropping yesterday's plan (e.g. Sunday's service when browsing on Monday) even though the filter's one-day grace period was meant to keep it. Plans are now filtered by comparing calendar-date strings, which is timezone-independent.
