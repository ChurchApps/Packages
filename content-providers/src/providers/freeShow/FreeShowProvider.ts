import {
  AuthType,
  ContentFile,
  ContentItem,
  ContentProviderAuthData,
  ContentProviderConfig,
  Instructions,
  NetworkInstance,
  ProviderCapabilities,
  ProviderLogos
} from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { filesToInstructions } from "../../utils";
import { BaseProvider } from "../BaseProvider";
import announcementsShow from "./announcements.show.json";
import {
  authToNetworkInstance,
  MOCK_FREESHOW_INSTANCE,
  networkInstanceToAuth,
  parseShowExport,
  showToFiles,
  showToFolder
} from "./FreeShowConverters";
import { FreeShowDiscoverer, FreeShowShow } from "./FreeShowInterfaces";

const parsedMock = parseShowExport(announcementsShow);
const MOCK_SHOW_ID = parsedMock?.id || "announcements";
const MOCK_SHOW: FreeShowShow = parsedMock?.show || { name: "Announcements", layouts: {}, media: {}, slides: {} };

export class FreeShowProvider extends BaseProvider {
  readonly id = "freeshow";
  readonly name = "FreeShow";

  readonly logos: ProviderLogos = {
    light: "https://freeshow.app/images/favicon.png",
    dark: "https://freeshow.app/images/favicon.png"
  };

  readonly config: ContentProviderConfig = {
    id: "freeshow",
    name: "FreeShow",
    apiBase: "",
    oauthBase: "",
    clientId: "",
    scopes: []
  };

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["network_discovery"];
  readonly capabilities: ProviderCapabilities = {
    browse: true,
    playlist: true,
    instructions: true,
    mediaLicensing: false
  };

  private discoverer: FreeShowDiscoverer | null = null;

  setDiscoverer(discoverer: FreeShowDiscoverer | null): void {
    this.discoverer = discoverer;
  }

  async discoverInstances(): Promise<NetworkInstance[]> {
    if (this.discoverer) return this.discoverer();
    await new Promise(resolve => setTimeout(resolve, 600));
    return [MOCK_FREESHOW_INSTANCE];
  }

  toAuth(instance: NetworkInstance): ContentProviderAuthData {
    return networkInstanceToAuth(instance);
  }

  selectedInstance(auth?: ContentProviderAuthData | null): NetworkInstance | null {
    return authToNetworkInstance(auth);
  }

  async browse(path?: string | null, _auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { depth } = parsePath(path);
    if (depth === 0) return [showToFolder(MOCK_SHOW_ID, MOCK_SHOW)];
    return [];
  }

  async getPlaylist(path: string, _auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const { segments, depth } = parsePath(path);
    if (depth < 1 || segments[0] !== MOCK_SHOW_ID) return null;
    const files = showToFiles(MOCK_SHOW);
    return files.length > 0 ? files : null;
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const files = await this.getPlaylist(path, auth);
    if (!files) return null;
    return filesToInstructions(MOCK_SHOW.name || "Show", files);
  }
}
