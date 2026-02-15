import { ContentProviderConfig, ContentProviderAuthData, ContentFile, PlanPresentation, Instructions, InstructionItem, Plan } from "../../interfaces";
import { detectMediaType } from "../../utils";
import { ApiHelper } from "../../helpers";
import { PCOPlanItem, PCOSong, PCOArrangement, PCOSection, PCOAttachment } from "./PlanningCenterInterfaces";

const apiHelper = new ApiHelper();

async function apiRequest<T>(config: ContentProviderConfig, providerId: string, path: string, auth?: ContentProviderAuthData | null): Promise<T | null> {
  return apiHelper.apiRequest<T>(config, providerId, path, auth);
}

export async function convertToPresentation(config: ContentProviderConfig, item: PCOPlanItem, auth?: ContentProviderAuthData | null): Promise<PlanPresentation | null> {
  const itemType = item.attributes.item_type;

  if (itemType === "song") {
    return convertSongToPresentation(config, item, auth);
  }

  if (itemType === "media") {
    return convertMediaToPresentation(config, item, auth);
  }

  if (itemType === "item") {
    return { id: item.id, name: item.attributes.title || "", actionType: "other", files: [], providerData: { itemType: "item", description: item.attributes.description, length: item.attributes.length } };
  }

  return null;
}

async function convertSongToPresentation(config: ContentProviderConfig, item: PCOPlanItem, auth?: ContentProviderAuthData | null): Promise<PlanPresentation | null> {
  const songId = item.relationships?.song?.data?.id;
  const arrangementId = item.relationships?.arrangement?.data?.id;

  if (!songId) {
    return { id: item.id, name: item.attributes.title || "Song", actionType: "other", files: [], providerData: { itemType: "song" } };
  }

  const songFn = config.endpoints.song as (id: string) => string;
  const songResponse = await apiRequest<{ data: PCOSong }>(config, config.id, songFn(songId), auth);

  let arrangement: PCOArrangement | null = null;
  let sections: PCOSection[] = [];

  if (arrangementId) {
    const arrangementFn = config.endpoints.arrangement as (sId: string, aId: string) => string;
    const arrangementResponse = await apiRequest<{ data: PCOArrangement }>(
      config, config.id, arrangementFn(songId, arrangementId), auth
    );
    arrangement = arrangementResponse?.data || null;

    const sectionsFn = config.endpoints.arrangementSections as (sId: string, aId: string) => string;
    const sectionsResponse = await apiRequest<{ data: { attributes: { sections: PCOSection[] } }[] }>(
      config, config.id, sectionsFn(songId, arrangementId), auth
    );
    sections = sectionsResponse?.data?.[0]?.attributes?.sections || [];
  }

  const song = songResponse?.data;
  const title = song?.attributes?.title || item.attributes.title || "Song";

  return { id: item.id, name: title, actionType: "other", files: [], providerData: { itemType: "song", title, author: song?.attributes?.author, copyright: song?.attributes?.copyright, ccliNumber: song?.attributes?.ccli_number, arrangementName: arrangement?.attributes?.name, keySignature: arrangement?.attributes?.chord_chart_key, bpm: arrangement?.attributes?.bpm, sequence: arrangement?.attributes?.sequence, sections: sections.map(s => ({ label: s.label, lyrics: s.lyrics })), length: item.attributes.length } };
}

async function convertMediaToPresentation(config: ContentProviderConfig, item: PCOPlanItem, auth?: ContentProviderAuthData | null): Promise<PlanPresentation | null> {
  const files: ContentFile[] = [];

  const mediaFn = config.endpoints.media as (id: string) => string;
  const mediaAttachmentsFn = config.endpoints.mediaAttachments as (id: string) => string;

  const mediaResponse = await apiRequest<{ data: { id: string; attributes: { title?: string; length?: number } } }>(
    config, config.id, mediaFn(item.id), auth
  );

  if (mediaResponse?.data) {
    const attachmentsResponse = await apiRequest<{ data: PCOAttachment[] }>(
      config, config.id, mediaAttachmentsFn(mediaResponse.data.id), auth
    );

    for (const attachment of attachmentsResponse?.data || []) {
      const url = attachment.attributes.url;
      if (!url) continue;

      const contentType = attachment.attributes.content_type;
      const explicitType = contentType?.startsWith("video/") ? "video" : undefined;

      files.push({ type: "file", id: attachment.id, title: attachment.attributes.filename, mediaType: detectMediaType(url, explicitType), url });
    }
  }

  return { id: item.id, name: item.attributes.title || "Media", actionType: "play", files, providerData: { itemType: "media", length: item.attributes.length } };
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().slice(0, 10);
}

export function buildInstructionsFromPlan(plan: Plan): Instructions {
  const sectionItems: InstructionItem[] = plan.sections.map(section => {
    const actionItems: InstructionItem[] = section.presentations.map(pres => {
      const fileItems: InstructionItem[] = pres.files.map(file => ({
        id: file.id,
        itemType: "file",
        label: file.title,
        downloadUrl: file.url,
        thumbnail: file.thumbnail
      }));

      return {
        id: pres.id,
        itemType: "action",
        relatedId: pres.id,
        label: pres.name,
        actionType: pres.actionType,
        children: fileItems.length > 0 ? fileItems : undefined
      };
    });

    return {
      id: section.id,
      itemType: "section",
      label: section.name,
      children: actionItems
    };
  });

  return {
    name: plan.name,
    items: sectionItems
  };
}
