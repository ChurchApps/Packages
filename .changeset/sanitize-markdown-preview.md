---
"@churchapps/apphelper": patch
---

Sanitize MarkdownPreviewLight HTML to block stored XSS. Link and image URLs are now checked against a scheme allowlist (http, https, mailto, tel, relative, plus raster `data:` image sources) at every point they can enter the preview - the `{...}` special-link syntax, marked's own link/image renderer, and raw HTML - so `javascript:` and `data:` URLs are dropped rather than relying on DOMPurify alone.
