import { ContentItem, ContentFile, FeedVenueInterface, PlanPresentation, InstructionItem, VenueActionsResponseInterface } from "../../interfaces";
import { detectMediaType } from "../../utils";
import { B1Ministry, B1PlanType, B1Plan, B1PlanItem, ArrangementKeyResponse } from "./B1ChurchTypes";
import { fetchArrangementKey } from "./B1ChurchApi";

export function ministryToFolder(ministry: B1Ministry): ContentItem {
  return { type: "folder" as const, id: ministry.id, title: ministry.name, path: "", thumbnail: ministry.photoUrl };
}

export function planTypeToFolder(planType: B1PlanType): ContentItem {
  return { type: "folder" as const, id: planType.id, title: planType.name, path: "" };
}

export function planToFolder(plan: B1Plan): ContentItem {
  return { type: "folder" as const, id: plan.id, title: plan.name, path: "", isLeaf: true };
}

export function sectionToFolder(section: B1PlanItem): ContentItem {
  return { type: "folder" as const, id: section.id, title: section.label || "Section", path: "" };
}

export async function planItemToPresentation(item: B1PlanItem, venueFeed: FeedVenueInterface | null): Promise<PlanPresentation | null> {
  const itemType = item.itemType;

  if (itemType === "arrangementKey" && item.churchId && item.relatedId) {
    const songData = await fetchArrangementKey(item.churchId, item.relatedId);
    if (songData) return arrangementToPresentation(item, songData);
  }

  // Handle providerFile/providerPresentation items with a direct link
  if ((itemType === "providerFile" || itemType === "providerPresentation") && item.link) {
    const file: ContentFile = {
      type: "file",
      id: item.relatedId ?? item.id ?? "unknown",
      title: item.label || "File",
      mediaType: detectMediaType(item.link),
      url: item.link,
      seconds: item.seconds
    };
    return { id: item.id, name: item.label || "File", actionType: "play", files: [file] };
  }

  if ((itemType === "lessonSection" || itemType === "section" || itemType === "providerSection" || itemType === "lessonAction" || itemType === "action" || itemType === "lessonAddOn" || itemType === "addon") && venueFeed) {
    const files = getFilesFromVenueFeed(venueFeed, itemType, item.relatedId);
    if (files.length > 0) return { id: item.id, name: item.label || "Lesson Content", actionType: "play", files };
  }

  if (itemType === "item" || itemType === "header") {
    return { id: item.id, name: item.label || "", actionType: "other", files: [], providerData: { itemType, description: item.description, seconds: item.seconds } };
  }

  return null;
}

function arrangementToPresentation(item: B1PlanItem, songData: ArrangementKeyResponse): PlanPresentation {
  const title = songData.songDetail?.title || item.label || "Song";
  return { id: item.id, name: title, actionType: "other", files: [], providerData: { itemType: "song", title, artist: songData.songDetail?.artist, lyrics: songData.arrangement?.lyrics, keySignature: songData.arrangementKey?.keySignature, arrangementName: songData.arrangement?.name, seconds: songData.songDetail?.seconds || item.seconds } };
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

export function convertFeedFiles(feedFiles: Array<{ id?: string; name?: string; url?: string; streamUrl?: string; seconds?: number; fileType?: string }>, thumbnailImage?: string): ContentFile[] {
  return feedFiles.filter(f => f.url).map(f => ({ type: "file" as const, id: f.id || "", title: f.name || "", mediaType: detectMediaType(f.url || "", f.fileType), thumbnail: thumbnailImage, url: f.url || "", seconds: f.seconds, streamUrl: f.streamUrl }));
}

export function getFileFromProviderFileItem(item: B1PlanItem): ContentFile | null {
  // Handle both providerFile and providerPresentation items with direct links
  if ((item.itemType !== "providerFile" && item.itemType !== "providerPresentation") || !item.link) return null;
  return {
    type: "file",
    id: item.relatedId ?? item.id ?? "unknown",
    title: item.label || "File",
    mediaType: detectMediaType(item.link),
    url: item.link,
    seconds: item.seconds
  };
}

export function planItemToInstruction(item: B1PlanItem, thumbnail?: string): InstructionItem {
  // Convert B1 API itemTypes to standardized short names
  let itemType: string | undefined = item.itemType;
  switch (item.itemType) {
    case "lessonSection": itemType = "section"; break;
    case "lessonAction": itemType = "action"; break;
    case "lessonAddOn": itemType = "action"; break;
  }

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

/**
 * Generate default plan items from a venue feed when no plan items exist.
 * Creates a structure with one header containing all venue sections as children.
 */
export function venueFeedToDefaultPlanItems(venueFeed: FeedVenueInterface): B1PlanItem[] {
  const headerItem: B1PlanItem = {
    id: "default-header",
    label: venueFeed.lessonName || venueFeed.name || "Lesson",
    itemType: "header",
    children: []
  };

  for (const section of venueFeed.sections || []) {
    const sectionItem: B1PlanItem = {
      id: section.id || `section-${headerItem.children!.length}`,
      label: section.name || "Section",
      itemType: "section",
      relatedId: section.id,
      children: []
    };

    for (const action of section.actions || []) {
      const actionType = action.actionType?.toLowerCase();
      if (actionType === "play" || actionType === "add-on") {
        const actionItem: B1PlanItem = {
          id: action.id || `action-${sectionItem.children!.length}`,
          label: action.content || "Action",
          itemType: "action",
          relatedId: action.id
        };
        sectionItem.children!.push(actionItem);
      }
    }

    // Only add sections that have actions
    if (sectionItem.children!.length > 0) {
      headerItem.children!.push(sectionItem);
    }
  }

  return headerItem.children!.length > 0 ? [headerItem] : [];
}

function getEmbedUrl(apiType?: string, relatedId?: string): string | undefined {
  if (!relatedId) return undefined;
  const baseUrl = "https://lessons.church";
  switch (apiType) {
    case "action":
    case "lessonAction": return `${baseUrl}/embed/action/${relatedId}`;
    case "addon":
    case "lessonAddOn": return `${baseUrl}/embed/addon/${relatedId}`;
    case "section":
    case "lessonSection": return `${baseUrl}/embed/section/${relatedId}`;
    default: return undefined;
  }
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

export function processVenueInstructionItem(item: Record<string, unknown>, sectionActionsMap: Map<string, InstructionItem[]>, thumbnail?: string): InstructionItem {
  const relatedId = item.relatedId as string | undefined;
  const rawItemType = item.itemType as string | undefined;

  // Normalize item types
  let itemType = rawItemType;
  if (itemType === "lessonSection") itemType = "section";
  if (itemType === "lessonAction") itemType = "action";
  if (itemType === "lessonAddOn") itemType = "action";

  const children = item.children as Record<string, unknown>[] | undefined;
  let processedChildren: InstructionItem[] | undefined;

  if (children) {
    processedChildren = children.map(child => {
      const childRelatedId = child.relatedId as string | undefined;
      const rawChildItemType = child.itemType as string | undefined;

      // Normalize child item types
      let childItemType = rawChildItemType;
      if (childItemType === "lessonSection") childItemType = "section";
      if (childItemType === "lessonAction") childItemType = "action";
      if (childItemType === "lessonAddOn") childItemType = "action";

      // If this child is a section with actions in the map, expand it
      if (childRelatedId && sectionActionsMap.has(childRelatedId)) {
        return {
          id: child.id as string | undefined,
          itemType: childItemType,
          relatedId: childRelatedId,
          label: child.label as string | undefined,
          content: child.description as string | undefined,
          seconds: child.seconds as number | undefined,
          children: sectionActionsMap.get(childRelatedId),
          downloadUrl: getEmbedUrl(rawChildItemType, childRelatedId)
        };
      }
      return processVenueInstructionItem(child, sectionActionsMap, thumbnail);
    });
  }

  const isFileType = itemType === "file" || (itemType === "action" && !children?.length);

  // Check if this item itself is a section that needs expansion
  let finalChildren = processedChildren;
  if (itemType === "section" && relatedId && sectionActionsMap.has(relatedId) && !processedChildren?.length) {
    finalChildren = sectionActionsMap.get(relatedId);
  }

  return {
    id: item.id as string | undefined,
    itemType,
    relatedId,
    label: item.label as string | undefined,
    content: item.description as string | undefined,
    seconds: item.seconds as number | undefined,
    children: finalChildren,
    downloadUrl: getEmbedUrl(rawItemType, relatedId),
    thumbnail: isFileType ? thumbnail : undefined
  };
}
