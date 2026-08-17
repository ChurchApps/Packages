import { defineConfig } from "vitest/config";
import { resolve } from "path";

// Separate from vite.config.ts (which targets the dev `playground/` root) so unit
// tests pick up the package root and can resolve src/* imports.
export default defineConfig({
  test: {
    root: __dirname,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "playground"]
  },
  resolve: {
    alias: {
      "@churchapps/helpers": resolve(__dirname, "../node_modules/@churchapps/helpers/dist/index.js"),
      // jsdom is already the test environment, so point at the browser build
      // instead of letting the node entry spin up a second, bundled jsdom.
      "isomorphic-dompurify": resolve(__dirname, "../node_modules/isomorphic-dompurify/dist/browser.mjs")
    }
  }
});
