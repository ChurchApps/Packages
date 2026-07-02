---
"@churchapps/helpers": minor
"@churchapps/apphelper": minor
---

Add three church-data website-builder element types (contract + public renderers): `campaignProgress` (fund total vs. goal with animated progress bar, GivingApi), `staffGrid` (public group roster as photo/name/role cards, MembershipApi), and `serviceTimes` (schedule grouped by service with best-effort schema.org Event JSON-LD, AttendanceApi). All fetch in effects (SSR-safe), render nothing on public pages when empty and an editor-only hint when editing. Add two site-wide widget components with parse helpers: `AnnouncementBanner` (sticky dismissible bar with a date window, `parseAnnouncementConfig`) and `Launcher` (Nucleus-style floating action hub, `parseLauncherConfig`).
