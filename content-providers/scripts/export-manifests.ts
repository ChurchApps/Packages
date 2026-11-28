/**
 * Export all provider JSON manifests, datasets, and a hashed index.json into dist/manifests/
 * ready to upload to any static web server, S3 bucket, Cloudflare R2, or CDN.
 *
 * Usage: yarn export:manifests [outputDir]
 */

import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateIndex, validateManifest } from "../src/manifest/validate";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, "..", "src", "manifests");
const outDir = resolve(process.argv[2] || join(__dirname, "..", "dist", "manifests"));

const rawIndex = JSON.parse(readFileSync(join(srcDir, "index.json"), "utf8"));
const index = validateIndex(rawIndex);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

let exportedCount = 0;
let datasetCount = 0;

for (const entry of index.providers) {
  if (!entry.manifest) continue;
  const srcPath = join(srcDir, entry.manifest);
  const manifestText = readFileSync(srcPath, "utf8");
  const manifest = validateManifest(JSON.parse(manifestText));

  const destPath = join(outDir, entry.manifest);
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, manifestText);
  entry.sha256 = createHash("sha256").update(manifestText).digest("hex");
  exportedCount++;

  for (const ref of Object.values(manifest.datasets || {})) {
    if (typeof ref !== "string" || ref.startsWith("https://")) continue;
    const dsSrc = resolve(dirname(srcPath), ref);
    const dsDest = resolve(dirname(destPath), ref);
    mkdirSync(dirname(dsDest), { recursive: true });
    cpSync(dsSrc, dsDest);
    datasetCount++;
  }
}

writeFileSync(join(outDir, "index.json"), JSON.stringify(index, null, 2) + "\n");
console.log(`Exported ${exportedCount} provider manifests and ${datasetCount} datasets to ${outDir}`);
