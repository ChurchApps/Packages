import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, FeedVenueInterface, Instructions, VenueActionsResponseInterface, ProviderCapabilities, IProvider, AuthType } from "../../interfaces";
import { detectMediaType } from "../../utils";
import { parsePath, getSegment } from "../../pathUtils";
import { apiRequest, API_BASE } from "./LessonsChurchApi";
import { convertAddOnToFile, convertAddOnCategoryToInstructions, buildSectionActionsMap, processInstructionItem } from "./LessonsChurchConverters";

/**
 * LessonsChurch Provider
 *
 * Path structure:
 *   /lessons                                            -> programs
 *   /lessons/{programId}                                -> studies
 *   /lessons/{programId}/{studyId}                      -> lessons
 *   /lessons/{programId}/{studyId}/{lessonId}           -> venues
 *   /lessons/{programId}/{studyId}/{lessonId}/{venueId} -> playlist files
 *
 *   /addons                                             -> categories
 *   /addons/{category}                                  -> add-on files
 */
export class LessonsChurchProvider implements IProvider {
  readonly id = "lessonschurch";
  readonly name = "Lessons.church";

  readonly logos: ProviderLogos = { light: "https://lessons.church/images/logo.png", dark: "https://lessons.church/images/logo-dark.png" };

  readonly config: ContentProviderConfig = { id: "lessonschurch", name: "Lessons.church", apiBase: API_BASE, oauthBase: "", clientId: "", scopes: [], endpoints: { programs: "/programs/public", studies: (programId: string) => `/studies/public/program/${programId}`, lessons: (studyId: string) => `/lessons/public/study/${studyId}`, venues: (lessonId: string) => `/venues/public/lesson/${lessonId}`, playlist: (venueId: string) => `/venues/playlist/${venueId}`, feed: (venueId: string) => `/venues/public/feed/${venueId}`, addOns: "/addOns/public", addOnDetail: (id: string) => `/addOns/public/${id}` } };

  readonly requiresAuth = false;
  readonly authTypes: AuthType[] = ["none"];
  readonly capabilities: ProviderCapabilities = { browse: true, presentations: true, playlist: true, instructions: true, mediaLicensing: false };

  async getPlaylist(path: string, _auth?: ContentProviderAuthData | null, resolution?: number): Promise<ContentFile[] | null> {
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
    const response = await apiRequest<Record<string, unknown>[]>(this.config.endpoints.programs as string);
    if (!response) return [];

    const programs = Array.isArray(response) ? response : [];
    return programs.map((p) => ({
      type: "folder" as const,
      id: p.id as string,
      title: p.name as string,
      thumbnail: p.image as string | undefined,
      path: `/lessons/${p.id}`
    }));
  }

  private async getStudies(programId: string, currentPath: string): Promise<ContentItem[]> {
    const pathFn = this.config.endpoints.studies as (id: string) => string;
    const response = await apiRequest<Record<string, unknown>[]>(pathFn(programId));
    if (!response) return [];

    const studies = Array.isArray(response) ? response : [];
    return studies.map((s) => ({
      type: "folder" as const,
      id: s.id as string,
      title: s.name as string,
      thumbnail: s.image as string | undefined,
      path: `${currentPath}/${s.id}`
    }));
  }

  private async getLessons(studyId: string, currentPath: string): Promise<ContentItem[]> {
    const pathFn = this.config.endpoints.lessons as (id: string) => string;
    const response = await apiRequest<Record<string, unknown>[]>(pathFn(studyId));
    if (!response) return [];

    const lessons = Array.isArray(response) ? response : [];
    return lessons.map((l) => ({
      type: "folder" as const,
      id: l.id as string,
      title: (l.name || l.title) as string,
      thumbnail: l.image as string | undefined,
      path: `${currentPath}/${l.id}`
    }));
  }

  private async getVenues(lessonId: string, currentPath: string): Promise<ContentItem[]> {
    const pathFn = this.config.endpoints.venues as (id: string) => string;
    const response = await apiRequest<Record<string, unknown>[]>(pathFn(lessonId));
    if (!response) return [];

    const lessonResponse = await apiRequest<Record<string, unknown>>(`/lessons/public/${lessonId}`);
    const lessonImage = lessonResponse?.image as string | undefined;

    const venues = Array.isArray(response) ? response : [];
    return venues.map((v) => ({
      type: "folder" as const,
      id: v.id as string,
      title: v.name as string,
      thumbnail: lessonImage,
      isLeaf: true,
      path: `${currentPath}/${v.id}`
    }));
  }

  private async getPlaylistFiles(venueId: string): Promise<ContentItem[]> {
    const files = await this.getPlaylist(`/lessons/_/_/_/${venueId}`, null);
    return files || [];
  }

  private async browseAddOns(_currentPath: string, segments: string[]): Promise<ContentItem[]> {
    const depth = segments.length;

    if (depth === 1) return this.getAddOnCategories();
    if (depth === 2) return this.getAddOnsByCategory(segments[1]);

    return [];
  }

  private async getAddOnCategories(): Promise<ContentItem[]> {
    const response = await apiRequest<Record<string, unknown>[]>(this.config.endpoints.addOns as string);
    if (!response) return [];

    const addOns = Array.isArray(response) ? response : [];
    const categories = Array.from(new Set(addOns.map((a) => a.category as string).filter(Boolean)));

    return categories.sort().map((category) => ({
      type: "folder" as const,
      id: `category-${category}`,
      title: category,
      isLeaf: true,
      path: `/addons/${encodeURIComponent(category)}`
    }));
  }

  private async getAddOnsByCategory(category: string): Promise<ContentItem[]> {
    const decodedCategory = decodeURIComponent(category);

    const response = await apiRequest<Record<string, unknown>[]>(this.config.endpoints.addOns as string);
    if (!response) return [];

    const allAddOns = Array.isArray(response) ? response : [];
    const filtered = allAddOns.filter((a) => a.category === decodedCategory);

    const files: ContentFile[] = [];
    for (const addOn of filtered) {
      const file = await convertAddOnToFile(addOn);
      if (file) files.push(file);
    }
    return files;
  }

  // async getPresentations(path: string, _auth?: ContentProviderAuthData | null): Promise<Plan | null> {
  //   const venueId = getSegment(path, 4);
  //   if (venueId) {
  //     const venueData = await apiRequest<FeedVenueInterface>(`/venues/public/feed/${venueId}`);
  //     if (!venueData) return null;
  //     return convertVenueToPlan(venueData);
  //   }

  //   const { segments } = parsePath(path);
  //   if (segments[0] === "addons" && segments.length === 2) {
  //     return convertAddOnCategoryToPlan(segments[1]);
  //   }

  //   return null;
  // }

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
    if (segments[0] === "addons" && segments.length === 2) {
      return convertAddOnCategoryToInstructions(segments[1]);
    }

    return null;
  }

  supportsDeviceFlow(): boolean {
    return false;
  }
}
