---
"@churchapps/content-providers": patch
"@churchapps/integration-sdk": patch
"@churchapps/texting": patch
---

The exported `VERSION` constant is now injected from package.json at build time instead of being hardcoded (it had drifted several releases behind).
