import { ContentFolder, ContentFile, Instructions, InstructionItem } from "./interfaces";

export const IMAGE_DURATION_SECONDS = 15;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".m3u8", ".mov", ".avi", ".mkv", ".m4v"];
const IMAGE_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".tiff", ".tif"
];

export function detectMediaType(url: string, explicitType?: string): "video" | "image" {
  if (explicitType === "video" || explicitType?.startsWith("video/")) return "video";
  if (explicitType === "image" || explicitType?.startsWith("image/")) return "image";
  const lower = url.toLowerCase();
  if (VIDEO_EXTENSIONS.some(p => lower.includes(p)) || lower.includes("stream.mux.com")) return "video";
  return "image";
}

export function isMediaFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return [...VIDEO_EXTENSIONS, ...IMAGE_EXTENSIONS].some(ext => lower.endsWith(ext));
}

export function createFolder(id: string, title: string, path: string, thumbnail?: string, isLeaf?: boolean): ContentFolder {
  return { type: "folder", id, title, path, thumbnail, isLeaf };
}

export function createFile(id: string, title: string, url: string, options?: { mediaType?: "video" | "image"; thumbnail?: string; muxPlaybackId?: string; seconds?: number; loop?: boolean; loopVideo?: boolean; streamUrl?: string; }): ContentFile {
  return { type: "file", id, title, url, mediaType: options?.mediaType ?? detectMediaType(url), thumbnail: options?.thumbnail, muxPlaybackId: options?.muxPlaybackId, seconds: options?.seconds, loop: options?.loop, loopVideo: options?.loopVideo, streamUrl: options?.streamUrl };
}

function generateId(): string {
  return "gen-" + Math.random().toString(36).substring(2, 11);
}

/** Wrap a ContentFile in the standard play-action InstructionItem used by most providers. */
export function fileToActionItem(file: ContentFile): InstructionItem {
  return {
    id: file.id + "-action",
    itemType: "action",
    label: file.title,
    actionType: "play",
    seconds: file.seconds || undefined,
    children: [
      {
        id: file.id,
        itemType: "file",
        label: file.title,
        seconds: file.seconds || undefined,
        downloadUrl: file.downloadUrl || file.url,
        thumbnail: file.thumbnail,
        mediaType: file.mediaType
      }
    ]
  };
}

/** Build the standard section → play-action → file Instructions tree from a flat file list. */
export function filesToInstructions(name: string, files: ContentFile[], section?: { id: string; label?: string }): Instructions {
  const actions = files.map(fileToActionItem);
  const items: InstructionItem[] = section
    ? [{ id: section.id, itemType: "section", label: section.label ?? name, children: actions }]
    : actions;
  return { name, items };
}

/** Flatten an Instructions tree into a playlist of downloadable files. */
export function instructionsToPlaylist(instructions: Instructions): ContentFile[] {
  const files: ContentFile[] = [];

  function extractFiles(items: InstructionItem[]) {
    for (const item of items) {
      if (item.downloadUrl && (item.itemType === "file" || !item.children?.length)) {
        files.push({ type: "file", id: item.id || item.relatedId || generateId(), title: item.label || "Untitled", mediaType: detectMediaType(item.downloadUrl), url: item.downloadUrl, downloadUrl: item.downloadUrl, seconds: item.seconds, thumbnail: item.thumbnail });
      }
      if (item.children) extractFiles(item.children);
    }
  }

  extractFiles(instructions.items);
  return files;
}
