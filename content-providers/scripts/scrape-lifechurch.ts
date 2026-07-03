/** Life.Church kids curriculum scraper: catalog from sitemap + episode pages, schedule from open.life.church; surfaces "this Sunday" without runtime HTTP. */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "..", "src", "providers", "lifeChurch", "data.json");
const SITEMAP_URL = "https://www.life.church/sitemap.xml";
const SCHEDULE_BASE = "https://open.life.church";
const UA = "Mozilla/5.0 (compatible; FreePlay-LifeChurch-Scraper/2.1; +https://github.com/ChurchApps/FreePlay)";
const RATE_MS = 250;

interface SeriesSpec {
  id: string;
  sitemapPath: string;
  name: string;
  ageGroup: string;
  description?: string;
  scheduleCategoryId?: number; // open.life.church category id for the weekly schedule
}

const SERIES: SeriesSpec[] = [
  {
    id: "loop",
    sitemapPath: "loop",
    name: "The Loop Show",
    ageGroup: "4th-6th Grade",
    scheduleCategoryId: 266,
    description: "Bible-based, age-appropriate lessons for 4th-6th grade. YouTube-style challenges and teaching that tackles the big questions."
  },
  {
    id: "konnect",
    sitemapPath: "konnect",
    name: "Konnect HQ",
    ageGroup: "1st-4th Grade",
    scheduleCategoryId: 303,
    description: "Konnect HQ teaches elementary kids the truths of who Jesus created them to be."
  },
  {
    id: "crosstown",
    sitemapPath: "crosstown",
    name: "Crosstown",
    ageGroup: "Pre-K / Kindergarten",
    description: "An hour-long small-group experience for 5-year-olds and Kindergarteners with Bible stories, worship songs, and on-screen teaching."
  },
  {
    id: "early-childhood",
    sitemapPath: "early-childhood",
    name: "Early Childhood",
    ageGroup: "Ages 2-5",
    scheduleCategoryId: 301,
    description: "Life.Church preschool curriculum — short Bible-story videos for ages 2 through early elementary."
  }
];

interface ScrapedLesson { id: string; title: string; videoUrl: string; thumbnail?: string; sourceUrl: string; }
interface ScrapedUnit { id: string; name: string; thumbnail?: string; sourceUrl: string; lessons: ScrapedLesson[]; }
interface ScrapedSeries { id: string; name: string; ageGroup: string; description?: string; thumbnail?: string; sourceUrl: string; units: ScrapedUnit[]; }
interface ScheduledLesson { id: string; weekOf: string; ageGroup: string; sourceTitle: string; seriesId: string; unitId: string; lessonId: string; }
interface DataFile { generatedAt: string; source: string; series: ScrapedSeries[]; scheduledLessons: ScheduledLesson[]; }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "*/*" } });
    if (!res.ok) return null;
    await sleep(RATE_MS);
    return res.text();
  } catch { return null; }
}

function metaContent(html: string, property: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]+)"`, "i");
  const reB = new RegExp(`<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="${property}"`, "i");
  return html.match(re)?.[1] ?? html.match(reB)?.[1];
}

function decodeHtmlEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

interface SitemapEntry { url: string; series: string; pathParts: string[]; }

function parseSitemap(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  const seriesIds = new Set(SERIES.map(s => s.sitemapPath));
  const re = /<loc>(https:\/\/www\.life\.church\/media\/([a-z0-9-]+)\/([^<]+))<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const url = m[1].replace(/\/$/, "");
    const series = m[2];
    if (!seriesIds.has(series)) continue;
    const tail = m[3].replace(/\/$/, "");
    const parts = tail.split("/").filter(Boolean);
    if (parts.length === 0) continue;
    entries.push({ url, series, pathParts: parts });
  }
  return entries;
}

function escapeRegex(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function findEpisodeMp4(html: string, slug: string): string | undefined {
  const fnameRe = new RegExp(`https://d\\.life\\.church/[^"'\\s)]+/${escapeRegex(slug)}_720p\\.mp4`, "i");
  const direct = html.match(fnameRe)?.[0];
  if (direct) return direct;
  const allMp4s = Array.from(html.matchAll(/https:\/\/d\.life\.church\/[^"'\s)]+\.mp4/gi), x => x[0]);
  return allMp4s.find(u => u.toLowerCase().endsWith(`/${slug}_720p.mp4`));
}

function pickThumbnail(html: string): string | undefined {
  const og = metaContent(html, "og:image");
  return og ? decodeHtmlEntities(og).split("?")[0] : undefined;
}

function pickTitle(html: string, fallback: string): string {
  const og = metaContent(html, "og:title");
  if (og) return decodeHtmlEntities(og).split(" | ")[0].trim();
  const t = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  if (t) return decodeHtmlEntities(t).split(" | ")[0].trim();
  return fallback;
}

function titleCase(slug: string): string {
  return slug.split("-").filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}

interface CliOpts { maxPerSeries?: number; seriesId?: string; scheduleOnly?: boolean }
function parseArgs(): CliOpts {
  const a = process.argv.slice(2);
  const opts: CliOpts = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--max-per-series") opts.maxPerSeries = Number(a[++i]);
    else if (a[i] === "--series") opts.seriesId = a[++i];
    else if (a[i] === "--schedule-only") opts.scheduleOnly = true;
  }
  return opts;
}

async function scrapeEpisode(entry: SitemapEntry): Promise<ScrapedLesson | null> {
  const slug = entry.pathParts[entry.pathParts.length - 1];
  const html = await fetchText(entry.url);
  if (!html) return null;
  const mp4 = findEpisodeMp4(html, slug);
  if (!mp4) return null;
  return {
    id: slug,
    title: pickTitle(html, titleCase(slug)),
    videoUrl: mp4,
    thumbnail: pickThumbnail(html),
    sourceUrl: entry.url
  };
}

async function scrapeSeries(spec: SeriesSpec, entries: SitemapEntry[], maxPerSeries?: number): Promise<ScrapedSeries> {
  console.log(`\n[${spec.id}] ${spec.name} — ${entries.length} sitemap entries`);
  const groups = new Map<string, SitemapEntry[]>();
  for (const e of entries) {
    const parent = e.pathParts.length === 1 ? "__flat__" : e.pathParts[0];
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent)!.push(e);
  }
  const leafEntries: SitemapEntry[] = [];
  for (const [parent, list] of groups) {
    if (parent === "__flat__") {
      const nestedParents = new Set(Array.from(groups.keys()).filter(k => k !== "__flat__"));
      for (const e of list) { if (nestedParents.has(e.pathParts[0])) continue; leafEntries.push(e); }
    } else {
      leafEntries.push(...list);
    }
  }
  const limit = maxPerSeries ?? leafEntries.length;
  const toScrape = leafEntries.slice(0, limit);
  console.log(`  scraping ${toScrape.length} leaf episodes (of ${leafEntries.length} candidates)`);

  const unitMap = new Map<string, ScrapedLesson[]>();
  let dropped = 0;
  for (let i = 0; i < toScrape.length; i++) {
    const e = toScrape[i];
    const lesson = await scrapeEpisode(e);
    if (!lesson) { dropped++; if (i % 10 === 0) console.log(`    [${i + 1}/${toScrape.length}] drops=${dropped}`); continue; }
    const unitKey = e.pathParts.length === 1 ? "episodes" : e.pathParts[0];
    if (!unitMap.has(unitKey)) unitMap.set(unitKey, []);
    unitMap.get(unitKey)!.push(lesson);
    if (i % 10 === 0) console.log(`    [${i + 1}/${toScrape.length}] kept=${i + 1 - dropped}`);
  }

  const units: ScrapedUnit[] = Array.from(unitMap.entries()).map(([key, lessons]) => ({
    id: key,
    name: key === "episodes" ? "Episodes" : titleCase(key),
    thumbnail: lessons[0]?.thumbnail,
    sourceUrl: `https://www.life.church/media/${spec.sitemapPath}/${key === "episodes" ? "" : key}`,
    lessons
  })).filter(u => u.lessons.length > 0).sort((a, b) => a.name.localeCompare(b.name));

  return {
    id: spec.id,
    name: spec.name,
    ageGroup: spec.ageGroup,
    description: spec.description,
    thumbnail: units[0]?.thumbnail,
    sourceUrl: `https://www.life.church/media/${spec.sitemapPath}/`,
    units
  };
}

/** Compute the next Sunday in YYYY-MM-DD, in the local timezone. If today is Sunday, return today. */
function nextSundayIso(): string {
  const d = new Date();
  const dayOfWeek = d.getDay(); // 0 = Sunday
  const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  d.setDate(d.getDate() + daysToAdd);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Resolve schedule entries to lessons; skip if slug diverges between surfaces. */
async function fetchSchedule(catalog: ScrapedSeries[], weekOf: string): Promise<ScheduledLesson[]> {
  const out: ScheduledLesson[] = [];
  for (const spec of SERIES) {
    if (!spec.scheduleCategoryId) continue;
    const url = `${SCHEDULE_BASE}/schedule?category_id=${spec.scheduleCategoryId}&start_date=${weekOf}`;
    const html = await fetchText(url);
    if (!html) { console.warn(`  schedule fetch failed for ${spec.id}`); continue; }

    const m = html.match(/<a class="calendar-resource"[^>]+href="\/resources\/(\d+)-([a-z0-9-]+)(?:\?[^"]*part=(\d+))?[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    if (!m) { console.warn(`  no calendar entry for ${spec.id} on ${weekOf}`); continue; }
    const [, , unitSlug, partStr, titleBlock] = m;
    const part = partStr ? Number(partStr) : 1;

    const titleMatch = titleBlock.match(/<h\d[^>]*>([^<]+)<\/h\d>/) ?? titleBlock.match(/>([A-Z][^<]+?)</);
    const sourceTitle = decodeHtmlEntities((titleMatch?.[1] ?? unitSlug).trim());

    const series = catalog.find(s => s.id === spec.id);
    if (!series) { console.warn(`  catalog missing series ${spec.id}`); continue; }

    const unit = series.units.find(u => u.id === unitSlug);
    let lesson: ScrapedLesson | undefined;
    let resolvedUnit = unit;
    if (unit) {
      lesson = unit.lessons[Math.min(Math.max(part - 1, 0), unit.lessons.length - 1)];
    } else {
      for (const u of series.units) {
        const l = u.lessons.find(x => x.id === unitSlug);
        if (l) { resolvedUnit = u; lesson = l; break; }
      }
    }
    if (!lesson || !resolvedUnit) {
      console.warn(`  schedule entry "${sourceTitle}" (slug=${unitSlug}, part=${part}) — no matching lesson in life.church/media catalog for ${spec.id}`);
      continue;
    }

    out.push({
      id: `${spec.id}-${weekOf}`,
      weekOf,
      ageGroup: spec.ageGroup,
      sourceTitle,
      seriesId: series.id,
      unitId: resolvedUnit.id,
      lessonId: lesson.id
    });
    console.log(`  ${spec.ageGroup}: ${sourceTitle} → ${series.id}/${resolvedUnit.id}/${lesson.id}`);
  }
  return out;
}

async function main() {
  const opts = parseArgs();
  const seriesToRun = opts.seriesId ? SERIES.filter(s => s.id === opts.seriesId) : SERIES;
  if (seriesToRun.length === 0) {
    console.error(`No series matched --series=${opts.seriesId}. Valid: ${SERIES.map(s => s.id).join(", ")}`);
    process.exit(1);
  }

  let catalog: ScrapedSeries[];

  if (opts.scheduleOnly) {
    if (!existsSync(OUTPUT_PATH)) { console.error("--schedule-only requires an existing data.json"); process.exit(1); }
    const existing: DataFile = JSON.parse(readFileSync(OUTPUT_PATH, "utf8"));
    catalog = existing.series;
    console.log(`Reusing existing catalog (${catalog.length} series, ${catalog.reduce((n, s) => n + s.units.reduce((u, x) => u + x.lessons.length, 0), 0)} lessons)`);
  } else {
    console.log(`Fetching sitemap ${SITEMAP_URL}...`);
    const xml = await fetchText(SITEMAP_URL);
    if (!xml) { console.error("Failed to fetch sitemap"); process.exit(1); }
    const allEntries = parseSitemap(xml);
    console.log(`Sitemap has ${allEntries.length} kids-curriculum URLs across ${new Set(allEntries.map(e => e.series)).size} series`);

    catalog = [];
    for (const spec of seriesToRun) {
      const entries = allEntries.filter(e => e.series === spec.sitemapPath);
      catalog.push(await scrapeSeries(spec, entries, opts.maxPerSeries));
    }
  }

  // Pull this week's schedule.
  const weekOf = nextSundayIso();
  console.log(`\nFetching schedule for week of ${weekOf}...`);
  const scheduledLessons = await fetchSchedule(catalog, weekOf);

  const out: DataFile = {
    generatedAt: new Date().toISOString(),
    source: "https://www.life.church/media",
    series: catalog,
    scheduledLessons
  };

  if (!existsSync(dirname(OUTPUT_PATH))) mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2));
  const totals = catalog.map(s => `${s.id}=${s.units.reduce((n, u) => n + u.lessons.length, 0)}`).join(", ");
  console.log(`\nWrote ${OUTPUT_PATH} — ${totals}, scheduled=${scheduledLessons.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
