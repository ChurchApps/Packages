import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: resolve(__dirname, "playground"),
  plugins: [react()],
  server: {
    port: 3003,
    open: true,
  },
  define: {
    "process.env": {}
  }
});
