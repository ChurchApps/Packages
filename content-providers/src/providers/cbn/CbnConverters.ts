import { ContentFile, ContentItem } from "../../interfaces";
import { createFolder, createFile } from "../../utils";
import { CbnCatalogCourse, CbnLesson, CbnLessonPlaylist, CbnThumb } from "./CbnInterfaces";

/** Normalize a `thumb` (plain URL string or WordPress attachment object) to a URL string. */
export function resolveThumb(thumb: CbnThumb | null | undefined): string | undefined {
  if (typeof thumb === "string") return thumb || undefined;
  if (thumb && typeof thumb === "object") {
    const medium = thumb.sizes?.medium;
    if (typeof medium === "string") return medium;
    if (typeof thumb.url === "string") return thumb.url;
  }
  return undefined;
}

/** Convert /catalog courses into folder items under /catalog */
export function convertCoursesToFolders(courses: CbnCatalogCourse[]): ContentItem[] {
  return courses.map(c => {
    const id = String(c.id);
    return createFolder(id, c.title, `/catalog/${id}`, resolveThumb(c.thumb));
  });
}

/** Convert a course's lessons into leaf folder items under /catalog/{courseId} */
export function convertLessonsToFolders(lessons: CbnLesson[], coursePath: string): ContentItem[] {
  return lessons.map(l => {
    const id = String(l.id);
    return createFolder(id, l.title, `${coursePath}/${id}`, resolveThumb(l.thumb), true);
  });
}

/** Convert playlist to files; CBN server-resolves Brightcove MP4 URLs where available. */
export function convertPlaylistToFiles(playlist: CbnLessonPlaylist): ContentFile[] {
  return playlist.playlist.map(v => {
    const file = createFile(v.video_id, v.title, v.mp4_url || v.playback_url, {
      mediaType: "video",
      thumbnail: undefined
    });
    file.mediaId = v.video_id;
    file.downloadUrl = v.mp4_url ?? undefined;
    file.providerData = {
      brightcovePolicyKey: playlist.brightcove_policy_key,
      brightcoveAccountId: v.account_id,
      brightcoveVideoId: v.video_id,
      brightcovePlaybackUrl: v.playback_url,
      brightcoveMp4Url: v.mp4_url
    };
    return file;
  });
}
