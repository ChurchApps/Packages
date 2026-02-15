export interface BibleProjectVideo {
  id: string;
  title: string;
  filename: string;
  muxPlaybackId: string;
  videoUrl: string;
  thumbnailUrl?: string;
}

export interface BibleProjectCollection {
  name: string;
  image: string | null;
  videos: BibleProjectVideo[];
}

export interface BibleProjectData {
  collections: BibleProjectCollection[];
}
