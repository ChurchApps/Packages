export interface DriveItem {
  id: string;
  name: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  thumbnails?: { medium?: { url: string } }[];
}

export interface DriveItemListResponse {
  value: DriveItem[];
  "@odata.nextLink"?: string;
}
