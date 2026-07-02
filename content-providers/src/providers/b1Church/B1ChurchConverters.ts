import { ContentItem, ContentFile, FeedVenueInterface, InstructionItem, VenueActionsResponseInterface } from "../../interfaces";
import { detectMediaType } from "../../utils";
import { normalizeItemType, getEmbedUrl } from "../lessonsChurch/LessonsChurchConverters";
import { B1Ministry, B1PlanType, B1Plan, B1PlanItem } from "./B1ChurchTypes";

export function ministryToFolder(ministry: B1Ministry): ContentItem {
  return { type: "folder" as const, id: ministry.id, title: ministry.name, path: "", thumbnail: ministry.photoUrl };
}

export function planTypeToFolder(planType: B1PlanType): ContentItem {
  return { type: "folder" as const, id: planType.id, title: planType.name, path: "" };
}

export function planToFolder(plan: B1Plan, thumbnail?: string): ContentItem {
  return { type: "folder" as const, id: plan.id, title: plan.name, path: "", isLeaf: true, thumbnail };
}

export function getFilesFromVenueFeed(venueFeed: FeedVenueInterface, itemType: string, relatedId?: string): ContentFile[] {
  const files: ContentFile[] = [];

  if (!relatedId) return files;

  if (itemType === "lessonSection" || itemType === "section" || itemType === "providerSection") {
    for (const section of venueFeed.sections || []) {
      if (section.id === relatedId) {
        for (const action of section.actions || []) {
          const actionType = action.actionType?.toLowerCase();
          if (actionType === "play" || actionType === "add-on") {
            files.push(...convertFeedFiles(action.files || [], venueFeed.lessonImage));
          }
        }
        break;
      }
    }
  } else if (itemType === "lessonAction" || itemType === "action" || itemType === "lessonAddOn" || itemType === "addon") {
    for (const section of venueFeed.sections || []) {
      for (const action of section.actions || []) {
        if (action.id === relatedId) {
          files.push(...convertFeedFiles(action.files || [], venueFeed.lessonImage));
          break;
        }
      }
    }
  }

  return files;
}

function convertFeedFiles(feedFiles: Array<{ id?: string; name?: string; url?: string; streamUrl?: string; seconds?: number; fileType?: string }>, thumbnailImage?: string): ContentFile[] {
  return feedFiles.filter(f => f.url).map(f => ({ type: "file" as const, id: f.id || "", title: f.name || "", mediaType: detectMediaType(f.url || "", f.fileType), thumbnail: thumbnailImage, url: f.url || "", seconds: f.seconds, streamUrl: f.streamUrl }));
}

export function getFileFromProviderFileItem(item: B1PlanItem): ContentFile | null {
  // Handle both providerFile and providerPresentation items with direct links
  if ((item.itemType !== "providerFile" && item.itemType !== "providerPresentation") || !item.link) return null;
  const fileId = item.relatedId ?? item.id;
  if (!fileId) {
    console.warn(`[B1Church] getFileFromProviderFileItem: ${item.itemType} has no relatedId or id, link=${item.link}`);
    return null;
  }
  return {
    type: "file",
    id: fileId,
    title: item.label || "File",
    mediaType: detectMediaType(item.link),
    url: item.link,
    seconds: item.seconds
  };
}

export function planItemToInstruction(item: B1PlanItem, thumbnail?: string): InstructionItem {
  const itemType = normalizeItemType(item.itemType);
  const isFileType = itemType === "file" || (item.link && !item.children?.length);
  return {
    id: item.id,
    itemType,
    relatedId: item.relatedId,
    label: item.label,
    content: item.description,
    seconds: item.seconds,
    downloadUrl: item.link,
    thumbnail: isFileType ? thumbnail : undefined,
    children: item.children?.map(child => planItemToInstruction(child, thumbnail))
  };
}

export function buildSectionActionsMap(actionsResponse: VenueActionsResponseInterface | null, thumbnail?: string): Map<string, InstructionItem[]> {
  const sectionActionsMap = new Map<string, InstructionItem[]>();
  if (actionsResponse?.sections) {
    for (const section of actionsResponse.sections) {
      if (section.id && section.actions) {
        sectionActionsMap.set(section.id, section.actions.map(action => {
          const downloadUrl = getEmbedUrl("action", action.id);
          const seconds = action.seconds ?? 10;
          return {
            id: action.id,
            itemType: "action",
            relatedId: action.id,
            label: action.name,
            seconds,
            children: [
              {
                id: action.id + "-file",
                itemType: "file",
                label: action.name,
                seconds,
                downloadUrl,
                thumbnail
              }
            ]
          };
        }));
      }
    }
  }
  return sectionActionsMap;
}
