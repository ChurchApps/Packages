---
"@churchapps/helpers": minor
"@churchapps/apphelper": minor
---

Add conversational (one-question-at-a-time) form mode. When a form's `displayMode` is `"conversational"`, `FormSubmissionEdit` renders questions one at a time with a progress indicator, Continue/Back navigation, Enter-to-advance, per-step required validation, and reduced-motion-aware transitions, instead of the full stacked form. Standard/absent `displayMode` is unchanged. Adds `displayMode` to `FormInterface` in `@churchapps/helpers`.
