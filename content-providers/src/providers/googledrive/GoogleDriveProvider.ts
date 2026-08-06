import {
  ContentProviderConfig, ContentProviderAuthData, ContentItem,
  ContentFile, ProviderLogos, ProviderCapabilities,
  AuthType, Instructions
} from "../../interfaces";
import { OAuthHelper } from "../../helpers";
import { getProviderSecret } from "../../helpers/ProviderSecrets";
import { detectMediaType, filesToInstructions } from "../../utils";
import { BaseProvider } from "../BaseProvider";
import { DriveFile, DriveFileListResponse } from "./GoogleDriveInterfaces";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const MAX_PAGINATION_CALLS = 10;
// ponytail: leaf detection is one batched query; past this many sibling folders the q param gets unwieldy — leave isLeaf undefined
const LEAF_CHECK_MAX_FOLDERS = 50;

export class GoogleDriveProvider extends BaseProvider {
  private readonly oauthHelper = new OAuthHelper();

  readonly id = "googledrive";
  readonly name = "Google Drive";

  readonly logos: ProviderLogos = {
    light: "https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png",
    dark: "https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png"
  };

  readonly config: ContentProviderConfig = {
    id: "googledrive",
    name: "Google Drive",
    apiBase: "https://www.googleapis.com/drive/v3",
    // Token endpoint host; the user-facing consent screen is accounts.google.com (see buildAuthUrlFromChallenge)
    oauthBase: "https://oauth2.googleapis.com",
    clientId: "214868247432-hao323qmsfu96h345udaifs8f1nc7i71.apps.googleusercontent.com",
    // Google requires client_secret even for PKCE public clients; injected server-side via setProviderSecret("googledrive", ...)
    get clientSecret(): string { return getProviderSecret("googledrive"); },
    scopes: ["https://www.googleapis.com/auth/drive.readonly"]
  };

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["oauth_pkce"];
  readonly capabilities: ProviderCapabilities = {
    browse: true,
    playlist: true,
    instructions: true,
    mediaLicensing: false
  };

  // Paths are Drive folder ids ("/<id>"), not names; root is "" or "/"
  private folderIdFromPath(path?: string | null): string {
    const trimmed = (path || "").replace(/^\//, "");
    return trimmed || "root";
  }

  private isValidId(id: string): boolean {
    return /^[\w-]+$/.test(id);
  }

  private async listFiles(query: string, auth?: ContentProviderAuthData | null): Promise<DriveFile[]> {
    if (!auth) { console.error("[GoogleDrive] No auth token provided"); return []; }
    const all: DriveFile[] = [];
    let pageToken: string | undefined;
    for (let i = 0; i < MAX_PAGINATION_CALLS; i++) {
      const params = new URLSearchParams({
        q: query,
        fields: "nextPageToken,files(id,name,mimeType,thumbnailLink,webContentLink,parents)",
        orderBy: "folder,name_natural",
        pageSize: "1000",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true"
      });
      if (pageToken) params.set("pageToken", pageToken);
      const response = await this.apiRequest<DriveFileListResponse>(`/files?${params.toString()}`, auth);
      if (!response) break;
      all.push(...(response.files || []));
      pageToken = response.nextPageToken;
      if (!pageToken) break;
    }
    return all;
  }

  private async childItems(folderId: string, auth?: ContentProviderAuthData | null): Promise<{ folders: DriveFile[]; mediaFiles: DriveFile[] }> {
    const entries = await this.listFiles(`'${folderId}' in parents and trashed=false`, auth);
    const folders = entries.filter(e => e.mimeType === FOLDER_MIME);
    const mediaFiles = entries.filter(e => e.mimeType.startsWith("video/") || e.mimeType.startsWith("image/"));
    return { folders, mediaFiles };
  }

  /** One batched query marks which sibling folders have subfolders; null = unknown (isLeaf omitted). */
  private async leafIds(folders: DriveFile[], auth?: ContentProviderAuthData | null): Promise<Set<string> | null> {
    if (folders.length === 0 || folders.length > LEAF_CHECK_MAX_FOLDERS) return null;
    const parentClause = folders.map(f => `'${f.id}' in parents`).join(" or ");
    const subfolders = await this.listFiles(`mimeType='${FOLDER_MIME}' and trashed=false and (${parentClause})`, auth);
    const parentsWithSubfolders = new Set(subfolders.flatMap(s => s.parents || []));
    return new Set(folders.filter(f => !parentsWithSubfolders.has(f.id)).map(f => f.id));
  }

  private toContentFile(file: DriveFile): ContentFile {
    const url = file.webContentLink || `https://drive.google.com/uc?id=${file.id}&export=download`;
    return {
      type: "file",
      id: file.id,
      title: file.name,
      mediaType: detectMediaType(file.name, file.mimeType),
      thumbnail: file.thumbnailLink,
      url,
      downloadUrl: url
    };
  }

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const folderId = this.folderIdFromPath(path);
    if (!this.isValidId(folderId)) return [];

    const { folders, mediaFiles } = await this.childItems(folderId, auth);
    const leaves = await this.leafIds(folders, auth);
    const folderItems: ContentItem[] = folders.map(f => ({ type: "folder", id: f.id, title: f.name, path: `/${f.id}`, isLeaf: leaves ? leaves.has(f.id) : undefined }));
    return [...folderItems, ...mediaFiles.map(f => this.toContentFile(f))];
  }

  async getPlaylist(path: string, auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const folderId = this.folderIdFromPath(path);
    if (folderId === "root" || !this.isValidId(folderId)) return null;

    const { mediaFiles } = await this.childItems(folderId, auth);
    return mediaFiles.length > 0 ? mediaFiles.map(f => this.toContentFile(f)) : null;
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const files = await this.getPlaylist(path, auth);
    if (!files) return null;

    // Path carries only the folder id; fetch the name for the section label
    const meta = await this.apiRequest<DriveFile>(`/files/${this.folderIdFromPath(path)}?fields=name&supportsAllDrives=true`, auth);
    const folderName = meta?.name || "Google Drive";
    return filesToInstructions(folderName, files, { id: "googledrive-section", label: folderName });
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
      // offline + consent so Google issues a refresh_token on every connect
      access_type: "offline",
      prompt: "consent",
      state
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, codeVerifier: string, redirectUri: string): Promise<ContentProviderAuthData | null> {
    return this.oauthHelper.exchangeCodeForTokens(this.config, this.id, code, codeVerifier, redirectUri);
  }
}
