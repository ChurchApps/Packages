import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, FeedVenueInterface, Instructions, VenueActionsResponseInterface, ProviderCapabilities, AuthType } from "../../interfaces";
import { detectMediaType, createFolder } from "../../utils";
import { parsePath, getSegment } from "../../pathUtils";
import { BaseProvider } from "../BaseProvider";
import { apiRequest, API_BASE } from "./LessonsChurchApi";
import { convertAddOnToFile, convertAddOnCategoryToInstructions, buildSectionActionsMap, processInstructionItem } from "./LessonsChurchConverters";

/**
 * Path: /lessons → programs, /lessons/{id} → studies, /lessons/{id}/{id} → lessons,
 * /lessons/{id}/{id}/{id} → venues, /lessons/{id}/{id}/{id}/{id} → files;
 * /addons → categories, /addons/{cat} → items, /addons/{cat}/{id} → file.
 */
export class LessonsChurchProvider extends BaseProvider {
  readonly id = "lessonschurch";
  readonly name = "Lessons.church";

  readonly logos: ProviderLogos = { light: "https://lessons.church/images/logo.png", dark: "https://lessons.church/images/logo-dark.png" };

  readonly config: ContentProviderConfig = { id: "lessonschurch", name: "Lessons.church", apiBase: API_BASE, oauthBase: "", clientId: "", scopes: [] };

  readonly requiresAuth = false;
  readonly authTypes: AuthType[] = ["none"];
  readonly capabilities: ProviderCapabilities = { browse: true, playlist: true, instructions: true, mediaLicensing: false };

  async getPlaylist(path: string, _auth?: ContentProviderAuthData | null, resolution?: number): Promise<ContentFile[] | null> {
    const { segments } = parsePath(path);
    if (segments[0] === "addons" && segments.length >= 3) {
      const addOnId = segments[2];
      const file = await convertAddOnToFile({ id: addOnId });
      return file ? [file] : null;
    }

    const venueId = getSegment(path, 4);
    if (!venueId) return null;

    let apiPath = `/venues/playlist/${venueId}`;
    if (resolution) apiPath += `?resolution=${resolution}`;

    const response = await apiRequest<Record<string, unknown>>(apiPath);
    if (!response) return null;

    const files: ContentFile[] = [];
    const messages = (response.messages || []) as Record<string, unknown>[];

    let fileIndex = 0;
    for (const msg of messages) {
      const msgFiles = (msg.files || []) as Record<string, unknown>[];
      for (let i = 0; i < msgFiles.length; i++) {
        const f = msgFiles[i];
        if (!f.url) continue;

        const url = f.url as string;
        const fileId = (f.id as string) || `playlist-${fileIndex++}`;

        files.push({ type: "file", id: fileId, title: (f.name || msg.name) as string, mediaType: detectMediaType(url, f.fileType as string | undefined), thumbnail: (f.thumbnail as string | undefined) || (response.lessonImage as string | undefined), url, downloadUrl: url, seconds: f.seconds as number | undefined, loop: f.loop as boolean | undefined, loopVideo: f.loopVideo as boolean | undefined });
      }
    }

    return files.length > 0 ? files : null;
  }

  async browse(path?: string | null, _auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);

    if (depth === 0) {
      return [
        { type: "folder" as const, id: "lessons-root", title: "Lessons", path: "/lessons" },
        { type: "folder" as const, id: "addons-root", title: "Add-Ons", path: "/addons" }
      ];
    }

    const root = segments[0];
    if (root === "lessons") return this.browseLessons(path!, segments);
    if (root === "addons") return this.browseAddOns(path!, segments);
    return [];
  }

  private async browseLessons(currentPath: string, segments: string[]): Promise<ContentItem[]> {
    const depth = segments.length;

    if (depth === 1) return this.getPrograms();
    if (depth === 2) return this.getStudies(segments[1], currentPath);
    if (depth === 3) return this.getLessons(segments[2], currentPath);
    if (depth === 4) return this.getVenues(segments[3], currentPath);
    if (depth === 5) return this.getPlaylistFiles(segments[4]);

    return [];
  }

  private async getPrograms(): Promise<ContentItem[]> {
    const response = await apiRequest<Record<string, unknown>[]>("/programs/public");
    if (!response) return [];

    const programs = Array.isArray(response) ? response : [];
    return programs.map(p => createFolder(p.id as string, p.name as string, `/lessons/${p.id}`, p.image as string | undefined));
  }

  private async getStudies(programId: string, currentPath: string): Promise<ContentItem[]> {
    const response = await apiRequest<Record<string, unknown>[]>(`/studies/public/program/${programId}`);
    if (!response) return [];

    const studies = Array.isArray(response) ? response : [];
    return studies
      .map(s => createFolder(s.id as string, s.name as string, `${currentPath}/${s.id}`, s.image as string | undefined))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  private async getLessons(studyId: string, currentPath: string): Promise<ContentItem[]> {
    const response = await apiRequest<Record<string, unknown>[]>(`/lessons/public/study/${studyId}`);
    if (!response) return [];

    const lessons = Array.isArray(response) ? response : [];
    return lessons.map(l => createFolder(l.id as string, (l.name || l.title) as string, `${currentPath}/${l.id}`, l.image as string | undefined));
  }

  private async getVenues(lessonId: string, currentPath: string): Promise<ContentItem[]> {
    const response = await apiRequest<Record<string, unknown>[]>(`/venues/public/lesson/${lessonId}`);
    if (!response) return [];

    const lessonResponse = await apiRequest<Record<string, unknown>>(`/lessons/public/${lessonId}`);
    const lessonImage = lessonResponse?.image as string | undefined;

    const venues = Array.isArray(response) ? response : [];
    return venues.map(v => createFolder(v.id as string, v.name as string, `${currentPath}/${v.id}`, lessonImage, true));
  }

  private async getPlaylistFiles(venueId: string): Promise<ContentItem[]> {
    const files = await this.getPlaylist(`/lessons/_/_/_/${venueId}`, null);
    return files || [];
  }

  private async browseAddOns(currentPath: string, segments: string[]): Promise<ContentItem[]> {
    const depth = segments.length;

    if (depth === 1) return this.getAddOnCategories();
    if (depth === 2) return this.getAddOnsByCategory(segments[1], currentPath);
    if (depth === 3) return this.getAddOnFiles(segments[2]);

    return [];
  }

  private async getAddOnFiles(addOnId: string): Promise<ContentItem[]> {
    const file = await convertAddOnToFile({ id: addOnId });
    return file ? [file] : [];
  }

  private async getAddOnCategories(): Promise<ContentItem[]> {
    const response = await apiRequest<Record<string, unknown>[]>("/addOns/public");
    if (!response) return [];

    const addOns = Array.isArray(response) ? response : [];
    const categories = Array.from(new Set(addOns.map((a) => a.category as string).filter(Boolean)));

    return categories.sort().map(category => createFolder(`category-${category}`, category, `/addons/${encodeURIComponent(category)}`));
  }

  private async getAddOnsByCategory(category: string, currentPath: string): Promise<ContentItem[]> {
    const decodedCategory = decodeURIComponent(category);

    const response = await apiRequest<Record<string, unknown>[]>("/addOns/public");
    if (!response) return [];

    const allAddOns = Array.isArray(response) ? response : [];
    const filtered = allAddOns.filter((a) => a.category === decodedCategory);

    return filtered.map(addOn => createFolder(addOn.id as string, addOn.name as string, `${currentPath}/${addOn.id}`, addOn.image as string | undefined, true));
  }

  async getInstructions(path: string, _auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const venueId = getSegment(path, 4);
    if (venueId) {
      const [planItemsResponse, actionsResponse, feedResponse] = await Promise.all([
        apiRequest<{ venueName?: string; items?: Record<string, unknown>[] }>(`/venues/public/planItems/${venueId}`),
        apiRequest<VenueActionsResponseInterface>(`/venues/public/actions/${venueId}`),
        apiRequest<FeedVenueInterface>(`/venues/public/feed/${venueId}`)
      ]);

      if (!planItemsResponse) return null;

      const lessonImage = feedResponse?.lessonImage;
      const sectionActionsMap = buildSectionActionsMap(actionsResponse, lessonImage, feedResponse);

      return { name: planItemsResponse.venueName, items: (planItemsResponse.items || []).map(item => processInstructionItem(item, sectionActionsMap, lessonImage)) };
    }

    const { segments } = parsePath(path);
    if (segments[0] === "addons" && segments.length === 3) {
      const addOnId = segments[2];
      const file = await convertAddOnToFile({ id: addOnId });
      if (!file) return null;
      return {
        name: file.title,
        items: [
          {
            id: addOnId,
            itemType: "action",
            relatedId: addOnId,
            label: file.title,
            seconds: file.seconds,
            children: [{ id: addOnId + "-file", itemType: "file", label: file.title, seconds: file.seconds, downloadUrl: file.url, thumbnail: file.thumbnail }]
          }
        ]
      };
    }
    if (segments[0] === "addons" && segments.length === 2) {
      return convertAddOnCategoryToInstructions(segments[1]);
    }

    return null;
  }
}
