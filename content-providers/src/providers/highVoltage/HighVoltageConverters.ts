import { ContentItem, ContentFile } from "../../interfaces";
import { createFile, createFolder, slugify } from "../../utils";
import { HighVoltageData, LessonFolder, StudyFolder } from "./HighVoltageKidsInterfaces";

export function getCollections(data: HighVoltageData): ContentItem[] {
  return data.collections
    .filter(collection => collection.folders.length > 0)
    .map(collection => {
      const slug = slugify(collection.name);
      return createFolder(slug, collection.name, `/${slug}`);
    });
}

export function getStudyFolders(data: HighVoltageData, collectionSlug: string, currentPath: string): ContentItem[] {
  const collection = data.collections.find(c => slugify(c.name) === collectionSlug);
  if (!collection) return [];
  return collection.folders.map(study => createFolder(study.id, study.name, `${currentPath}/${study.id}`, study.image || undefined));
}

export function getLessonFolders(data: HighVoltageData, collectionSlug: string, studyId: string, currentPath: string): ContentItem[] {
  const collection = data.collections.find(c => slugify(c.name) === collectionSlug);
  if (!collection) return [];

  const study = collection.folders.find(s => s.id === studyId);
  if (!study) return [];

  return study.lessons.map(lesson => createFolder(lesson.id, lesson.name, `${currentPath}/${lesson.id}`, lesson.image || undefined, true));
}

export function getLessonFiles(data: HighVoltageData, collectionSlug: string, studyId: string, lessonId: string): ContentItem[] {
  const collection = data.collections.find(c => slugify(c.name) === collectionSlug);
  if (!collection) return [];

  const study = collection.folders.find(s => s.id === studyId);
  if (!study) return [];

  const lesson = study.lessons.find(l => l.id === lessonId);
  if (!lesson?.files) return [];

  return lesson.files.map(file => createFile(file.id, file.title, file.url, { mediaType: file.mediaType as "video" | "image" }));
}

export function findStudy(data: HighVoltageData, collectionSlug: string, studyId: string): StudyFolder | null {
  const collection = data.collections.find(c => slugify(c.name) === collectionSlug);
  if (!collection) return null;

  const study = collection.folders.find(s => s.id === studyId);
  return study || null;
}

export function findLesson(data: HighVoltageData, collectionSlug: string, studyId: string, lessonId: string): LessonFolder | null {
  const study = findStudy(data, collectionSlug, studyId);
  if (!study) return null;

  const lesson = study.lessons.find(l => l.id === lessonId);
  return lesson || null;
}

export function buildStudyPlaylist(study: StudyFolder): ContentFile[] {
  const allFiles: ContentFile[] = [];
  for (const lesson of study.lessons) {
    for (const file of lesson.files) {
      allFiles.push({ type: "file", id: file.id, title: file.title, mediaType: file.mediaType as "video" | "image", url: file.url, thumbnail: lesson.image });
    }
  }
  return allFiles;
}

export function buildLessonPlaylist(lesson: LessonFolder): ContentFile[] {
  return lesson.files.map(file => ({ type: "file" as const, id: file.id, title: file.title, mediaType: file.mediaType as "video" | "image", url: file.url, thumbnail: lesson.image }));
}
