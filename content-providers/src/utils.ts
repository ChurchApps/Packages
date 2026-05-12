import { ContentFolder, ContentFile } from "./interfaces";

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
