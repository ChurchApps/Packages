import type { ContentFile, Plan, PlanSection, PlanPresentation, Instructions, InstructionItem } from "./interfaces";
import { detectMediaType } from "./utils";

function generateId(): string {
  return "gen-" + Math.random().toString(36).substring(2, 11);
}

function mapItemTypeToActionType(itemType?: string): "play" | "other" {
  switch (itemType) {
    case "action":
    case "lessonAction":
    case "providerPresentation":
    case "play":
    case "addon":
    case "add-on":
    case "lessonAddOn":
    case "providerFile": return "play";
    default: return "other";
  }
}

// LOSSLESS: All file data preserved, only hierarchy lost
export function presentationsToPlaylist(plan: Plan): ContentFile[] {
  if (plan.allFiles && plan.allFiles.length > 0) {
    return [...plan.allFiles];
  }

  const files: ContentFile[] = [];
  for (const section of plan.sections) {
    for (const presentation of section.presentations) {
      files.push(...presentation.files);
    }
  }
  return files;
}

function mapActionTypeToItemType(actionType: "play" | "other"): string {
  switch (actionType) {
    case "play": return "action";
    default: return "item";
  }
}

// LOSSLESS: All hierarchy and file data preserved
export function presentationsToExpandedInstructions(plan: Plan): Instructions {
  return {
    name: plan.name,
    items: plan.sections.map(section => ({
      id: section.id,
      itemType: "section",
      label: section.name,
      children: section.presentations.map(pres => ({
        id: pres.id,
        itemType: mapActionTypeToItemType(pres.actionType),
        label: pres.name,
        description: pres.actionType !== "other" ? pres.actionType : undefined,
        seconds: pres.files.reduce((sum, f) => sum + (f.seconds || 0), 0) || undefined,
        children: pres.files.map(f => ({
          id: f.id,
          itemType: "file",
          label: f.title,
          seconds: f.seconds,
          downloadUrl: f.downloadUrl || f.url,
          thumbnail: f.thumbnail
        }))
      }))
    }))
  };
}

// LOSSLESS for media: All items with downloadUrl become files
export function instructionsToPlaylist(instructions: Instructions): ContentFile[] {
  const files: ContentFile[] = [];

  function extractFiles(items: InstructionItem[]) {
    for (const item of items) {
      if (item.downloadUrl && (item.itemType === "file" || !item.children?.length)) {
        files.push({ type: "file", id: item.id || item.relatedId || generateId(), title: item.label || "Untitled", mediaType: detectMediaType(item.downloadUrl), url: item.downloadUrl, downloadUrl: item.downloadUrl, seconds: item.seconds, thumbnail: item.thumbnail });
      }
      if (item.children) {
        extractFiles(item.children);
      }
    }
  }

  extractFiles(instructions.items);
  return files;
}

export const expandedInstructionsToPlaylist = instructionsToPlaylist;

// LOSSLESS when instructions have proper structure
export function instructionsToPresentations(instructions: Instructions, planId?: string): Plan {
  const allFiles: ContentFile[] = [];

  const sections: PlanSection[] = instructions.items.filter(item => item.children && item.children.length > 0).map(sectionItem => {
    const presentations: PlanPresentation[] = (sectionItem.children || []).map(presItem => {
      const files: ContentFile[] = [];

      if (presItem.children && presItem.children.length > 0) {
        for (const child of presItem.children) {
          if (child.downloadUrl) {
            const file: ContentFile = { type: "file", id: child.id || child.relatedId || generateId(), title: child.label || "Untitled", mediaType: detectMediaType(child.downloadUrl), url: child.downloadUrl, downloadUrl: child.downloadUrl, seconds: child.seconds, thumbnail: child.thumbnail };
            allFiles.push(file);
            files.push(file);
          }
        }
      }

      if (files.length === 0 && presItem.downloadUrl) {
        const file: ContentFile = { type: "file", id: presItem.id || presItem.relatedId || generateId(), title: presItem.label || "Untitled", mediaType: detectMediaType(presItem.downloadUrl), url: presItem.downloadUrl, downloadUrl: presItem.downloadUrl, seconds: presItem.seconds, thumbnail: presItem.thumbnail };
        allFiles.push(file);
        files.push(file);
      }

      return { id: presItem.id || presItem.relatedId || generateId(), name: presItem.label || "Presentation", actionType: mapItemTypeToActionType(presItem.itemType), files };
    });

    return { id: sectionItem.id || sectionItem.relatedId || generateId(), name: sectionItem.label || "Section", presentations };
  });

  return { id: planId || generateId(), name: instructions.name || "Plan", sections, allFiles };
}

export const expandedInstructionsToPresentations = instructionsToPresentations;

// LOSSY: No structural information - all files in one section
export function playlistToPresentations(files: ContentFile[], planName: string = "Playlist", sectionName: string = "Content"): Plan {
  const presentations: PlanPresentation[] = files.map((file, index) => ({ id: `pres-${index}-${file.id}`, name: file.title, actionType: "play" as const, files: [file] }));
  return { id: "playlist-plan-" + generateId(), name: planName, sections: [{ id: "main-section", name: sectionName, presentations }], allFiles: [...files] };
}

// LOSSY: Minimal structure - just file references in a single section
export function playlistToInstructions(files: ContentFile[], name: string = "Playlist"): Instructions {
  return { name, items: [{ id: "main-section", itemType: "section", label: "Content", children: files.map((file, index) => ({ id: file.id || `item-${index}`, itemType: "file", label: file.title, seconds: file.seconds, downloadUrl: file.downloadUrl || file.url, thumbnail: file.thumbnail })) }] };
}

export const playlistToExpandedInstructions = playlistToInstructions;
