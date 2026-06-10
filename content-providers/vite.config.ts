import { defineConfig } from "vite";
import { resolve } from "path";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8"));

export default defineConfig({
  root: resolve(__dirname, "playground"),
  server: {
    port: 3000,
    open: true,
  },
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
});
