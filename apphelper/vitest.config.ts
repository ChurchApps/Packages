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
  resolve: { alias: { "@churchapps/helpers": resolve(__dirname, "node_modules/@churchapps/helpers/dist/index.js") } }
});
