---
"@churchapps/content-providers": minor
---

GoCurriculum: data.json now uses Go Curriculum's own catalog export format verbatim (`catalog`/`thumbnail`/`playlist` with `duration`, file ids slugified from filenames) instead of the hand-rolled `collections`/`files` schema — new exports from Go drop in unmodified. Lesson `resources` (PDF/docx leader material) are carried in the data but not surfaced.
