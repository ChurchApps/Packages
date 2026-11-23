---
"@churchapps/apphelper": minor
---

Login: add "Email me a code" sign-in. The member enters their email, gets a 6-digit code, and is signed in with it (two-factor accounts still get the authenticator step). Needs the Api `/membership/users/requestLoginCode` and `/membership/users/loginWithCode` endpoints.
