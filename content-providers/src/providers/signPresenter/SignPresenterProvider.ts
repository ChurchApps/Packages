import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, ProviderCapabilities, IProvider, AuthType, Instructions, InstructionItem, DeviceAuthorizationResponse, DeviceFlowPollResult } from "../../interfaces";
import { detectMediaType, createFile } from "../../utils";
import { parsePath } from "../../pathUtils";
import { ApiHelper, OAuthHelper, DeviceFlowHelper } from "../../helpers";

/**
 * SignPresenter Provider
 *
 * Path structure:
 *   /playlists                    -> list playlists
 *   /playlists/{playlistId}       -> list messages (files)
 */
export class SignPresenterProvider implements IProvider {
  private readonly apiHelper = new ApiHelper();
  private readonly oauthHelper = new OAuthHelper();
  private readonly deviceFlowHelper = new DeviceFlowHelper();

  private async apiRequest<T>(path: string, auth?: ContentProviderAuthData | null): Promise<T | null> {
    return this.apiHelper.apiRequest<T>(this.config, this.id, path, auth);
  }
  readonly id = "signpresenter";
  readonly name = "SignPresenter";

  readonly logos: ProviderLogos = { light: "https://signpresenter.com/files/shared/images/logo.png", dark: "https://signpresenter.com/files/shared/images/logo.png" };

  readonly config: ContentProviderConfig = { id: "signpresenter", name: "SignPresenter", apiBase: "https://api.signpresenter.com", oauthBase: "https://api.signpresenter.com/oauth", clientId: "lessonsscreen-tv", scopes: ["openid", "profile", "content"], supportsDeviceFlow: true, deviceAuthEndpoint: "/device/authorize", endpoints: { playlists: "/content/playlists", messages: (playlistId: string) => `/content/playlists/${playlistId}/messages` } };

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["oauth_pkce", "device_flow"];
  readonly capabilities: ProviderCapabilities = { browse: true, playlist: true, instructions: true, mediaLicensing: false };

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);

    if (depth === 0) {
      return [
        {
          type: "folder" as const,
          id: "playlists-root",
          title: "Playlists",
          path: "/playlists"
        }
      ];
    }

    const root = segments[0];
    if (root !== "playlists") return [];

    // /playlists -> list all playlists
    if (depth === 1) {
      return this.getPlaylists(auth);
    }

    // /playlists/{playlistId} -> list messages
    if (depth === 2) {
      const playlistId = segments[1];
      return this.getMessages(playlistId, auth);
    }

    return [];
  }

  private async getPlaylists(auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const apiPath = this.config.endpoints.playlists as string;
    const response = await this.apiRequest<unknown>(apiPath, auth);
    if (!response) return [];

    const playlists = Array.isArray(response)
      ? response
      : ((response as Record<string, unknown>).data || (response as Record<string, unknown>).playlists || []) as Record<string, unknown>[];

    if (!Array.isArray(playlists)) return [];

    return playlists.map((p) => ({
      type: "folder" as const,
      id: p.id as string,
      title: p.name as string,
      thumbnail: p.image as string | undefined,
      path: `/playlists/${p.id}`,
      isLeaf: true
    }));
  }

  private async getMessages(playlistId: string, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const pathFn = this.config.endpoints.messages as (id: string) => string;
    const response = await this.apiRequest<unknown>(pathFn(playlistId), auth);
    if (!response) return [];

    const messages = Array.isArray(response)
      ? response
      : ((response as Record<string, unknown>).data || (response as Record<string, unknown>).messages || []) as Record<string, unknown>[];

    if (!Array.isArray(messages)) return [];

    const files: ContentFile[] = [];

    for (const msg of messages) {
      if (!msg.url) continue;

      const url = msg.url as string;
      const seconds = msg.seconds as number | undefined;
      const file = createFile(
        msg.id as string,
        msg.name as string,
        url,
        {
          mediaType: detectMediaType(url, msg.mediaType as string | undefined),
          thumbnail: (msg.thumbnail || msg.image) as string | undefined,
          seconds
        }
      );
      file.downloadUrl = url;
      files.push(file);
    }

    return files;
  }

  async getPlaylist(path: string, auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const { segments, depth } = parsePath(path);

    if (depth < 2 || segments[0] !== "playlists") return null;

    const playlistId = segments[1];
    const files = await this.getMessages(playlistId, auth) as ContentFile[];
    return files.length > 0 ? files : null;
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const { segments, depth } = parsePath(path);

    if (depth < 2 || segments[0] !== "playlists") return null;

    const playlistId = segments[1];
    const files = await this.getMessages(playlistId, auth) as ContentFile[];
    if (files.length === 0) return null;

    // Get playlist info for title
    const playlists = await this.getPlaylists(auth);
    const playlist = playlists.find(p => p.id === playlistId);
    const title = playlist?.title || "Playlist";

    const actionItems: InstructionItem[] = files.map(file => ({
      id: file.id + "-action",
      itemType: "action",
      label: file.title,
      actionType: "play",
      seconds: file.seconds,
      children: [
        {
          id: file.id,
          itemType: "file",
          label: file.title,
          seconds: file.seconds,
          downloadUrl: file.downloadUrl || file.url,
          thumbnail: file.thumbnail
        }
      ]
    }));

    // Wrap actions in a section using the playlist name
    const sectionItem: InstructionItem = {
      id: playlistId + "-section",
      itemType: "section",
      label: title as string,
      children: actionItems
    };

    // Wrap section in a header for consistency with other providers
    const headerItem: InstructionItem = {
      id: playlistId + "-header",
      itemType: "header",
      label: title as string,
      children: [sectionItem]
    };

    return { name: title as string, items: [headerItem] };
  }

  // Auth methods
  supportsDeviceFlow(): boolean {
    return this.deviceFlowHelper.supportsDeviceFlow(this.config);
  }

  generateCodeVerifier(): string {
    return this.oauthHelper.generateCodeVerifier();
  }

  async buildAuthUrl(codeVerifier: string, redirectUri: string, state?: string): Promise<{ url: string; challengeMethod: string }> {
    return this.oauthHelper.buildAuthUrl(this.config, codeVerifier, redirectUri, state || this.id);
  }

  async exchangeCodeForTokens(code: string, codeVerifier: string, redirectUri: string): Promise<ContentProviderAuthData | null> {
    return this.oauthHelper.exchangeCodeForTokens(this.config, this.id, code, codeVerifier, redirectUri);
  }

  async initiateDeviceFlow(): Promise<DeviceAuthorizationResponse | null> {
    return this.deviceFlowHelper.initiateDeviceFlow(this.config);
  }

  async pollDeviceFlowToken(deviceCode: string): Promise<DeviceFlowPollResult> {
    return this.deviceFlowHelper.pollDeviceFlowToken(this.config, deviceCode);
  }
}
