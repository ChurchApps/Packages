export interface DropboxFolderEntry {
  ".tag": "folder";
  id: string;
  name: string;
  path_lower: string;
  path_display: string;
}

export interface DropboxFileEntry {
  ".tag": "file";
  id: string;
  name: string;
  path_lower: string;
  path_display: string;
  size: number;
  is_downloadable: boolean;
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
