export interface ParsedPath {
  segments: string[];
  depth: number;
}

/** Parse a path string into segments and depth (e.g. "/lessons/abc/def" → segments: ["lessons", "abc", "def"], depth: 3). */
export function parsePath(path: string | null | undefined): ParsedPath {
  if (!path || path === "/" || path === "") {
    return { segments: [], depth: 0 };
  }
  const segments = path.replace(/^\//, "").split("/").filter(Boolean);
  return { segments, depth: segments.length };
}

/** Get a specific segment from a path by zero-based index, or null if not found. */
export function getSegment(path: string | null | undefined, index: number): string | null {
  const { segments } = parsePath(path);
  return segments[index] ?? null;
}
