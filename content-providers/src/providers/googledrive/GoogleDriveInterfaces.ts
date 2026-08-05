export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  parents?: string[];
}

export interface DriveFileListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}
