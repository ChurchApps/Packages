import { defineConfig, type Plugin } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

// Stub out optional peer dependencies that aren't needed in the playground
const stubs: Record<string, string> = {
  "@stripe/react-stripe-js": "export const CardElement = () => null; export const Elements = ({children}) => children; export const useElements = () => null; export const useStripe = () => null;",
  "@stripe/stripe-js": "export const loadStripe = () => Promise.resolve(null);"
};

function stubPlugin(): Plugin {
  const prefix = "\0stub:";
  return {
    name: "stub-optional-deps",
    resolveId(id) {
      if (id in stubs) return prefix + id;
    },
    load(id) {
      if (id.startsWith(prefix)) return stubs[id.slice(prefix.length)];
    }
  };
}

export default defineConfig({
  root: resolve(__dirname, "playground"),
  plugins: [stubPlugin(), react()],
  server: {
    port: 3002,
    open: true,
  },
  define: {
    "process.env": {}
  },
  optimizeDeps: {
    exclude: Object.keys(stubs)
  }
});
