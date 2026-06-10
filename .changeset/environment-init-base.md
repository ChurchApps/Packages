---
"@churchapps/apihelper": minor
---

`EnvironmentBase.initBase(environment, { appName, configDir?, fileMap? })` resolves config/<env>.json (locally and in Lambda), parses it, runs populateBase, and returns the parsed data — replacing the config-file boilerplate previously duplicated in every API's Environment.ts.
