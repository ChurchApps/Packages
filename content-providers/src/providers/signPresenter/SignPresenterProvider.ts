import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, ProviderCapabilities, AuthType, Instructions, DeviceAuthorizationResponse, DeviceFlowPollResult } from "../../interfaces";
import { detectMediaType, createFile, filesToInstructions } from "../../utils";
import { parsePath } from "../../pathUtils";
import { OAuthHelper, DeviceFlowHelper } from "../../helpers";
import { BaseProvider } from "../BaseProvider";

/** Browses SignPresenter playlists → messages (files). */
export class SignPresenterProvider extends BaseProvider {
  private readonly oauthHelper = new OAuthHelper();
  private readonly deviceFlowHelper = new DeviceFlowHelper();

  readonly id = "signpresenter";
  readonly name = "SignPresenter";

  readonly logos: ProviderLogos = { light: "https://signpresenter.com/files/shared/images/logo.png", dark: "https://signpresenter.com/files/shared/images/logo.png" };

  readonly config: ContentProviderConfig = { id: "signpresenter", name: "SignPresenter", apiBase: "https://api.signpresenter.com", oauthBase: "https://api.signpresenter.com/oauth", clientId: "lessonsscreen-tv", scopes: ["openid", "profile", "content"], supportsDeviceFlow: true, deviceAuthEndpoint: "/device/authorize" };

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["oauth_pkce", "device_flow"];
  readonly capabilities: ProviderCapabilities = { browse: true, playlist: true, instructions: true, mediaLicensing: false };

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);

    if (depth === 0) {
      return [{ type: "folder" as const, id: "playlists-root", title: "Playlists", path: "/playlists" }];
    }

    if (segments[0] !== "playlists") return [];
    if (depth === 1) return this.getPlaylists(auth);
    if (depth === 2) return this.getMessages(segments[1], auth);

    return [];
  }

  private extractList(response: unknown, key: string): Record<string, unknown>[] {
    if (Array.isArray(response)) return response;
    const record = response as Record<string, unknown> | null;
    const list = record?.data || record?.[key] || [];
    return Array.isArray(list) ? list : [];
  }

  private async getPlaylists(auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const response = await this.apiRequest<unknown>("/content/playlists", auth);
    if (!response) return [];

    return this.extractList(response, "playlists").map((p) => ({
      type: "folder" as const,
      id: p.id as string,
      title: p.name as string,
      thumbnail: p.image as string | undefined,
      path: `/playlists/${p.id}`,
      isLeaf: true
    }));
  }

  private async getMessages(playlistId: string, auth?: ContentProviderAuthData | null): Promise<ContentFile[]> {
    const response = await this.apiRequest<unknown>(`/content/playlists/${playlistId}/messages`, auth);
    if (!response) return [];

    const files: ContentFile[] = [];
    for (const msg of this.extractList(response, "messages")) {
      if (!msg.url) continue;

      const url = msg.url as string;
      const file = createFile(msg.id as string, msg.name as string, url, {
        mediaType: detectMediaType(url, msg.mediaType as string | undefined),
        thumbnail: (msg.thumbnail || msg.image) as string | undefined,
        seconds: msg.seconds as number | undefined
      });
      file.downloadUrl = url;
      files.push(file);
    }

    return files;
  }

  async getPlaylist(path: string, auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const { segments, depth } = parsePath(path);
    if (depth < 2 || segments[0] !== "playlists") return null;

    const files = await this.getMessages(segments[1], auth);
    return files.length > 0 ? files : null;
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const { segments, depth } = parsePath(path);
    if (depth < 2 || segments[0] !== "playlists") return null;

    const playlistId = segments[1];
    const files = await this.getMessages(playlistId, auth);
    if (files.length === 0) return null;

    const playlists = await this.getPlaylists(auth);
    const title = (playlists.find(p => p.id === playlistId)?.title || "Playlist") as string;

    const instructions = filesToInstructions(title, files, { id: playlistId + "-section", label: title });
    // Wrap the section in a header for consistency with other providers
    return { name: title, items: [{ id: playlistId + "-header", itemType: "header", label: title, children: instructions.items }] };
  }

  generateCodeVerifier(): string {
    return this.oauthHelper.generateCodeVerifier();
  }

  async buildAuthUrl(codeVerifier: string, redirectUri: string, state?: string): Promise<{ url: string; challengeMethod: string }> {
    return this.oauthHelper.buildAuthUrl(this.config, codeVerifier, redirectUri, state || this.id);
  }

  buildAuthUrlFromChallenge(codeChallenge: string, redirectUri: string, state: string): string {
    return this.oauthHelper.buildAuthUrlFromChallenge(this.config, codeChallenge, redirectUri, state);
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
