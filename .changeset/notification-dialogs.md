---
"@churchapps/apphelper": patch
---

Notifications and Messages panels: the row's open target and its Delete / View Details buttons are now siblings instead of buttons nested in a button (no more React DOM nesting errors); the panel heading is no longer shown twice inside the user-menu dialogs (new optional `hideTitle` prop); the Notifications panel's text is translatable; fixed the "Occurrences" spelling in the recurrence editor
