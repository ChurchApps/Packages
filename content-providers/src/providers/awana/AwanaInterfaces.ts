/** Shapes returned by the Awana (Brite) content API at /wp-json/content/v1. */

export interface AwanaChapter {
  id: number;
  name: string;
  url?: string;
}

export interface AwanaLesson {
  id: number;
  name: string;
  description?: string;
  url?: string;
  is_free?: boolean;
  is_sample?: boolean;
  chapters?: AwanaChapter[];
}

export interface AwanaUnit {
  id: number;
  name: string;
  image?: string;
  is_free?: boolean;
  is_sample?: boolean;
  has_files?: boolean;
  lessons: AwanaLesson[];
}

export interface AwanaCourse {
  id: number;
  name: string;
  image?: string;
  is_free?: boolean;
  units: AwanaUnit[];
}

export interface AwanaLibrary {
  courses: AwanaCourse[];
}

export interface AwanaFile {
  id: number;
  name: string;
  /** "Audio & Video" | "Images" | "Documents" | "Chapters" | "Lesson" | "Unit" */
  group?: string;
  type: "video" | "audio" | "image" | "document" | string;
  mime?: string;
  size?: number;
  url: string;
}

/** Response of /units/{id} and /lessons/{id}. */
export interface AwanaFileSet {
  id: number;
  name: string;
  description?: string;
  is_free?: boolean;
  is_sample?: boolean;
  files: AwanaFile[];
}
