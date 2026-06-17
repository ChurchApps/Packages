/**
 * Path parsing utilities for content providers.
 * Paths follow the format: /segment1/segment2/segment3/...
 * Example: /lessons/programId/studyId/lessonId/venueId
 */

export interface ParsedPath {
  segments: string[];
  depth: number;
}

/**
 * Parse a path string into segments and depth.
 * @param path - The path to parse (e.g., "/lessons/abc123/def456")
 * @returns Object with segments array and depth count
 */
export function parsePath(path: string | null | undefined): ParsedPath {
  if (!path || path === "/" || path === "") {
    return { segments: [], depth: 0 };
  }
  const segments = path.replace(/^\//, "").split("/").filter(Boolean);
  return { segments, depth: segments.length };
}

/**
 * Get a specific segment from a path by index.
 * @param path - The path to parse
 * @param index - Zero-based index of the segment to retrieve
 * @returns The segment at the given index, or null if not found
 */
export function getSegment(path: string | null | undefined, index: number): string | null {
  const { segments } = parsePath(path);
  return segments[index] ?? null;
}
