---
"@churchapps/apphelper": minor
---

`Notes` takes optional `historyLink` and `deletedNotes` props. With a `historyLink`, an edited note's "(edited)" caption links to it, and each `deletedNotes` entry renders a greyed "Deleted note" marker in time order (author, posted and deleted dates, "View history" link) without the old text. Adds the `DeletedNoteInterface` type and a `historyLink` prop on `Note`.
