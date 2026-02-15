import { ContentFolder, ContentFile } from "./interfaces";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function detectMediaType(url: string, explicitType?: string): "video" | "image" {
  if (explicitType === "video") return "video";
  const videoPatterns = [".mp4", ".webm", ".m3u8", ".mov", "stream.mux.com"];
  return videoPatterns.some(p => url.includes(p)) ? "video" : "image";
}

export function createFolder(id: string, title: string, path: string, thumbnail?: string, isLeaf?: boolean): ContentFolder {
  return { type: "folder", id, title, path, thumbnail, isLeaf };
}

export function createFile(id: string, title: string, url: string, options?: { mediaType?: "video" | "image"; thumbnail?: string; muxPlaybackId?: string; seconds?: number; loop?: boolean; loopVideo?: boolean; streamUrl?: string; }): ContentFile {
  return { type: "file", id, title, url, mediaType: options?.mediaType ?? detectMediaType(url), thumbnail: options?.thumbnail, muxPlaybackId: options?.muxPlaybackId, seconds: options?.seconds, loop: options?.loop, loopVideo: options?.loopVideo, streamUrl: options?.streamUrl };
}
