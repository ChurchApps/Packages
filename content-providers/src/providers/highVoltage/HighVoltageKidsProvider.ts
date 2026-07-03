import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, ProviderCapabilities, Instructions, AuthType } from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { BaseProvider } from "../BaseProvider";
import highVoltageData from "./data.json";
import { HighVoltageData } from "./HighVoltageKidsInterfaces";
import { getCollections, getStudyFolders, getLessonFolders, getLessonFiles, findStudy, findLesson, buildStudyPlaylist, buildLessonPlaylist } from "./HighVoltageConverters";
import { buildStudyInstructions, buildLessonInstructions } from "./HighVoltageInstructions";

/**
 * Path structure: / → collections, /{collection} → studies, /{collection}/{study} → lessons,
 * /{collection}/{study}/{lesson} → files (leaf).
 */
export class HighVoltageKidsProvider extends BaseProvider {
  readonly id = "highvoltagekids";
  readonly name = "High Voltage Kids";

  readonly logos: ProviderLogos = {
    light: "https://highvoltagekids.com/wp-content/uploads/2023/10/logo-300x300-1.webp",
    dark: "https://highvoltagekids.com/wp-content/uploads/2023/10/logo-300x300-1.webp"
  };

  readonly config: ContentProviderConfig = {
    id: "highvoltagekids",
    name: "High Voltage Kids",
    apiBase: "https://highvoltagekids.com",
    oauthBase: "",
    clientId: "",
    scopes: []
  };

  private data: HighVoltageData = highVoltageData;

  readonly requiresAuth = false;
  readonly authTypes: AuthType[] = ["none"];
  readonly capabilities: ProviderCapabilities = {
    browse: true,
    playlist: true,
    instructions: true,
    mediaLicensing: false
  };

  async browse(path?: string | null, _auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);

    if (depth === 0) return getCollections(this.data);
    if (depth === 1) return getStudyFolders(this.data, segments[0], path!);
    if (depth === 2) return getLessonFolders(this.data, segments[0], segments[1], path!);
    if (depth === 3) return getLessonFiles(this.data, segments[0], segments[1], segments[2]);

    return [];
  }

  async getPlaylist(path: string, _auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const { segments, depth } = parsePath(path);

    if (depth < 2) return null;

    const study = findStudy(this.data, segments[0], segments[1]);
    if (!study) return null;

    if (depth === 2) {
      const files = buildStudyPlaylist(study);
      return files.length > 0 ? files : null;
    }

    if (depth === 3) {
      const lesson = findLesson(this.data, segments[0], segments[1], segments[2]);
      if (!lesson) return null;
      const files = buildLessonPlaylist(lesson);
      return files.length > 0 ? files : null;
    }

    return null;
  }

  async getInstructions(path: string, _auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const { segments, depth } = parsePath(path);

    if (depth < 2) return null;

    const study = findStudy(this.data, segments[0], segments[1]);
    if (!study) return null;

    if (depth === 2) return buildStudyInstructions(study);

    if (depth === 3) {
      const lesson = findLesson(this.data, segments[0], segments[1], segments[2]);
      if (!lesson) return null;
      return buildLessonInstructions(lesson);
    }

    return null;
  }
}
