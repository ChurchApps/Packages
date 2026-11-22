---
"@churchapps/apihelper": patch
---

AwsHelper.readParameter: a parameter that does not exist returns "" at once instead of retrying four times and logging an error. Since 1.1.5 the Api's cold starts spent ~1.4s backing off on `/prod/API/connectionString`, which the Api never had, and logged thousands of errors a week.
