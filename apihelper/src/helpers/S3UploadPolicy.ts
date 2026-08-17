export const PUBLIC_CONTENT_TYPE_PREFIXES = ["image/", "video/", "audio/", "application/pdf", "font/", "application/font-", "application/vnd.ms-fontobject", "text/css"] as const;
export const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;
export const DEFAULT_CONTENT_TYPE = "application/octet-stream";

// RFC 7231 type/subtype using RFC 7230 token characters, after parameters are stripped.
const CONTENT_TYPE_PATTERN = /^[a-z0-9!#$%&'*+.^_`|~-]+\/[a-z0-9!#$%&'*+.^_`|~-]+$/;

const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  avif: "image/avif",
  bmp: "image/bmp",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
  css: "text/css"
};

export function normalizeContentType(contentType: string | undefined): string {
  return (contentType || "").split(";")[0].trim().toLowerCase();
}

export function isAllowedContentType(contentType: string | undefined): boolean {
  const ct = normalizeContentType(contentType);
  if (!ct) return false;
  return PUBLIC_CONTENT_TYPE_PREFIXES.some((prefix) => ct === prefix || ct.startsWith(prefix));
}

export function inferContentTypeFromKey(key: string): string {
  const base = key.split("?")[0].split("#")[0];
  const ext = base.includes(".") ? base.split(".").pop()!.toLowerCase() : "";
  return EXT_TO_CONTENT_TYPE[ext] || "";
}

export function isValidContentType(contentType: string | undefined): boolean {
  return CONTENT_TYPE_PATTERN.test(normalizeContentType(contentType));
}

// Never throws: a type outside the public allowlist is still uploadable, it just lands
// on a private object (see s3ObjectAcl). This mirrors the S3Upload buffer path so
// generic file attachments keep working.
export function resolveUploadContentType(contentType: string | undefined, key: string): string {
  const provided = normalizeContentType(contentType);
  if (isValidContentType(provided)) return provided;
  return inferContentTypeFromKey(key) || DEFAULT_CONTENT_TYPE;
}

export function resolveMaxUploadBytes(size?: number): number {
  if (typeof size === "number" && Number.isFinite(size) && size > 0) return Math.min(Math.floor(size), MAX_UPLOAD_BYTES);
  return MAX_UPLOAD_BYTES;
}

export function s3ObjectAcl(contentType: string | undefined): "public-read" | undefined {
  return isAllowedContentType(contentType) ? "public-read" : undefined;
}

export function buildPresignedPostConditions(contentType: string, size?: number): Array<Record<string, string> | (string | number)[]> {
  const conditions: Array<Record<string, string> | (string | number)[]> = [
    ["eq", "$Content-Type", contentType],
    ["content-length-range", 1, resolveMaxUploadBytes(size)]
  ];
  const acl = s3ObjectAcl(contentType);
  if (acl) conditions.push({ acl });
  return conditions;
}

// input.acl is accepted and ignored on purpose - the ACL is decided from the resolved type.
export function buildS3UploadPolicy(input: { key: string; contentType?: string; size?: number; acl?: string }) {
  const contentType = resolveUploadContentType(input.contentType, input.key);
  return { contentType, conditions: buildPresignedPostConditions(contentType, input.size), acl: s3ObjectAcl(contentType) };
}
