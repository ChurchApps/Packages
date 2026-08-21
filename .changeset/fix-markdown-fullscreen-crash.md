---
"@churchapps/apphelper": patch
---

Fix fullscreen markdown editor bugs: TRANSFORMERS.splice mutated the shared Lexical export, a formatting-state check was comparing a boolean to a string, and MarkdownModal called onChange on every render instead of only on user edits.
