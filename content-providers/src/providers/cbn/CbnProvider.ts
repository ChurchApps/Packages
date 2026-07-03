import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, ProviderCapabilities, AuthType, Instructions, DeviceAuthorizationResponse, DeviceFlowPollResult } from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { filesToInstructions } from "../../utils";
import { DeviceFlowHelper } from "../../helpers";
import { BaseProvider } from "../BaseProvider";
import { CbnCatalogCourse, CbnCourseDetail, CbnLessonPlaylist } from "./CbnInterfaces";
import { convertCoursesToFolders, convertLessonsToFolders, convertPlaylistToFiles } from "./CbnConverters";
import { CBN_LOGO } from "./logo";

const API_BASE = "https://sbamemberdev.wpenginepowered.com/wp-json/superbook/v1";

/** Faith-based kids' video curriculum with OAuth 2.0 Device Flow auth. */
export class CbnProvider extends BaseProvider {
  private readonly deviceFlowHelper = new DeviceFlowHelper();

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
    deviceAuthEndpoint: "/device"
  };

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["device_flow"];
  readonly capabilities: ProviderCapabilities = { browse: true, playlist: true, instructions: true, mediaLicensing: false };

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);

    if (depth === 0) {
      return [{ type: "folder" as const, id: "catalog-root", title: "Catalog", path: "/catalog" }];
    }

    if (segments[0] !== "catalog") return [];

    if (depth === 1) {
      const response = await this.apiRequest<CbnCatalogCourse[]>("/catalog", auth);
      return Array.isArray(response) ? convertCoursesToFolders(response) : [];
    }
    if (depth === 2) {
      const response = await this.apiRequest<CbnCourseDetail>(`/catalog/${segments[1]}`, auth);
      return response?.lessons ? convertLessonsToFolders(response.lessons, path!) : [];
    }
    if (depth === 3) {
      const resolved = await this.resolveFiles(path, auth);
      return resolved?.files ?? [];
    }

    return [];
  }

  /** Resolve a leaf path (/catalog/{courseId}/{lessonId}) to its playlist files. */
  private async resolveFiles(path: string | null | undefined, auth?: ContentProviderAuthData | null): Promise<{ files: ContentFile[]; lessonTitle?: string } | null> {
    const { segments, depth } = parsePath(path);
    if (depth !== 3 || segments[0] !== "catalog") return null;

    const playlist = await this.apiRequest<CbnLessonPlaylist>(`/lesson-playlist/${segments[2]}`, auth);
    if (!playlist || playlist.playlist.length === 0) return null;
    return { files: convertPlaylistToFiles(playlist), lessonTitle: playlist.lesson_title };
  }

  async getPlaylist(path: string, auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const resolved = await this.resolveFiles(path, auth);
    return resolved?.files ?? null;
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const resolved = await this.resolveFiles(path, auth);
    if (!resolved) return null;
    return filesToInstructions(resolved.lessonTitle || "Lesson", resolved.files);
  }

  async initiateDeviceFlow(): Promise<DeviceAuthorizationResponse | null> {
    return this.deviceFlowHelper.initiateDeviceFlow(this.config);
  }

  async pollDeviceFlowToken(deviceCode: string): Promise<DeviceFlowPollResult> {
    return this.deviceFlowHelper.pollDeviceFlowToken(this.config, deviceCode);
  }
}
