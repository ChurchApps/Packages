---
"@churchapps/apphelper": minor
---

Add "Continue with Google" / "Continue with Microsoft" SSO buttons to the shared login UI. A new `SsoButtons` component fetches enabled providers from `GET /users/sso/providers` (MembershipApi), renders branded outlined buttons on the Login and Register cards, and starts the flow via a full-page redirect to `/users/sso/authorize/<provider>`. `LoginPage` now surfaces a `loginError` query param through the existing error display for SSO failures.
