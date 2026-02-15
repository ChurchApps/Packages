import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: resolve(__dirname, "playground"),
  server: {
    port: 3001,
    open: true
  }
});
