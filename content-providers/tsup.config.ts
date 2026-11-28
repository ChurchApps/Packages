import { defineConfig } from "tsup";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"));

/** Inline everything referenced by src/manifests/index.json at build time so dist/ has no node:fs and no hardcoded provider list. */
function inlineBundledManifestsSource(): string {
  const manifestsDir = resolve(rootDir, "src", "manifests");
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
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  define: { __PACKAGE_VERSION__: JSON.stringify(pkg.version) },
  esbuildPlugins: [
    {
      name: "inline-bundled-manifests",
      setup(build) {
        build.onLoad({ filter: /[\\/]src[\\/]manifest[\\/]bundled\.ts$/ }, () => ({
          contents: inlineBundledManifestsSource(),
          loader: "ts"
        }));
      }
    }
  ]
});
