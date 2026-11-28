import { ContentDownload, ContentFile, ContentFolder, ContentProviderAuthData, InstructionItem, Instructions, NetworkInstance } from "../interfaces";
import { navigateToPath } from "../instructionPathUtils";
import { authToNetworkInstance, networkInstanceToAuth } from "../helpers/NetworkDiscoveryHelper";
import { findFirstThumbnail, getOrderedFiles, PlanOrderItem } from "../helpers/PlanHelper";
import { detectMediaType, filesToInstructions, instructionsToPlaylist, isMediaFile, isPlaylistMedia, slugify } from "../utils";

export const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/** Registry of sandboxed lambda functions created by the expression evaluator. */
export const lambdas = new WeakSet<object>();

export const isFn = (f: unknown): f is (...args: unknown[]) => unknown => typeof f === "function" && lambdas.has(f);
export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

export const callLambda = (f: unknown, ...args: unknown[]) => {
  if (!isFn(f)) throw new Error("Expected a function (x => ...)");
  return f(...args);
};

/** Patterns come from signed manifests; cap their length as a guard against pathological regexes. */
const regex = (pattern: unknown, flags: unknown) => {
  const p = str(pattern);
  if (p.length > 200) throw new Error("Pattern too long");
  return new RegExp(p, str(flags).replace(/[^gimsu]/g, ""));
};

const compare = (mode: unknown) => (a: unknown, b: unknown): number => {
  if (mode === "number") return Number(a) - Number(b);
  if (mode === "raw") return str(a) < str(b) ? -1 : str(a) > str(b) ? 1 : 0;
  if (mode === "natural") return str(a).localeCompare(str(b), undefined, { numeric: true, sensitivity: "base" });
  return str(a).localeCompare(str(b));
};

/** WordPress thumbnails arrive as a URL or an attachment object; prefer the medium size. */
function wpThumb(thumb: unknown): string | undefined {
  if (typeof thumb === "string") return thumb || undefined;
  if (thumb && typeof thumb === "object") {
    const t = thumb as { url?: unknown; sizes?: Record<string, unknown> };
    if (typeof t.sizes?.medium === "string") return t.sizes.medium;
    if (typeof t.url === "string") return t.url;
  }
  return undefined;
}

/** Strip common Markdown syntax into clean single-line text. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncate text at the first newline or maxLen, stripping markdown, and append suffix when cut. */
export function truncateLabel(text: string, maxLen = 100, suffix = "..."): string {
  const lb = text.indexOf("\n");
  const cutoff = lb > 0 && lb < maxLen ? lb : maxLen;
  const cut = text.length > cutoff ? text.slice(0, cutoff) : text;
  return stripMarkdown(cut) + (text.length > cutoff ? suffix : "");
}

/** Local calendar date string "YYYY-MM-DD" offset by `days` from today (avoids UTC midnight timezone shifts). */
export function localDateOffset(days = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Normalize Lessons.church / B1 plan item types into standard InstructionItem itemTypes. */
export function normalizeItemType(type?: string): string | undefined {
  if (type === "lessonSection") return "section";
  if (type === "lessonAction" || type === "lessonAddOn") return "action";
  return type;
}

function buildFolder(id: unknown, title: unknown, path: unknown, thumbOrOpts?: unknown, isLeaf?: unknown): ContentFolder {
  const folder: ContentFolder = { type: "folder", id: str(id), title: str(title), path: str(path) };
  if (thumbOrOpts && typeof thumbOrOpts === "object" && !Array.isArray(thumbOrOpts)) {
    const opts = thumbOrOpts as Record<string, unknown>;
    if (opts.thumbnail !== undefined && opts.thumbnail !== null && opts.thumbnail !== "") folder.thumbnail = str(opts.thumbnail);
    if (opts.isLeaf !== undefined && opts.isLeaf !== null) folder.isLeaf = !!opts.isLeaf;
  } else {
    if (thumbOrOpts !== undefined && thumbOrOpts !== null && thumbOrOpts !== "") folder.thumbnail = str(thumbOrOpts);
    if (isLeaf !== undefined && isLeaf !== null) folder.isLeaf = !!isLeaf;
  }
  return folder;
}

function buildFile(id: unknown, title: unknown, url: unknown, opts?: unknown): ContentFile {
  const urlStr = str(url);
  const o = (opts && typeof opts === "object" && !Array.isArray(opts) ? opts : {}) as Record<string, unknown>;
  const explicitType = typeof o.mediaType === "string" ? o.mediaType : undefined;
  const mediaType = explicitType === "video" || explicitType === "image" || explicitType === "audio"
    ? explicitType
    : detectMediaType(urlStr, explicitType);
  const out: ContentFile = { type: "file", id: str(id), title: str(title), mediaType, url: urlStr };
  const optionalKeys = [
    "thumbnail", "downloadUrl", "muxPlaybackId", "decryptionKey", "mediaId", "pingbackUrl", "seconds", "loop", "loopVideo", "streamUrl", "providerData"
  ] as const;
  for (const key of optionalKeys) {
    if (o[key] !== undefined && o[key] !== null) (out as unknown as Record<string, unknown>)[key] = o[key];
  }
  return out;
}

function buildDownload(title: unknown, url: unknown, opts?: unknown): ContentDownload {
  const o = (opts && typeof opts === "object" && !Array.isArray(opts) ? opts : {}) as Record<string, unknown>;
  const dl: ContentDownload = { title: str(title), url: str(url) };
  if (o.id !== undefined && o.id !== null) dl.id = str(o.id);
  if (o.fileType !== undefined && o.fileType !== null) dl.fileType = str(o.fileType);
  if (typeof o.bytes === "number" && o.bytes > 0) dl.bytes = o.bytes;
  return dl;
}

/**
 * Fixed shared transformation library available to every provider manifest.
 * Side-effect-free functions covering content building, media/Mux/WP helpers, instructions/plans,
 * text/markdown, lists, objects, dates and network auth conversion.
 */
export const FUNCTIONS: Record<string, (...args: unknown[]) => unknown> = {
  /** The value itself when it is an array, else the first array found under the given keys, else []. */
  list: (value, ...keys) => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    for (const key of keys) {
      const found = (value as Record<string, unknown>)[String(key)];
      if (Array.isArray(found)) return found;
    }
    return [];
  },
  trim: (value) => (typeof value === "string" ? value.trim() : ""),
  trimEnd: (value) => (typeof value === "string" ? value.trimEnd() : ""),
  str,
  number: (v) => Number(v),
  isMedia: (url) => (typeof url === "string" ? isMediaFile(url) : false),
  mediaType: (url, hint) => detectMediaType(typeof url === "string" ? url : "", typeof hint === "string" ? hint : undefined),
  isPlaylistMedia: (url, fileType, name) => isPlaylistMedia(str(url), typeof fileType === "string" ? fileType : undefined, typeof name === "string" ? name : undefined),
  wpThumb,
  muxStreamUrl: (playbackId, quality) => (playbackId ? `https://stream.mux.com/${str(playbackId)}/${quality ? str(quality) : "capped-1080p.mp4"}` : ""),
  muxThumbnail: (playbackId, width, height) => (playbackId ? `https://image.mux.com/${str(playbackId)}/thumbnail.jpg?width=${width ? Number(width) : 400}&height=${height ? Number(height) : 225}` : undefined),
  muxPlaybackId: (url) => {
    const m = /stream\.mux\.com\/([^/]+)/.exec(str(url));
    return m ? m[1] : undefined;
  },
  slugify: (v) => slugify(str(v)),
  stripMarkdown: (v) => stripMarkdown(str(v)),
  truncate: (v, maxLen, suffix) => {
    const s = str(v);
    const max = maxLen !== undefined ? Number(maxLen) : 100;
    const suf = suffix !== undefined ? str(suffix) : "…";
    return s.length > max ? s.slice(0, max).trimEnd() + suf : s;
  },
  truncateLabel: (v, maxLen, suffix) => truncateLabel(str(v), maxLen !== undefined ? Number(maxLen) : 100, suffix !== undefined ? str(suffix) : "..."),
  oneOf: (value, ...options) => options.includes(value),

  // dates & time
  /** True when the date is earlier than `days` days from now (past dates included). */
  beforeDaysFromNow: (date, days) => {
    const time = new Date(String(date)).getTime();
    return !Number.isNaN(time) && time < Date.now() + Number(days) * 86400000;
  },
  /** "2026-11-27" from any date string; "" when it doesn't parse. */
  isoDate: (date) => {
    const d = new Date(String(date));
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  },
  /** Local calendar date "YYYY-MM-DD" offset by `days` from today (e.g. -1 for yesterday). */
  localDateOffset: (days) => localDateOffset(days !== undefined ? Number(days) : 0),
  /** Epoch milliseconds from a date string; NaN when invalid. */
  timestamp: (date) => new Date(String(date)).getTime(),
  now: () => Date.now(),

  /** Name an intermediate value: with(find(list, x => ...), found => found && found.id). */
  with: (value, fn) => callLambda(fn, value),

  // lists
  map: (list, fn) => arr(list).map((x, i) => callLambda(fn, x, i)),
  filter: (list, fn) => arr(list).filter((x, i) => callLambda(fn, x, i)),
  compact: (list) => arr(list).filter(x => x !== null && x !== undefined && x !== false),
  find: (list, fn) => arr(list).find((x, i) => callLambda(fn, x, i)),
  findIndex: (list, fn) => arr(list).findIndex((x, i) => callLambda(fn, x, i)),
  some: (list, fn) => arr(list).some((x, i) => callLambda(fn, x, i)),
  every: (list, fn) => arr(list).every((x, i) => callLambda(fn, x, i)),
  flatMap: (list, fn) => arr(list).flatMap((x, i) => { const r = callLambda(fn, x, i); return Array.isArray(r) ? r : [r]; }),
  flat: (list) => arr(list).flat(),
  reduce: (list, fn, init) => arr(list).reduce((acc, x, i) => callLambda(fn, acc, x, i), init),
  /** Sort a copy by key: mode "text" (default, locale-aware), "natural" (numbers inside text, case-insensitive), "number" or "raw" (plain code-unit order). */
  sortBy: (list, fn, mode, desc) => {
    const cmp = compare(mode);
    return [...arr(list)].sort((a, b) => (desc ? -1 : 1) * cmp(callLambda(fn, a), callLambda(fn, b)));
  },
  unique: (list) => [...new Set(arr(list))],
  /** Runs of consecutive items with the same key: [{ key, items }]. */
  groupConsecutive: (list, fn) => {
    const groups: { key: unknown; items: unknown[] }[] = [];
    for (const [i, x] of arr(list).entries()) {
      const key = callLambda(fn, x, i);
      const last = groups[groups.length - 1];
      if (last && last.key === key && key !== null && key !== undefined) last.items.push(x);
      else groups.push({ key, items: [x] });
    }
    return groups;
  },
  /** Group items by key into [{ key, items }], preserving first-seen key order. */
  groupBy: (list, fn) => {
    const map = new Map<unknown, unknown[]>();
    for (const [i, x] of arr(list).entries()) {
      const key = callLambda(fn, x, i);
      const bucket = map.get(key);
      if (bucket) bucket.push(x);
      else map.set(key, [x]);
    }
    return Array.from(map.entries(), ([key, items]) => ({ key, items }));
  },
  len: (v) => (Array.isArray(v) || typeof v === "string" ? v.length : 0),
  slice: (v, start, end) => (Array.isArray(v) || typeof v === "string" ? v.slice(Number(start) || 0, end === undefined ? undefined : Number(end)) : undefined),
  concat: (...lists) => lists.flatMap(l => (Array.isArray(l) ? l : l === undefined || l === null ? [] : [l])),
  includes: (v, x) => (Array.isArray(v) ? v.includes(x) : typeof v === "string" ? v.includes(str(x)) : false),
  indexOf: (v, x) => (Array.isArray(v) ? v.indexOf(x) : typeof v === "string" ? v.indexOf(str(x)) : -1),
  join: (list, sep) => arr(list).map(str).join(sep === undefined ? "," : str(sep)),
  min: (...v) => Math.min(...v.map(Number)),
  max: (...v) => Math.max(...v.map(Number)),
  round: (v) => Math.round(Number(v)),
  floor: (v) => Math.floor(Number(v)),

  // objects
  keys: (o) => (o && typeof o === "object" ? Object.keys(o) : []),
  values: (o) => (o && typeof o === "object" ? Object.values(o) : []),
  entries: (o) => (o && typeof o === "object" ? Object.entries(o) : []),
  fromEntries: (list) => Object.fromEntries(arr(list).filter(e => Array.isArray(e) && !FORBIDDEN_KEYS.has(str(e[0]))) as [string, unknown][]),
  merge: (...objs) => Object.assign({}, ...objs.filter(o => o && typeof o === "object" && !Array.isArray(o))),
  isArray: (v) => Array.isArray(v),
  isString: (v) => typeof v === "string",
  isNumber: (v) => typeof v === "number" && !Number.isNaN(v),
  isObject: (v) => !!v && typeof v === "object" && !Array.isArray(v),

  // strings
  lower: (v) => str(v).toLowerCase(),
  upper: (v) => str(v).toUpperCase(),
  split: (v, sep) => str(v).split(str(sep)),
  startsWith: (v, x) => str(v).startsWith(str(x)),
  endsWith: (v, x) => str(v).endsWith(str(x)),
  replace: (v, pattern, replacement, flags) => str(v).replace(regex(pattern, flags ?? "g"), str(replacement)),
  test: (v, pattern, flags) => regex(pattern, flags).test(str(v)),
  match: (v, pattern, flags) => {
    const m = regex(pattern, flags).exec(str(v));
    return m ? [...m] : null;
  },
  search: (v, pattern, flags) => str(v).search(regex(pattern, flags)),
  json: (v) => JSON.stringify(v),
  parseJson: (v) => {
    try {
      return JSON.parse(str(v));
    } catch {
      return null;
    }
  },
  encode: (v) => encodeURIComponent(str(v)),
  decode: (v) => {
    try {
      return decodeURIComponent(str(v));
    } catch {
      return str(v);
    }
  },
  /** Set query parameters on a URL; a null value removes that parameter. */
  urlParams: (url, params) => {
    try {
      const u = new URL(str(url));
      for (const [k, v] of Object.entries((params as Record<string, unknown>) || {})) {
        if (v === null || v === undefined) u.searchParams.delete(k);
        else u.searchParams.set(k, str(v));
      }
      return u.toString();
    } catch {
      return str(url);
    }
  },

  // content, instruction & plan helpers
  folder: buildFolder,
  file: buildFile,
  download: buildDownload,
  normalizeItemType: (t) => normalizeItemType(typeof t === "string" ? t : undefined),
  filesToInstructions: (name, files, sectionId, sectionLabel) => filesToInstructions(str(name), arr(files) as ContentFile[], sectionId ? { id: str(sectionId), label: sectionLabel === undefined ? undefined : str(sectionLabel) } : undefined),
  instructionItems: (files) => filesToInstructions("", arr(files) as ContentFile[]).items as InstructionItem[],
  instructionsToPlaylist: (instructions) => (instructions && typeof instructions === "object" ? instructionsToPlaylist(instructions as Instructions) : []),
  navigateToPath: (instructions, path) => (instructions && typeof instructions === "object" && typeof path === "string" ? navigateToPath(instructions as Instructions, path) : null),
  findFirstThumbnail: (items) => findFirstThumbnail(arr(items) as InstructionItem[]),
  orderPlanFiles: (instructions, customPlanItems) => (instructions && typeof instructions === "object" ? getOrderedFiles(instructions as Instructions, Array.isArray(customPlanItems) ? customPlanItems as PlanOrderItem[] : undefined) : []),
  networkAuth: (instance, scope) => networkInstanceToAuth(instance as NetworkInstance, str(scope) || "network"),
  networkInstance: (auth) => authToNetworkInstance(auth as ContentProviderAuthData | null | undefined)
};
