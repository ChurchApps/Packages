import { ContentItem, ContentFile, Plan, PlanSection, PlanPresentation } from "../../interfaces";
import { createFile, slugify } from "../../utils";
import { HighVoltageData, LessonFolder, StudyFolder } from "./HighVoltageKidsInterfaces";

export function getCollections(data: HighVoltageData): ContentItem[] {
  return data.collections
    .filter(collection => collection.folders.length > 0)
    .map(collection => ({
      type: "folder" as const,
      id: slugify(collection.name),
      title: collection.name,
      path: `/${slugify(collection.name)}`
    }));
}

export function getStudyFolders(data: HighVoltageData, collectionSlug: string, currentPath: string): ContentItem[] {
  const collection = data.collections.find(c => slugify(c.name) === collectionSlug);
  if (!collection) return [];

  return collection.folders.map(study => ({
    type: "folder" as const,
    id: study.id,
    title: study.name,
    thumbnail: study.image || undefined,
    path: `${currentPath}/${study.id}`
  }));
}

export function getLessonFolders(data: HighVoltageData, collectionSlug: string, studyId: string, currentPath: string): ContentItem[] {
  const collection = data.collections.find(c => slugify(c.name) === collectionSlug);
  if (!collection) return [];

  const study = collection.folders.find(s => s.id === studyId);
  if (!study) return [];

  return study.lessons.map(lesson => ({
    type: "folder" as const,
    id: lesson.id,
    title: lesson.name,
    thumbnail: lesson.image || undefined,
    isLeaf: true,
    path: `${currentPath}/${lesson.id}`
  }));
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

export function buildStudyPlan(study: StudyFolder): Plan {
  const allFiles: ContentFile[] = [];
  const sections: PlanSection[] = study.lessons.map(lesson => {
    const files: ContentFile[] = lesson.files.map(file => {
      const contentFile: ContentFile = { type: "file", id: file.id, title: file.title, mediaType: file.mediaType as "video" | "image", url: file.url, thumbnail: lesson.image };
      allFiles.push(contentFile);
      return contentFile;
    });
    const presentation: PlanPresentation = { id: lesson.id, name: lesson.name, actionType: "play", files };
    return { id: lesson.id, name: lesson.name, presentations: [presentation] };
  });

  return { id: study.id, name: study.name, thumbnail: study.image, sections, allFiles };
}

export function buildLessonPlan(lesson: LessonFolder): Plan {
  const files: ContentFile[] = lesson.files.map(file => ({ type: "file" as const, id: file.id, title: file.title, mediaType: file.mediaType as "video" | "image", url: file.url, thumbnail: lesson.image }));
  const presentation: PlanPresentation = { id: lesson.id, name: lesson.name, actionType: "play", files };
  return { id: lesson.id, name: lesson.name, thumbnail: lesson.image, sections: [{ id: "main", name: "Content", presentations: [presentation] }], allFiles: files };
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
