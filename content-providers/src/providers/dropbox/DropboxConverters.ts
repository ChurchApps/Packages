import { ContentFile, ContentFolder } from "../../interfaces";
import { detectMediaType, isMediaFile } from "../../utils";
import { DropboxEntry, DropboxFileEntry, DropboxFolderEntry } from "./DropboxInterfaces";

export function folderEntryToContentFolder(entry: DropboxFolderEntry, isLeaf?: boolean): ContentFolder {
  return { type: "folder", id: entry.id, title: entry.name, path: entry.path_lower, isLeaf };
}

export function fileEntryToContentFile(entry: DropboxFileEntry, url: string, downloadUrl?: string | null): ContentFile {
  return {
    type: "file",
    id: entry.id,
    title: entry.name,
    mediaType: detectMediaType(entry.name),
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
  // Dropbox returns entries in arbitrary order; sort by name numeric-aware so 01/02/03-style
  // prefixes order naturally ("2 Song" before "10 Closer") instead of lexically.
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  folders.sort(byName);
  mediaFiles.sort(byName);
  return { folders, mediaFiles };
}
