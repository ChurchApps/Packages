import {
  ContentProviderConfig, ContentProviderAuthData, ContentItem,
  ContentFile, ProviderLogos, ProviderCapabilities,
  AuthType, Instructions
} from "../../interfaces";
import { OAuthHelper } from "../../helpers";
import { getProviderSecret } from "../../helpers/ProviderSecrets";
import { detectMediaType, filesToInstructions, isMediaFile } from "../../utils";
import { BaseProvider } from "../BaseProvider";
import { DriveItem, DriveItemListResponse } from "./OneDriveInterfaces";

const API_BASE = "https://graph.microsoft.com/v1.0";
const MAX_PAGINATION_CALLS = 10;

export class OneDriveProvider extends BaseProvider {
  private readonly oauthHelper = new OAuthHelper();

  readonly id = "onedrive";
  readonly name = "OneDrive";

  readonly logos: ProviderLogos = {
    light: "https://res-1.cdn.office.net/files/fabric-cdn-prod_20230815.002/assets/brand-icons/product/png/onedrive_48x1.png",
    dark: "https://res-1.cdn.office.net/files/fabric-cdn-prod_20230815.002/assets/brand-icons/product/png/onedrive_48x1.png"
  };

  readonly config: ContentProviderConfig = {
    id: "onedrive",
    name: "OneDrive",
    apiBase: API_BASE,
    oauthBase: "https://login.microsoftonline.com/common/oauth2/v2.0",
    // Azure "FreePlay" registration; relay callbacks are registered as mobile/desktop (public client), so no secret is normally set
    clientId: "49a15ab2-868f-4612-8b03-c1c7fae485f1",
    get clientSecret(): string { return getProviderSecret("onedrive"); },
    scopes: ["Files.Read.All", "offline_access"]
  };

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["oauth_pkce"];
  readonly capabilities: ProviderCapabilities = {
    browse: true,
    playlist: true,
    instructions: true,
    mediaLicensing: false
  };

  // Paths are item ids ("/<id>"); personal-account ids contain "!"
  private itemIdFromPath(path?: string | null): string {
    return (path || "").replace(/^\//, "") || "root";
  }

  private isValidId(id: string): boolean {
    return /^[\w!.-]+$/.test(id);
  }

  private itemPath(id: string): string {
    return id === "root" ? "/me/drive/root" : `/me/drive/items/${encodeURIComponent(id)}`;
  }

  private async childItems(itemId: string, auth?: ContentProviderAuthData | null): Promise<{ folders: DriveItem[]; mediaFiles: DriveItem[] }> {
    if (!auth) { console.error("[OneDrive] No auth token provided"); return { folders: [], mediaFiles: [] }; }
    const all: DriveItem[] = [];
    let path = `${this.itemPath(itemId)}/children?$top=999&$expand=thumbnails`;
    for (let i = 0; i < MAX_PAGINATION_CALLS && path; i++) {
      const response = await this.apiRequest<DriveItemListResponse>(path, auth);
      if (!response) break;
      all.push(...(response.value || []));
      path = response["@odata.nextLink"]?.replace(API_BASE, "") || "";
    }
    const folders = all.filter(e => e.folder);
    const mediaFiles = all.filter(e => e.file && (["video/", "image/", "audio/"].some(prefix => e.file!.mimeType?.startsWith(prefix)) || isMediaFile(e.name)));
    return { folders, mediaFiles };
  }

  // Graph's pre-signed downloadUrl expires in ~1h, so hand out the stable /content URL; players resolve it with the token
  private toContentFile(item: DriveItem): ContentFile {
    const url = `${API_BASE}/me/drive/items/${encodeURIComponent(item.id)}/content`;
    return {
      type: "file",
      id: item.id,
      title: item.name,
      mediaType: detectMediaType(item.name, item.file?.mimeType),
      thumbnail: item.thumbnails?.[0]?.medium?.url,
      url,
      downloadUrl: url
    };
  }

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const itemId = this.itemIdFromPath(path);
    if (!this.isValidId(itemId)) return [];

    const { folders, mediaFiles } = await this.childItems(itemId, auth);
    const folderItems: ContentItem[] = folders.map(f => ({ type: "folder", id: f.id, title: f.name, path: `/${f.id}` }));
    return [...folderItems, ...mediaFiles.map(f => this.toContentFile(f))];
  }

  async getPlaylist(path: string, auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const itemId = this.itemIdFromPath(path);
    if (itemId === "root" || !this.isValidId(itemId)) return null;

    const { mediaFiles } = await this.childItems(itemId, auth);
    return mediaFiles.length > 0 ? mediaFiles.map(f => this.toContentFile(f)) : null;
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const files = await this.getPlaylist(path, auth);
    if (!files) return null;

    const meta = await this.apiRequest<DriveItem>(`${this.itemPath(this.itemIdFromPath(path))}?$select=name`, auth);
    const folderName = meta?.name || "OneDrive";
    return filesToInstructions(folderName, files, { id: "onedrive-section", label: folderName });
  }

  generateCodeVerifier(): string {
    return this.oauthHelper.generateCodeVerifier();
  }

  async buildAuthUrl(codeVerifier: string, redirectUri: string, state?: string): Promise<{ url: string; challengeMethod: string }> {
    const codeChallenge = await this.oauthHelper.generateCodeChallenge(codeVerifier);
    return { url: this.buildAuthUrlFromChallenge(codeChallenge, redirectUri, state || this.id), challengeMethod: "S256" };
  }

  buildAuthUrlFromChallenge(codeChallenge: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: this.config.scopes.join(" "),
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "select_account",
      state
    });
    return `${this.config.oauthBase}/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, codeVerifier: string, redirectUri: string): Promise<ContentProviderAuthData | null> {
    return this.oauthHelper.exchangeCodeForTokens(this.config, this.id, code, codeVerifier, redirectUri);
  }
}
