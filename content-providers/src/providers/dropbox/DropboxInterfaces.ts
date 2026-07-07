export interface DropboxFolderEntry {
  ".tag": "folder";
  id: string;
  name: string;
  path_lower: string;
  path_display: string;
}

export interface DropboxMediaMetadata {
  ".tag": "photo" | "video";
  /** Video duration in milliseconds. Only present for videos, and only once Dropbox has processed the file. */
  duration?: number;
  dimensions?: { height: number; width: number };
}

export interface DropboxMediaInfo {
  ".tag": "metadata" | "pending";
  metadata?: DropboxMediaMetadata;
}

export interface DropboxFileEntry {
  ".tag": "file";
  id: string;
  name: string;
  path_lower: string;
  path_display: string;
  size: number;
  is_downloadable: boolean;
  /** Present when list_folder is called with include_media_info: true. */
  media_info?: DropboxMediaInfo;
}

export type DropboxEntry = DropboxFolderEntry | DropboxFileEntry;

export interface DropboxListFolderResponse {
  entries: DropboxEntry[];
  cursor: string;
  has_more: boolean;
}

export interface DropboxTemporaryLinkResponse {
  metadata: DropboxFileEntry;
  link: string;
}

export interface DropboxSharedLinkResponse {
  url: string;
  path_lower: string;
  name: string;
  ".tag"?: string;
}
