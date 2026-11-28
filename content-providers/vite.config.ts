import { defineConfig } from "vite";
import { resolve, join } from "path";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8"));

function inlineBundledManifestsSource(): string {
  const manifestsDir = resolve(__dirname, "src", "manifests");
  const index = JSON.parse(readFileSync(join(manifestsDir, "index.json"), "utf8"));
  const files: Record<string, unknown> = {};
  for (const entry of index.providers) {
    if (!entry.manifest || entry.manifest.startsWith("https://")) continue;
    const manifest = JSON.parse(readFileSync(join(manifestsDir, entry.manifest), "utf8"));
    files[entry.manifest] = manifest;
    const dir = entry.manifest.includes("/") ? entry.manifest.slice(0, entry.manifest.lastIndexOf("/") + 1) : "";
    for (const ref of Object.values(manifest.datasets || {})) {
      if (typeof ref !== "string" || ref.startsWith("https://") || ref.includes("..")) continue;
      const key = dir + ref;
      if (!(key in files)) files[key] = JSON.parse(readFileSync(join(manifestsDir, key), "utf8"));
    }
  }
  return `const BUNDLED = ${JSON.stringify({ index, files })};\nexport function loadBundledManifests() { return BUNDLED; }\n`;
}

export default defineConfig({
  root: resolve(__dirname, "playground"),
  server: {
    port: 3000,
    open: true
  },
  define: { __PACKAGE_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    {
      name: "inline-bundled-manifests",
      enforce: "pre",
      load(id) {
        if (/[\\/]src[\\/]manifest[\\/]bundled\.ts$/.test(id)) return inlineBundledManifestsSource();
        return null;
      }
    }
  ]
});
