import { defineConfig, loadEnv } from "vite";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  // Load env from playground dir so .env.local is picked up
  const env = loadEnv(mode, resolve(__dirname, "playground"), "VITE_");
  return {
    root: resolve(__dirname, "playground"),
    server: {
      port: 3001,
      open: true,
      proxy: {
        "/proxy/clearstream": {
          target: "https://api.getclearstream.com/v1",
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/proxy\/clearstream/, ""),
          secure: true
        },
        "/proxy/textinchurch": {
          target: "https://api.textinchurch.com/API/1_0",
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/proxy\/textinchurch/, ""),
          secure: true
        }
      }
    },
    define: {
      // MutualMinistry provider reads process.env.STORE_API_URL at runtime
      "process.env.STORE_API_URL": JSON.stringify(env.VITE_API_BASE_URL || "http://localhost:8096")
    }
  };
});
