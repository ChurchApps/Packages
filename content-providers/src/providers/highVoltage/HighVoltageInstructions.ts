import { Instructions, InstructionItem } from "../../interfaces";
import { estimateDuration } from "../../durationUtils";
import { LessonFileJson, LessonFolder, StudyFolder } from "./HighVoltageKidsInterfaces";

/**
 * Get the base name from a title by removing trailing numbers
 * e.g., "Call to Action - Point 1" -> "Call to Action - Point"
 */
function getBaseName(title: string): string {
  const match = title.match(/^(.+?)\s*\d+$/);
  return match ? match[1].trim() : title;
}

/**
 * Group consecutive files with the same base name into actions
 */
export function groupFilesIntoActions(files: LessonFileJson[], thumbnail?: string): InstructionItem[] {
  const actionItems: InstructionItem[] = [];
  let currentGroup: LessonFileJson[] = [];
  let currentBaseName: string | null = null;

  const flushGroup = () => {
    if (currentGroup.length === 0) return;
    const children: InstructionItem[] = currentGroup.map(file => {
      const seconds = estimateDuration(file.mediaType as "video" | "image");
      return {
        id: file.id,
        itemType: "file" as const,
        label: file.title,
        seconds,
        downloadUrl: file.url,
        thumbnail
      };
    });
    // Use base name as label only if multiple files were grouped
    const label = (currentGroup.length > 1 && currentBaseName) ? currentBaseName : currentGroup[0].title;
    actionItems.push({
      id: currentGroup[0].id + "-action",
      itemType: "action",
      label,
      actionType: "play",
      children
    });
    currentGroup = [];
    currentBaseName = null;
  };

  for (const file of files) {
    const baseName = getBaseName(file.title);
    const isNumbered = baseName !== file.title;

    if (isNumbered && baseName === currentBaseName) {
      // Continue the current group
      currentGroup.push(file);
    } else {
      // Flush previous group and start a new one
      flushGroup();
      currentGroup = [file];
      currentBaseName = isNumbered ? baseName : null;
    }
  }
  flushGroup();

  return actionItems;
}

export function buildStudyInstructions(study: StudyFolder): Instructions {
  const lessonItems: InstructionItem[] = study.lessons.map(lesson => {
    const fileItems: InstructionItem[] = lesson.files.map(file => {
      const seconds = estimateDuration(file.mediaType as "video" | "image");
      return { id: file.id, itemType: "file", label: file.title, seconds, downloadUrl: file.url, thumbnail: lesson.image };
    });
    return { id: lesson.id, itemType: "action", label: lesson.name, actionType: "play", children: fileItems };
  });

  return { name: study.name, items: [{ id: "main", itemType: "section", label: "Content", children: lessonItems }] };
}

export function buildLessonInstructions(lesson: LessonFolder): Instructions {
  const actionItems = groupFilesIntoActions(lesson.files, lesson.image);
  return { name: lesson.name, items: [{ id: "main", itemType: "section", label: lesson.name, children: actionItems }] };
}
