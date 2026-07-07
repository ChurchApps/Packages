import { ContentFile, ContentFolder } from "../../interfaces";
import { detectMediaType, isMediaFile } from "../../utils";
import { DropboxEntry, DropboxFileEntry, DropboxFolderEntry } from "./DropboxInterfaces";

export function folderEntryToContentFolder(entry: DropboxFolderEntry, isLeaf?: boolean): ContentFolder {
  return { type: "folder", id: entry.id, title: entry.name, path: entry.path_lower, isLeaf };
}

export function fileEntryToContentFile(entry: DropboxFileEntry, url: string, downloadUrl?: string | null): ContentFile {
  const mediaType = detectMediaType(entry.name);

  // Videos: real duration from media_info (milliseconds). Images: intentionally no
  // duration — playback apps keep them up until the operator advances.
  const durationMs = entry.media_info?.metadata?.duration;
  const seconds = mediaType === "video" && durationMs ? Math.round(durationMs / 1000) : undefined;

  // Images are their own thumbnail (the shared raw link renders in an <img> tag).
  // Videos get none here — Dropbox video thumbnails need an authed byte fetch;
  // consumers can paint a first frame from the url instead.
  const thumbnail = mediaType === "image" ? url : undefined;

  return {
    type: "file",
    id: entry.id,
    title: entry.name,
    mediaType,
    url,
    downloadUrl: downloadUrl || url,
    seconds,
    thumbnail
  };
}

export function filterMediaEntries(entries: DropboxEntry[]): { folders: DropboxFolderEntry[]; mediaFiles: DropboxFileEntry[] } {
  const folders: DropboxFolderEntry[] = [];
  const mediaFiles: DropboxFileEntry[] = [];
  for (const entry of entries) {
    if (entry[".tag"] === "folder") folders.push(entry);
    else if (entry[".tag"] === "file" && isMediaFile(entry.name)) mediaFiles.push(entry);
  }
  return { folders, mediaFiles };
}
