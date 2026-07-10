export interface GoCurriculumPlaylistItem {
  title: string;
  file: string;
  url: string;
  mediaType?: string;
  duration?: number;
  thumbnail?: string;
  shareUrl?: string;
}

export interface GoCurriculumResource {
  title: string;
  file: string;
  url: string;
  shareUrl?: string;
}

export interface GoCurriculumLesson {
  id: string;
  name: string;
  thumbnail?: string;
  bigIdea?: string;
  bibleBasis?: string;
  keyVerse?: string;
  playlist: GoCurriculumPlaylistItem[];
  resources?: GoCurriculumResource[];
}

export interface GoCurriculumCollection {
  id: string;
  name: string;
  thumbnail?: string;
  lessons: GoCurriculumLesson[];
}

export interface GoCurriculumData {
  generatedAt?: string;
  provider?: { name?: string };
  catalog: GoCurriculumCollection[];
}
