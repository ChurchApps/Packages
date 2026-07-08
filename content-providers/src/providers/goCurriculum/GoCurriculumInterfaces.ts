export interface GoCurriculumFile {
  id: string;
  name: string;
  url: string;
  fileType?: string;
  seconds?: number;
  loop?: boolean;
  loopVideo?: boolean;
  thumbnail?: string;
}

export interface GoCurriculumLesson {
  id: string;
  name: string;
  image?: string;
  files: GoCurriculumFile[];
}

export interface GoCurriculumCollection {
  id: string;
  name: string;
  image?: string;
  lessons: GoCurriculumLesson[];
}

export interface GoCurriculumData {
  collections: GoCurriculumCollection[];
}
