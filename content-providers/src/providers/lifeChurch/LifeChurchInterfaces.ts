export interface LifeChurchLesson {
  id: string;
  title: string;
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

/** Scheduled lesson from Life.Church's open.life.church calendar; references an existing lesson in the series → unit → lesson tree. */
export interface LifeChurchScheduledLesson {
  id: string;          // stable id, e.g. "loop-2026-05-10"
  weekOf: string;      // ISO Sunday date (YYYY-MM-DD)
  ageGroup: string;    // human label shown in the UI
  sourceTitle: string; // title from the upstream calendar entry
  seriesId: string;
  unitId: string;
  lessonId: string;
}

export interface LifeChurchData {
  generatedAt: string;
  source: string;
  series: LifeChurchSeries[];
  scheduledLessons: LifeChurchScheduledLesson[];
}
