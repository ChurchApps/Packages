export interface ArclightImageUrls {
  thumbnail?: string;
  videoStill?: string;
  mobileCinematicHigh?: string;
  mobileCinematicLow?: string;
  mobileCinematicVeryLow?: string;
}

export interface ArclightMediaComponent {
  mediaComponentId: string;
  componentType: string;
  subType: string;
  contentType: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  lengthInMilliseconds: number;
  containsCount: number;
  isDownloadable: boolean;
  imageUrls: ArclightImageUrls;
}

export interface ArclightMediaListResponse {
  _embedded: { mediaComponents: ArclightMediaComponent[] };
  page: number;
  limit: number;
  pages: number;
  total: number;
}

export interface ArclightDownloadUrl {
  url: string;
  width: number;
  height: number;
  sizeInBytes: number;
  bitrate: number;
}

export interface ArclightLanguageVariant {
  downloadUrls: {
    low?: ArclightDownloadUrl;
    high?: ArclightDownloadUrl;
  };
  shareUrl?: string;
}
