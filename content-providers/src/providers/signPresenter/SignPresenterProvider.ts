import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, ProviderCapabilities, AuthType, Instructions, DeviceAuthorizationResponse, DeviceFlowPollResult } from "../../interfaces";
import { detectMediaType, isMediaFile, createFile, filesToInstructions } from "../../utils";
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

  /** image and video/stream slides play directly; web slides only when the url is itself a media file. html/pdf/multi_zone and generic web pages aren't playable in ChurchApps. */
  private slideMediaType(slideType: string | undefined, url: string): "video" | "image" | "audio" | null {
    if (slideType === "image") return "image";
    if (slideType === "video" || slideType === "stream") return "video";
    if (slideType === "web" && isMediaFile(url)) return detectMediaType(url);
    return null;
  }

  /** The documented player contract; /content/playlists/:id/messages only covers templates 1 and 3 so most playlists come back empty there. */
  private async getMessages(playlistId: string, auth?: ContentProviderAuthData | null): Promise<ContentFile[]> {
    const response = await this.apiRequest<unknown>(`/v2/playlists/${playlistId}`, auth);
    const messages = this.extractList(response, "messages");
    if (messages.length === 0) return this.getLegacyMessages(playlistId, auth);

    const files: ContentFile[] = [];
    messages.forEach((msg, messageIndex) => {
      const slides = Array.isArray(msg.slides) ? (msg.slides as Record<string, unknown>[]) : [];
      slides.forEach((slide, slideIndex) => {
        const data = (slide.data || {}) as Record<string, unknown>;
        const url = typeof data.url === "string" ? data.url.trim() : "";
        const mediaType = url ? this.slideMediaType(slide.type as string | undefined, url) : null;
        if (!mediaType) return;

        const file = createFile(`${playlistId}-${messageIndex}-${slideIndex}`, msg.name as string, url, {
          mediaType,
          thumbnail: msg.thumbnail as string | undefined,
          seconds: slide.seconds as number | undefined,
          loop: data.loop as boolean | undefined
        });
        file.downloadUrl = url;
        files.push(file);
      });
    });

    return files;
  }

  private async getLegacyMessages(playlistId: string, auth?: ContentProviderAuthData | null): Promise<ContentFile[]> {
    const response = await this.apiRequest<unknown>(`/content/playlists/${playlistId}/messages`, auth);
    if (!response) return [];

    const files: ContentFile[] = [];
    for (const msg of this.extractList(response, "messages")) {
      const url = [msg.url, msg.thumbnail, msg.image].map(v => (typeof v === "string" ? v.trim() : "")).find(Boolean) || "";
      if (!url) continue;

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
