/**
 * Typed shapes for the CBN FreePlay API responses.
 * Base: https://<host>/wp-json/superbook/v1
 */

/** Either a URL string or WordPress attachment object; use resolveThumb() to normalize. */
export type CbnThumb = string | { url?: string; sizes?: Record<string, unknown> };

/** A course stub from GET /catalog */
export interface CbnCatalogCourse {
  id: number;
  title: string;
  season: string;
  episode: string;
  lesson_count: number;
  video_count: number;
  thumb: CbnThumb;
  detail_url: string;
}

/** A lesson stub nested in a course detail response */
export interface CbnLesson {
  id: number;
  title: string;
  slug: string;
  lesson_number: string;
  video_count: number;
  thumb: CbnThumb;
  playlist_url: string;
}

/** Full course detail from GET /catalog/{course_id} */
export interface CbnCourseDetail {
  id: number;
  title: string;
  season: string;
  episode: string;
  summary: string;
  description: string;
  thumb: string;
  lesson_count: number;
  lessons: CbnLesson[];
}

/** A single video from a lesson playlist */
export interface CbnPlaylistVideo {
  title: string;
  video_id: string;
  account_id: string;
  playback_url: string;
  /** Direct progressive MP4 URL resolved server-side; null if unavailable. */
  mp4_url: string | null;
}

/** Full playlist from GET /lesson-playlist/{lesson_id} */
export interface CbnLessonPlaylist {
  brightcove_policy_key: string;
  course_id: number;
  course_title: string;
  course_season: string;
  course_episode: string;
  lesson_id: number;
  lesson_title: string;
  lesson_number: string;
  video_count: number;
  playlist: CbnPlaylistVideo[];
}
