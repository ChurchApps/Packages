import { ContentFile, ContentFolder, Instructions, InstructionItem } from "../../interfaces";
import { DropboxEntry, DropboxFileEntry, DropboxFolderEntry } from "./DropboxInterfaces";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".tiff", ".tif"]);
const MEDIA_EXTENSIONS = new Set([...VIDEO_EXTENSIONS, ...IMAGE_EXTENSIONS]);

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.substring(lastDot).toLowerCase();
}

export function isMediaFile(filename: string): boolean {
  return MEDIA_EXTENSIONS.has(getFileExtension(filename));
}

export function getMediaType(filename: string): "video" | "image" {
  return VIDEO_EXTENSIONS.has(getFileExtension(filename)) ? "video" : "image";
}

export function folderEntryToContentFolder(entry: DropboxFolderEntry, isLeaf?: boolean): ContentFolder {
  return { type: "folder", id: entry.id, title: entry.name, path: entry.path_lower, isLeaf };
}

export function fileEntryToContentFile(entry: DropboxFileEntry, url: string, downloadUrl?: string | null): ContentFile {
  return {
    type: "file",
    id: entry.id,
    title: entry.name,
    mediaType: getMediaType(entry.name),
    url,
    downloadUrl: downloadUrl || url
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

export function buildInstructionsFromFiles(files: ContentFile[], folderName: string): Instructions {
  const actionItems: InstructionItem[] = files.map(file => ({
    id: file.id + "-action",
    itemType: "action",
    label: file.title,
    actionType: "play",
    children: [{
      id: file.id,
      itemType: "file",
      label: file.title,
      seconds: file.seconds,
      downloadUrl: file.downloadUrl || file.url,
      thumbnail: file.thumbnail
    }]
  }));

  const sectionItem: InstructionItem = {
    id: "dropbox-section",
    itemType: "section",
    label: folderName,
    children: actionItems
  };

  return { name: folderName, items: [sectionItem] };
}
