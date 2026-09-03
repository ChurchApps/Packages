// Cross-app contract for the content commons: the Api validates against it, B1Admin renders
// from it, and every product's submit form is generated from the ASSET_TYPES registry.

export type AssetStatus = "pending" | "published" | "unpublished" | "removed";
export type SubmissionStatus = "draft" | "pending" | "approved" | "rejected" | "withdrawn";
export type FileAction = "add" | "replace" | "remove";
export type ContentLicense = "PD" | "WC" | "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "CC-BY-NC-SA";
export type RejectReason = "quality" | "duplicate" | "licensing" | "offtopic" | "incomplete" | "other";
export type ReportReason = "copyright" | "policy" | "quality" | "other";
export type ReportResolution = "upheld" | "dismissed" | "duplicate";
export type RemovedReason = "copyright" | "policy" | "publisher";
export type CommonsProduct = "worshipcommons" | "freeshow" | "lessons" | "b1";

export interface CommonsAssetInterface {
  id?: string;
  assetType?: string;
  name?: string;
  description?: string;
  tags?: string;
  language?: string;
  license?: ContentLicense;
  publisherUserId?: string;
  publisherChurchId?: string;
  publisherName?: string;
  status?: AssetStatus;
  featured?: boolean;
  downloadCount?: number;
  ratingCount?: number;
  ratingAverage?: number;
  version?: number;
  removedReason?: RemovedReason;
  publishedAt?: string;
  createdAt?: string;
  modifiedAt?: string;
  files?: CommonsFileInterface[];
  fileUrls?: Record<string, string>;
  detail?: Record<string, unknown>;
  myRating?: number | null;
  mySaved?: boolean;
  hasPendingSubmission?: boolean;
}

export interface CommonsFileInterface {
  id?: string;
  name?: string;
  role?: string;
  action?: FileAction;
  sizeBytes?: number;
  contentHash?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  url?: string;
}

export interface CommonsSubmissionPayload {
  name?: string;
  description?: string;
  tags?: string;
  language?: string;
  license?: ContentLicense;
  publisherChurchId?: string;
  detail?: Record<string, unknown>;
}

export interface CommonsSubmissionInterface {
  id?: string;
  assetId?: string;
  assetType?: string;
  assetName?: string;
  assetStatus?: AssetStatus;
  isNewAsset?: boolean;
  isThirdParty?: boolean;
  submittedBy?: string;
  submittedByName?: string;
  status?: SubmissionStatus;
  payload?: CommonsSubmissionPayload;
  note?: string;
  triageScore?: number;
  files?: CommonsFileInterface[];
  reviewedBy?: string;
  reviewedAt?: string;
  reviewReason?: RejectReason;
  reviewNote?: string;
  createdAt?: string;
  submittedAt?: string;
}

export interface CommonsHistoryEntryInterface {
  submissionId?: string;
  submittedBy?: string;
  submittedByName?: string;
  submittedAt?: string;
  approvedAt?: string;
  note?: string;
  filesChanged?: { name: string; action: FileAction }[];
  fieldsChanged?: string[];
}

export interface CommonsReportInterface {
  id?: string;
  assetId?: string;
  assetName?: string;
  contentText?: string;
  reason?: ReportReason;
  reporterUserId?: string;
  reporterRole?: string;
  details?: string;
  name?: string;
  email?: string;
  signature?: string;
  status?: "open" | "reviewing" | "resolved";
  resolution?: ReportResolution;
  resolutionNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt?: string;
}

export interface CommonsRatingInterface {
  assetId?: string;
  stars?: number | null;
  saved?: boolean;
}

export interface AssetFileRole {
  role: string;
  namePattern: string;
  extensions: string[];
  required?: boolean;
  maxBytes?: number;
  multiple?: boolean;
  generated?: boolean;
}

export interface AssetDetailField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "boolean";
  options?: string[];
  required?: boolean;
  maxLength?: number;
}

export interface AssetAttestation {
  key: string;
  label: string;
  requiredWhenRole?: string;
}

export interface AssetTypeDefinition {
  key: string;
  label: string;
  product: CommonsProduct;
  licenses: ContentLicense[];
  defaultLicense: ContentLicense;
  files: AssetFileRole[];
  detailFields?: AssetDetailField[];
  attestations?: AssetAttestation[];
  maxTotalBytes: number;
  previewUrl?: string;
  hasSatellite?: boolean;
}

export const COMMONS_PRODUCT_LABELS: Record<CommonsProduct, string> = { worshipcommons: "WorshipCommons", freeshow: "FreeShow", lessons: "Lessons", b1: "B1" };

const MB = 1048576;
const IMAGE_EXT = ["png", "jpg", "jpeg", "webp"];
const OPEN_LICENSES: ContentLicense[] = ["CC0", "CC-BY", "CC-BY-SA"];
const THUMB: AssetFileRole = { role: "thumb", namePattern: "thumb.{ext}", extensions: IMAGE_EXT, maxBytes: 2 * MB };
const MANIFEST: AssetFileRole = { role: "manifest", namePattern: "manifest.json", extensions: ["json"], generated: true };

const freeshowType = (kind: string, label: string, ext: string): AssetTypeDefinition => ({
  key: `freeshow/${kind}`,
  label,
  product: "freeshow",
  licenses: OPEN_LICENSES,
  defaultLicense: "CC0",
  files: [{ role: "content", namePattern: "content.{ext}", extensions: [ext, "json", "zip"], required: true, maxBytes: 25 * MB }, THUMB, MANIFEST],
  detailFields: [{ key: "appMinVersion", label: "Minimum FreeShow version", type: "text", maxLength: 20 }],
  maxTotalBytes: 50 * MB
});

export const ASSET_TYPES: Record<string, AssetTypeDefinition> = {
  song: {
    key: "song",
    label: "Song",
    product: "worshipcommons",
    licenses: ["WC", "PD", "CC-BY"], // uploadable set: WC (default), PD (CC0 dedication), CC BY 4.0 — SA and NC exist for harvested catalog rows only
    defaultLicense: "WC",
    hasSatellite: true,
    files: [
      { role: "demoAudio", namePattern: "demoAudio.{ext}", extensions: ["mp3", "wav", "m4a", "ogg"], maxBytes: 25 * MB },
      { role: "sheetPdf", namePattern: "sheetPdf.{ext}", extensions: ["pdf", "xml", "musicxml"], maxBytes: 25 * MB },
      { role: "stemsZip", namePattern: "stemsZip.{ext}", extensions: ["zip"], maxBytes: 50 * MB },
      { role: "midi", namePattern: "tune.mid", extensions: ["mid", "midi"], maxBytes: MB },
      { role: "abc", namePattern: "tune.abc", extensions: ["abc"], maxBytes: MB },
      { role: "timing", namePattern: "timing.json", extensions: ["json"], maxBytes: MB },
      { role: "art", namePattern: "art.{ext}", extensions: IMAGE_EXT, maxBytes: 5 * MB },
      { role: "thumb", namePattern: "art-thumb.webp", extensions: ["webp"], maxBytes: MB },
      { role: "song", namePattern: "song.json", extensions: ["json"], generated: true },
      { role: "chart", namePattern: "lyrics.chordpro", extensions: ["chordpro"], generated: true },
      MANIFEST
    ],
    detailFields: [
      { key: "writer", label: "Writer(s)", type: "text", required: true, maxLength: 255 },
      { key: "chordPro", label: "Lyrics and chords", type: "textarea", required: true, maxLength: 100000 },
      { key: "year", label: "Year written", type: "number" },
      { key: "songKey", label: "Original key", type: "text", maxLength: 10 },
      { key: "bpm", label: "Tempo (BPM)", type: "number" },
      { key: "timeSignature", label: "Time signature", type: "text", maxLength: 10 },
      { key: "scripture", label: "Scripture reference", type: "text", maxLength: 100 },
      { key: "scriptureText", label: "Scripture text", type: "textarea", maxLength: 500 },
      { key: "videoUrl", label: "Video URL", type: "text", maxLength: 255 },
      { key: "proAnswer", label: "Collecting societies & licensing admins", type: "text", maxLength: 150 }
    ],
    attestations: [
      { key: "certified", label: "I wrote this song or control its copyright and release it under the chosen license." },
      { key: "recordingOwned", label: "This recording is mine (or I have the owner's permission to share it).", requiredWhenRole: "demoAudio" }
    ],
    maxTotalBytes: 100 * MB,
    previewUrl: "https://worshipcommons.org/preview/submission/{submissionId}?token={token}"
  },
  "freeshow/template": freeshowType("template", "FreeShow template", "fstemplate"),
  "freeshow/overlay": freeshowType("overlay", "FreeShow overlay", "fsoverlay"),
  "freeshow/theme": freeshowType("theme", "FreeShow theme", "fstheme"),
  "freeshow/stage": freeshowType("stage", "FreeShow stage layout", "fsstage"),
  "freeshow/action": freeshowType("action", "FreeShow action", "fsaction"),
  lesson: {
    key: "lesson",
    label: "Community lesson",
    product: "lessons",
    licenses: OPEN_LICENSES,
    defaultLicense: "CC-BY",
    files: [
      { role: "lesson", namePattern: "lesson.json", extensions: ["json"], required: true, maxBytes: 5 * MB },
      { role: "thumb", namePattern: "thumb.{ext}", extensions: IMAGE_EXT, maxBytes: 2 * MB },
      { role: "video", namePattern: "video.{ext}", extensions: ["mp4", "webm"], maxBytes: 200 * MB },
      MANIFEST
    ],
    detailFields: [
      { key: "ageRange", label: "Age range", type: "text", maxLength: 50 },
      { key: "series", label: "Series", type: "text", maxLength: 100 }
    ],
    maxTotalBytes: 250 * MB
  },
  "b1/website-template": {
    key: "b1/website-template",
    label: "Website template",
    product: "b1",
    licenses: OPEN_LICENSES,
    defaultLicense: "CC0",
    files: [
      { role: "template", namePattern: "template.json", extensions: ["json"], required: true, maxBytes: 5 * MB },
      { role: "thumb", namePattern: "thumb.{ext}", extensions: IMAGE_EXT, required: true, maxBytes: 2 * MB },
      MANIFEST
    ],
    maxTotalBytes: 10 * MB
  }
};

/** Alias map for conventional names whose role is not basename-minus-extension. */
export const FILE_ROLE_ALIASES: Record<string, string> = {
  "tune.mid": "midi",
  "tune.abc": "abc",
  "timing.json": "timing",
  "art-thumb.webp": "thumb",
  "lyrics.chordpro": "chart"
};

export const fileRole = (name: string): string => FILE_ROLE_ALIASES[name] ?? name.replace(/\.[^.]+$/, "");

/** Conventional storage name for a role given the uploaded file's extension, or null when the extension is not allowed. */
export function conventionalFileName(def: AssetTypeDefinition, role: string, originalName: string): string | null {
  const spec = def.files.find((f) => f.role === role);
  if (!spec || spec.generated) return null;
  const ext = (originalName.includes(".") ? originalName.split(".").pop() || "" : "").toLowerCase();
  if (!spec.extensions.includes(ext)) return null;
  return spec.namePattern.replace("{ext}", ext);
}
