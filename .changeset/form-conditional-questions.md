---
"@churchapps/helpers": minor
"@churchapps/apphelper": minor
---
Conditional form questions: `QuestionInterface.showIf` (`{ questionId, value }`) shows a question only when an earlier question is answered, or answered with that choice. The form renderer hides questions whose condition is not met, skips them when checking required answers and taking payment, and leaves their answers out of the submission. `QuestionVisibility` exposes the same check. Checkbox questions now reflect the saved answer when they reappear.
