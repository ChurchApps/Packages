import { ContentFile, FeedVenueInterface, Plan, PlanSection, PlanPresentation, InstructionItem, Instructions, VenueActionsResponseInterface } from "../../interfaces";
import { detectMediaType } from "../../utils";
import { estimateImageDuration } from "../../durationUtils";
import { apiRequest, API_BASE } from "./LessonsChurchApi";

export function normalizeItemType(type?: string): string | undefined {
  if (type === "lessonSection") return "section";
  if (type === "lessonAction") return "action";
  if (type === "lessonAddOn") return "action";
  return type;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")  // **bold**
    .replace(/__(.+?)__/g, "$1")       // __bold__
    .replace(/\*(.+?)\*/g, "$1")       // *italic*
    .replace(/_(.+?)_/g, "$1")         // _italic_
    .replace(/#{1,6}\s*/g, "")         // # headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")  // [text](url)
    .replace(/`([^`]+)`/g, "$1")       // `code`
    .replace(/\n+/g, " ")              // newlines to spaces
    .replace(/\s+/g, " ")              // collapse whitespace
    .trim();
}

function truncateForLabel(text: string): string {
  // Find first line break
  const lineBreakPos = text.search(/\n/);
  // Cut at line break or 100 chars, whichever comes first
  const cutoff = lineBreakPos > 0 && lineBreakPos < 100 ? lineBreakPos : 100;
  const truncated = text.length > cutoff ? text.substring(0, cutoff) : text;
  // Strip markdown and clean up for label
  return stripMarkdown(truncated) + (text.length > cutoff ? "..." : "");
}

export function getEmbedUrl(apiType?: string, relatedId?: string): string | undefined {
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

export function convertVenueToPlan(venue: FeedVenueInterface): Plan {
  const sections: PlanSection[] = [];
  const allFiles: ContentFile[] = [];

  for (const section of venue.sections || []) {
    const presentations: PlanPresentation[] = [];

    for (const action of section.actions || []) {
      const rawActionType = action.actionType?.toLowerCase() || "other";
      if (rawActionType !== "play" && rawActionType !== "add-on") continue;

      const files: ContentFile[] = [];

      for (const file of action.files || []) {
        if (!file.url) continue;

        const contentFile: ContentFile = { type: "file", id: file.id || "", title: file.name || "", mediaType: detectMediaType(file.url, file.fileType), thumbnail: file.thumbnail || venue.lessonImage, url: file.url, downloadUrl: file.url, seconds: file.seconds, streamUrl: file.streamUrl };

        files.push(contentFile);
        allFiles.push(contentFile);
      }

      if (files.length > 0) {
        presentations.push({ id: action.id || "", name: action.content || section.name || "Untitled", actionType: "play", files });
      }
    }

    if (presentations.length > 0) {
      sections.push({ id: section.id || "", name: section.name || "Untitled Section", presentations });
    }
  }

  return { id: venue.id || "", name: venue.lessonName || venue.name || "Plan", thumbnail: venue.lessonImage, sections, allFiles };
}

export async function convertAddOnToFile(addOn: Record<string, unknown>): Promise<ContentFile | null> {
  const apiPath = `/addOns/public/${addOn.id as string}`;
  const detail = await apiRequest<Record<string, unknown>>(apiPath);
  if (!detail) return null;

  let url = "";
  let mediaType: "video" | "image" = "video";
  let seconds = (addOn.seconds as number) || 10;

  const video = detail.video as Record<string, unknown> | undefined;
  const file = detail.file as Record<string, unknown> | undefined;

  if (video) {
    url = `${API_BASE}/externalVideos/download/${video.id}`;
    seconds = (video.seconds as number) || seconds;
  } else if (file) {
    url = file.contentPath as string;
    const fileType = file.fileType as string | undefined;
    mediaType = fileType?.startsWith("video/") ? "video" : "image";
  } else {
    return null;
  }

  return { type: "file", id: addOn.id as string, title: addOn.name as string, mediaType, thumbnail: addOn.image as string | undefined, url, downloadUrl: url, seconds, loopVideo: ((video as Record<string, unknown> | undefined)?.loopVideo as boolean) || false };
}

export function buildSectionActionsMap(actionsResponse: VenueActionsResponseInterface | null, lessonImage?: string, feedResponse?: FeedVenueInterface | null): Map<string, InstructionItem[]> {
  const sectionActionsMap = new Map<string, InstructionItem[]>();

  // Build maps of action ID -> file data and content from feed
  const actionThumbnailMap = new Map<string, string>();
  const actionUrlMap = new Map<string, string>();
  const actionContentMap = new Map<string, string>();
  if (feedResponse?.sections) {
    for (const section of feedResponse.sections) {
      for (const action of section.actions || []) {
        if (action.id) {
          if (action.content) actionContentMap.set(action.id, action.content);
          if (action.files?.length) {
            const firstFile = action.files[0];
            if (firstFile?.thumbnail) actionThumbnailMap.set(action.id, firstFile.thumbnail);
            if (firstFile?.url) actionUrlMap.set(action.id, firstFile.url);
          }
        }
      }
    }
  }

  if (actionsResponse?.sections) {
    for (const section of actionsResponse.sections) {
      if (section.id && section.actions) {
        sectionActionsMap.set(section.id, section.actions.map(action => {
          const seconds = action.seconds ?? estimateImageDuration();
          const rawActionType = action.actionType?.toLowerCase() || "";
          const hasFiles = rawActionType === "play" || rawActionType === "add-on";
          const thumbnail = (action.id && actionThumbnailMap.get(action.id)) || lessonImage;
          const downloadUrl = action.id ? actionUrlMap.get(action.id) : undefined;
          const fullContent = action.id ? actionContentMap.get(action.id) : undefined;
          const label = fullContent ? truncateForLabel(fullContent) : action.name;
          const needsFullContent = fullContent && (fullContent.length > 100 || fullContent.includes("\n"));
          const content = needsFullContent ? fullContent : undefined;
          return { id: action.id, itemType: "action", relatedId: action.id, label, actionType: rawActionType || undefined, content, seconds, downloadUrl, thumbnail, children: hasFiles ? [{ id: action.id + "-file", itemType: "file", label: action.name, seconds, downloadUrl, thumbnail }] : undefined };
        }));
      }
    }
  }
  return sectionActionsMap;
}

export function processInstructionItem(item: Record<string, unknown>, sectionActionsMap: Map<string, InstructionItem[]>, thumbnail?: string): InstructionItem {
  const relatedId = item.relatedId as string | undefined;
  const rawItemType = item.itemType as string | undefined;
  const itemType = normalizeItemType(rawItemType);
  const children = item.children as Record<string, unknown>[] | undefined;

  let processedChildren: InstructionItem[] | undefined;

  if (children) {
    processedChildren = children.map(child => {
      const childRelatedId = child.relatedId as string | undefined;
      const rawChildItemType = child.itemType as string | undefined;
      const childItemType = normalizeItemType(rawChildItemType);
      if (childRelatedId && sectionActionsMap.has(childRelatedId)) {
        // Section has actions with direct download URLs from sectionActionsMap
        const sectionActions = sectionActionsMap.get(childRelatedId);
        // Get download URL from first action's child file if available
        const firstActionUrl = sectionActions?.[0]?.downloadUrl;
        return {
          id: child.id as string | undefined,
          itemType: childItemType,
          relatedId: childRelatedId,
          label: child.label as string | undefined,
          actionType: child.actionType as string | undefined,
          content: child.content as string | undefined,
          seconds: child.seconds as number | undefined,
          children: sectionActions,
          downloadUrl: firstActionUrl,
          thumbnail
        };
      }
      return processInstructionItem(child, sectionActionsMap, thumbnail);
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
    actionType: item.actionType as string | undefined,
    content: item.content as string | undefined,
    seconds: item.seconds as number | undefined,
    children: finalChildren,
    downloadUrl: undefined,
    thumbnail: isFileType ? thumbnail : undefined
  };
}

export async function convertAddOnCategoryToPlan(category: string): Promise<Plan | null> {
  const decodedCategory = decodeURIComponent(category);
  const response = await apiRequest<Record<string, unknown>[]>("/addOns/public");
  if (!response || !Array.isArray(response)) return null;

  const filtered = response.filter((a) => a.category === decodedCategory);
  const presentations: PlanPresentation[] = [];
  const allFiles: ContentFile[] = [];

  for (const addOn of filtered) {
    const file = await convertAddOnToFile(addOn);
    if (file) {
      presentations.push({ id: addOn.id as string, name: addOn.name as string, actionType: "play", files: [file] });
      allFiles.push(file);
    }
  }

  if (presentations.length === 0) return null;

  const section: PlanSection = { id: `category-${decodedCategory}`, name: decodedCategory, presentations };
  return { id: `addons-${decodedCategory}`, name: decodedCategory, sections: [section], allFiles };
}

export async function convertAddOnCategoryToInstructions(category: string): Promise<Instructions | null> {
  const decodedCategory = decodeURIComponent(category);
  const response = await apiRequest<Record<string, unknown>[]>("/addOns/public");
  if (!response || !Array.isArray(response)) return null;

  const filtered = response.filter((a) => a.category === decodedCategory);
  const children: InstructionItem[] = [];

  for (const addOn of filtered) {
    const id = addOn.id as string;
    const label = addOn.name as string;
    const addOnImage = addOn.image as string | undefined;
    const file = await convertAddOnToFile(addOn);
    const seconds = file?.seconds || (addOn.seconds as number) || 10;
    const downloadUrl = file?.url;

    children.push({
      id,
      itemType: "action",
      relatedId: id,
      label,
      seconds,
      children: [{ id: id + "-file", itemType: "file", label, seconds, downloadUrl, thumbnail: addOnImage }]
    });
  }

  if (children.length === 0) return null;

  const sectionItem: InstructionItem = { id: `category-${decodedCategory}`, itemType: "section", label: decodedCategory, children };
  return { name: decodedCategory, items: [sectionItem] };
}
