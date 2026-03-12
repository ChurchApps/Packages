import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: resolve(__dirname, "playground"),
  plugins: [react()],
  server: {
    port: 3005,
    open: true,
  },
  define: {
    "process.env": {}
  },
  resolve: {
    alias: {
      "@stripe/react-stripe-js": resolve(__dirname, "src/stubs/stripe.ts"),
      "@stripe/stripe-js": resolve(__dirname, "src/stubs/stripe.ts")
    }
  }
});
