import { ProviderIndex } from "./types";

export interface BundledManifests {
  index: ProviderIndex;
  files: Record<string, unknown>;
}

let cached: BundledManifests | null = null;

/**
 * Dynamically load every manifest and dataset listed in `src/manifests/index.json`.
 * - Under Node / tsx (tests, CLI, scripts): reads `src/manifests/index.json` and referenced JSON files from disk.
 * - Under tsup / Vite builds: replaced at build time with a pre-inlined snapshot generated directly from
 *   `src/manifests/index.json` so browsers and React Native never touch Node APIs and zero providers are hardcoded in TS.
 */
export function loadBundledManifests(): BundledManifests {
  if (cached) return cached;
  const getBuiltin = (globalThis as { process?: { getBuiltinModule?: (name: string) => any } }).process?.getBuiltinModule;
  if (!getBuiltin) {
    throw new Error("Bundled manifests must be inlined by the build tool outside Node");
  }
  const fs = getBuiltin("node:fs");
  const path = getBuiltin("node:path");
  const url = getBuiltin("node:url");

  const manifestsDir = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..", "manifests");
  const index = JSON.parse(fs.readFileSync(path.join(manifestsDir, "index.json"), "utf8")) as ProviderIndex;
  const files: Record<string, unknown> = {};

  for (const entry of index.providers) {
    if (!entry.manifest || entry.manifest.startsWith("https://")) continue;
    const manifestPath = path.join(manifestsDir, entry.manifest);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    files[entry.manifest] = manifest;

    const dir = entry.manifest.includes("/") ? entry.manifest.slice(0, entry.manifest.lastIndexOf("/") + 1) : "";
    for (const ref of Object.values((manifest as { datasets?: Record<string, unknown> }).datasets || {})) {
      if (typeof ref !== "string" || ref.startsWith("https://") || ref.includes("..")) continue;
      const key = dir + ref;
      if (!(key in files)) {
        files[key] = JSON.parse(fs.readFileSync(path.join(manifestsDir, key), "utf8"));
      }
    }
  }

  cached = { index, files };
  return cached;
}
