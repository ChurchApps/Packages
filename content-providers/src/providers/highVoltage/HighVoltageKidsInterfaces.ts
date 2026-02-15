export interface LessonFileJson {
  type: string;
  id: string;
  title: string;
  mediaType: string;
  url: string;
}

export interface LessonFolder {
  id: string;
  name: string;
  image: string;
  files: LessonFileJson[];
}

export interface StudyFolder {
  id: string;
  name: string;
  image: string;
  description: string;
  url: string;
  lessonCount: number;
  lessons: LessonFolder[];
}

export interface Collection {
  name: string;
  folders: StudyFolder[];
}

export interface HighVoltageData {
  collections: Collection[];
}
