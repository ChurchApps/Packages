/**
 * Smoke test for LifeChurchProvider — exercises browse / getPlaylist / getInstructions
 * against the bundled data.json without requiring FreePlay or Maestro.
 *
 * Run: npx tsx scripts/test-lifechurch.ts
 */

import { LifeChurchProvider } from "../src/providers/lifeChurch";
import { isContentFolder, isContentFile } from "../src/interfaces";

async function main() {
  const provider = new LifeChurchProvider();
  let issues = 0;

  console.log("\n=== Root (/ ) ===");
  const root = await provider.browse("/");
  console.log(`  ${root.length} top-level items:`);
  for (const item of root) {
    if (!isContentFolder(item)) { console.log(`  ! root child is not a folder: ${item.id}`); issues++; continue; }
    console.log(`  - ${item.id}: ${item.title}`);
  }

  // Scheduled lessons (if present)
  const hasScheduled = root.some(r => r.id === "scheduled");
  if (hasScheduled) {
    console.log("\n=== /scheduled ===");
    const scheduled = await provider.browse("/scheduled");
    console.log(`  ${scheduled.length} scheduled lessons`);
    for (const s of scheduled) {
      if (!isContentFolder(s)) { console.log(`  ! scheduled child is not a folder`); issues++; continue; }
      console.log(`  - ${s.id}: ${s.title}`);
      const file = await provider.browse(s.path);
      if (file.length !== 1 || !isContentFile(file[0])) { console.log(`    ! scheduled leaf did not resolve to a single file`); issues++; continue; }
      console.log(`    url: ${file[0].url}`);
      const playlist = await provider.getPlaylist?.(s.path);
      if (!playlist || playlist.length !== 1) { console.log(`    ! getPlaylist failed`); issues++; }
    }
  }

  // Series
  for (const item of root) {
    if (!isContentFolder(item) || item.id === "scheduled") continue;
    const series = item;
    console.log(`\n=== Series ${series.path} ===`);
    const units = await provider.browse(series.path);
    console.log(`  ${units.length} units`);
    if (units.length === 0) { console.log(`  ! no units`); issues++; continue; }
    const firstUnit = units[0];
    if (!isContentFolder(firstUnit)) { issues++; continue; }
    const lessons = await provider.browse(firstUnit.path);
    if (lessons.length === 0) { console.log(`  ! first unit empty`); issues++; continue; }
    const firstLesson = lessons[0];
    if (!isContentFolder(firstLesson)) { issues++; continue; }
    const file = await provider.browse(firstLesson.path);
    if (file.length !== 1 || !isContentFile(file[0])) { console.log(`  ! lesson leaf did not resolve`); issues++; continue; }
    console.log(`  ${firstUnit.id}/${firstLesson.id} → ${file[0].url}`);
  }

  if (issues === 0) console.log("\nAll checks passed.");
  else { console.log(`\n${issues} issue(s) found.`); process.exit(1); }
}

main().catch(err => { console.error(err); process.exit(1); });
