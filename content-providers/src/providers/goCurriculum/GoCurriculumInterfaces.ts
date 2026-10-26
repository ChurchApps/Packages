interface GoCurriculumPlaylistItem {
  title: string;
  file: string;
  url: string;
  mediaType?: string;
  duration?: number;
  thumbnail?: string;
  shareUrl?: string;
}

interface GoCurriculumResource {
  title: string;
  file: string;
  url: string;
  shareUrl?: string;
}

interface GoCurriculumGuideFile {
  file: string;
  url: string;
  mediaType?: string;
  thumbnail?: string;
  seconds?: number;
}

export interface GoCurriculumGuideItem {
  type: string;
  content: string;
  files?: GoCurriculumGuideFile[];
}

interface GoCurriculumGuideSection {
  name: string;
  role?: string;
  items: GoCurriculumGuideItem[];
}

export interface GoCurriculumGuide {
  source?: string;
  sections: GoCurriculumGuideSection[];
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
  script?: GoCurriculumGuide;
  smallGroup?: GoCurriculumGuide;
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
