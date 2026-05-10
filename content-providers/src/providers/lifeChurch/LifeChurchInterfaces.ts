export interface LifeChurchLesson {
  id: string;
  title: string;
  youtubeId: string;
  videoUrl: string;
  thumbnail?: string;
  sourceUrl: string;
}

export interface LifeChurchUnit {
  id: string;
  name: string;
  thumbnail?: string;
  sourceUrl: string;
  lessons: LifeChurchLesson[];
}

export interface LifeChurchSeries {
  id: string;
  name: string;
  ageGroup: string;
  description?: string;
  thumbnail?: string;
  sourceUrl: string;
  units: LifeChurchUnit[];
}

export interface LifeChurchData {
  generatedAt: string;
  source: string;
  series: LifeChurchSeries[];
}
