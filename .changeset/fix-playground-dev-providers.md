---
"@churchapps/content-providers": patch
---

Fix the dev playground (`npm run dev`) showing no providers after the 0.4.0 slim-down. Two load-time crashes aborted the playground's module graph before any provider rendered:

- `VERSION` referenced the bare `__PACKAGE_VERSION__` token, which Vite's `define` only substitutes during `vite build` — `vite:define` is a no-op for client modules in dev, so the unresolved identifier threw a `ReferenceError` on load. Guarded with `typeof` so it degrades to `"dev"` (the tsup build still injects the real version).
- The playground imported `OAuthHelper`/`DeviceFlowHelper` from the package root, but 0.4.0 dropped them from the public barrel; under native-ESM dev the missing named export is a hard `SyntaxError`. The playground now deep-imports them from `src/helpers`.

No published API change — the fixes are confined to dev tooling and the `VERSION` constant is unchanged for consumers.
