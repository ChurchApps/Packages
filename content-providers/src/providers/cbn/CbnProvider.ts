import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, ProviderCapabilities, IProvider, AuthType, Instructions, DeviceAuthorizationResponse, DeviceFlowPollResult } from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { ApiHelper, DeviceFlowHelper } from "../../helpers";
import { CbnCatalogCourse, CbnCourseDetail, CbnLessonPlaylist } from "./CbnInterfaces";
import { convertCoursesToFolders, convertLessonsToFolders, convertPlaylistToFiles, convertPlaylistToInstructions } from "./CbnConverters";
import { CBN_LOGO } from "./logo";

const API_BASE = "https://sbamemberdev.wpenginepowered.com/wp-json/superbook/v1";

/**
 * CBN Provider
 *
 * Faith-based kids' video curriculum. Auth uses OAuth 2.0 Device Flow.
 *
 * Path structure:
 *   /                              -> single "Catalog" root folder
 *   /catalog                       -> course folders (GET /catalog)
 *   /catalog/{courseId}            -> lesson folders (GET /catalog/{courseId})
 *   /catalog/{courseId}/{lessonId} -> video files   (GET /lesson-playlist/{lessonId})
 */
export class CbnProvider implements IProvider {
  private readonly apiHelper = new ApiHelper();
  private readonly deviceFlowHelper = new DeviceFlowHelper();

  private async apiRequest<T>(path: string, auth?: ContentProviderAuthData | null): Promise<T | null> {
    return this.apiHelper.apiRequest<T>(this.config, this.id, path, auth);
  }

  readonly id = "cbn";
  readonly name = "CBN";

  readonly logos: ProviderLogos = { light: CBN_LOGO, dark: CBN_LOGO };

  readonly config: ContentProviderConfig = {
    id: "cbn",
    name: "CBN",
    apiBase: API_BASE,
    oauthBase: `${API_BASE}/auth`,
    clientId: "freeplay",
    scopes: [],
    supportsDeviceFlow: true,
    deviceAuthEndpoint: "/device",
    endpoints: {
      catalog: "/catalog",
      courseDetail: (courseId: string) => `/catalog/${courseId}`,
      lessonPlaylist: (lessonId: string) => `/lesson-playlist/${lessonId}`
    }
  };

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["device_flow"];
  readonly capabilities: ProviderCapabilities = { browse: true, presentations: false, playlist: true, instructions: true, mediaLicensing: false };

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);

    if (depth === 0) {
      return [{ type: "folder" as const, id: "catalog-root", title: "Catalog", path: "/catalog" }];
    }

    if (segments[0] !== "catalog") return [];

    if (depth === 1) return this.getCourses(auth);
    if (depth === 2) return this.getLessons(segments[1], path!, auth);
    if (depth === 3) return this.getVideos(segments[2], auth);

    return [];
  }

  private async getCourses(auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const response = await this.apiRequest<CbnCatalogCourse[]>(this.config.endpoints.catalog as string, auth);
    if (!Array.isArray(response)) return [];
    return convertCoursesToFolders(response);
  }

  private async getLessons(courseId: string, coursePath: string, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const pathFn = this.config.endpoints.courseDetail as (id: string) => string;
    const response = await this.apiRequest<CbnCourseDetail>(pathFn(courseId), auth);
    if (!response?.lessons) return [];
    return convertLessonsToFolders(response.lessons, coursePath);
  }

  private async getVideos(lessonId: string, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const playlist = await this.fetchPlaylist(lessonId, auth);
    return playlist ? convertPlaylistToFiles(playlist) : [];
  }

  private async fetchPlaylist(lessonId: string, auth?: ContentProviderAuthData | null): Promise<CbnLessonPlaylist | null> {
    const pathFn = this.config.endpoints.lessonPlaylist as (id: string) => string;
    return this.apiRequest<CbnLessonPlaylist>(pathFn(lessonId), auth);
  }

  async getPlaylist(path: string, auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const { segments, depth } = parsePath(path);
    if (depth !== 3 || segments[0] !== "catalog") return null;

    const playlist = await this.fetchPlaylist(segments[2], auth);
    if (!playlist || playlist.playlist.length === 0) return null;
    return convertPlaylistToFiles(playlist);
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const { segments, depth } = parsePath(path);
    if (depth !== 3 || segments[0] !== "catalog") return null;

    const playlist = await this.fetchPlaylist(segments[2], auth);
    if (!playlist || playlist.playlist.length === 0) return null;
    return convertPlaylistToInstructions(playlist);
  }

  supportsDeviceFlow(): boolean {
    return this.deviceFlowHelper.supportsDeviceFlow(this.config);
  }

  async initiateDeviceFlow(): Promise<DeviceAuthorizationResponse | null> {
    return this.deviceFlowHelper.initiateDeviceFlow(this.config);
  }

  async pollDeviceFlowToken(deviceCode: string): Promise<DeviceFlowPollResult> {
    return this.deviceFlowHelper.pollDeviceFlowToken(this.config, deviceCode);
  }
}
