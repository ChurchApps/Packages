import {
  ContentProviderConfig, ContentProviderAuthData, ContentItem,
  ContentFile, ProviderLogos, ProviderCapabilities,
  AuthType, Instructions
} from "../../interfaces";
import { OAuthHelper } from "../../helpers";
import { toAuthData } from "../../helpers/TokenHelper";
import { filesToInstructions } from "../../utils";
import { BaseProvider } from "../BaseProvider";
import {
  DropboxListFolderResponse, DropboxEntry,
  DropboxFileEntry, DropboxTemporaryLinkResponse, DropboxSharedLinkResponse
} from "./DropboxInterfaces";
import {
  filterMediaEntries, folderEntryToContentFolder,
  fileEntryToContentFile
} from "./DropboxConverters";

const MAX_PAGINATION_CALLS = 50;

export class DropboxProvider extends BaseProvider {
  private readonly oauthHelper = new OAuthHelper();

  readonly id = "dropbox";
  readonly name = "Dropbox";

  readonly logos: ProviderLogos = {
    light: "https://cdn.prod.website-files.com/66c503d081b2f012369fc5d2/674000d6c0a42d41f8c331be_dropbox-2-logo-png-transparent.png",
    dark: "https://cdn.prod.website-files.com/66c503d081b2f012369fc5d2/674000d6c0a42d41f8c331be_dropbox-2-logo-png-transparent.png"
  };

  readonly config: ContentProviderConfig = {
    id: "dropbox",
    name: "Dropbox",
    apiBase: "https://api.dropboxapi.com",
    oauthBase: "https://www.dropbox.com/oauth2",
    clientId: "9io0q0q9angdz9j",
    scopes: []
  };

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["oauth_pkce"];
  readonly capabilities: ProviderCapabilities = {
    browse: true,
    playlist: true,
    instructions: true,
    mediaLicensing: false
  };

  private dropboxPost<T>(endpoint: string, body: Record<string, unknown>, auth?: ContentProviderAuthData | null): Promise<T | null> {
    if (!auth) { console.error("[Dropbox] No auth token provided"); return Promise.resolve(null); }
    return this.apiRequest<T>(endpoint, auth, "POST", body);
  }

  private async listAllEntries(dropboxPath: string, auth?: ContentProviderAuthData | null): Promise<DropboxEntry[]> {
    const allEntries: DropboxEntry[] = [];

    const response = await this.dropboxPost<DropboxListFolderResponse>(
      "/2/files/list_folder",
      { path: dropboxPath, recursive: false, include_media_info: false },
      auth
    );
    if (!response) return [];
    allEntries.push(...response.entries);

    let hasMore = response.has_more;
    let cursor = response.cursor;
    let calls = 0;
    while (hasMore && calls < MAX_PAGINATION_CALLS) {
      const cont = await this.dropboxPost<DropboxListFolderResponse>(
        "/2/files/list_folder/continue",
        { cursor },
        auth
      );
      if (!cont) break;
      allEntries.push(...cont.entries);
      hasMore = cont.has_more;
      cursor = cont.cursor;
      calls++;
    }

    return allEntries;
  }

  private async getSharedLink(filePath: string, auth?: ContentProviderAuthData | null): Promise<string | null> {
    if (!auth) return null;
    try {
      const url = `${this.config.apiBase}/2/sharing/create_shared_link_with_settings`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${auth.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ path: filePath, settings: { requested_visibility: "public" } })
      });

      if (response.ok) {
        const data = await response.json() as DropboxSharedLinkResponse;
        return this.sharedLinkToRawUrl(data.url);
      }

      // 409 = shared link already exists, extract it from the error response
      if (response.status === 409) {
        const error = await response.json();
        const existingUrl = error?.error?.shared_link_already_exists?.metadata?.url;
        if (existingUrl) return this.sharedLinkToRawUrl(existingUrl);
      }

      const errorText = await response.text();
      console.warn(`[Dropbox] Shared link failed for ${filePath} (${response.status}): ${errorText}`);
      return null;
    } catch (err) {
      console.warn("[Dropbox] Shared link error:", err);
      return null;
    }
  }

  private sharedLinkToRawUrl(sharedUrl: string): string {
    const url = new URL(sharedUrl);
    url.searchParams.delete("dl");
    url.searchParams.set("raw", "1");
    return url.toString();
  }

  private async getTemporaryLink(filePath: string, auth?: ContentProviderAuthData | null): Promise<string | null> {
    const response = await this.dropboxPost<DropboxTemporaryLinkResponse>(
      "/2/files/get_temporary_link",
      { path: filePath },
      auth
    );
    return response?.link || null;
  }

  private async resolveFileLinks(fileEntries: DropboxFileEntry[], auth?: ContentProviderAuthData | null): Promise<ContentFile[]> {
    const results = await Promise.all(
      fileEntries.map(async (entry) => {
        const [viewUrl, downloadUrl] = await Promise.all([
          this.getSharedLink(entry.path_lower, auth),
          this.getTemporaryLink(entry.path_lower, auth)
        ]);
        return { entry, viewUrl, downloadUrl };
      })
    );
    return results
      .filter((r) => r.viewUrl || r.downloadUrl)
      .map(r => fileEntryToContentFile(r.entry, r.viewUrl || r.downloadUrl!, r.downloadUrl));
  }

  private async checkIsLeaf(folderPath: string, auth?: ContentProviderAuthData | null): Promise<boolean> {
    const response = await this.dropboxPost<DropboxListFolderResponse>(
      "/2/files/list_folder",
      { path: folderPath, recursive: false, include_media_info: false },
      auth
    );
    if (!response) return false;
    return !response.entries.some(e => e[".tag"] === "folder");
  }

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    // Dropbox API: root = "", subfolders use path_lower
    const dropboxPath = (path && path !== "/") ? (path.startsWith("/") ? path : "/" + path) : "";

    const allEntries = await this.listAllEntries(dropboxPath, auth);
    const { folders, mediaFiles } = filterMediaEntries(allEntries);

    const leafChecks = await Promise.all(
      folders.map(f => this.checkIsLeaf(f.path_lower, auth).then(isLeaf => ({ folder: f, isLeaf })))
    );
    const folderItems: ContentItem[] = leafChecks.map(({ folder, isLeaf }) => folderEntryToContentFolder(folder, isLeaf));
    const fileItems = await this.resolveFileLinks(mediaFiles, auth);

    return [...folderItems, ...fileItems];
  }

  private async resolveMediaFiles(path: string, auth?: ContentProviderAuthData | null): Promise<{ files: ContentFile[]; dropboxPath: string } | null> {
    if (!path || path === "/") return null;
    const dropboxPath = path.startsWith("/") ? path : "/" + path;

    const allEntries = await this.listAllEntries(dropboxPath, auth);
    const { mediaFiles } = filterMediaEntries(allEntries);
    if (mediaFiles.length === 0) return null;

    const files = await this.resolveFileLinks(mediaFiles, auth);
    if (files.length === 0) return null;
    return { files, dropboxPath };
  }

  async getPlaylist(path: string, auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const resolved = await this.resolveMediaFiles(path, auth);
    return resolved?.files ?? null;
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const resolved = await this.resolveMediaFiles(path, auth);
    if (!resolved) return null;

    const segments = resolved.dropboxPath.split("/").filter(Boolean);
    const folderName = segments[segments.length - 1] || "Dropbox";
    return filesToInstructions(folderName, resolved.files, { id: "dropbox-section", label: folderName });
  }

  generateCodeVerifier(): string {
    return this.oauthHelper.generateCodeVerifier();
  }

  async buildAuthUrl(codeVerifier: string, redirectUri: string, state?: string): Promise<{ url: string; challengeMethod: string }> {
    const codeChallenge = await this.oauthHelper.generateCodeChallenge(codeVerifier);
    return { url: this.buildAuthUrlFromChallenge(codeChallenge, redirectUri, state || this.id), challengeMethod: "S256" };
  }

  /** For environments without Web Crypto (e.g. React Native): caller computes the challenge. */
  buildAuthUrlFromChallenge(codeChallenge: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      // Dropbox requires token_access_type=offline to return a refresh_token
      token_access_type: "offline",
      state
    });
    return `${this.config.oauthBase}/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, codeVerifier: string, redirectUri: string): Promise<ContentProviderAuthData | null> {
    // Dropbox token endpoint differs: api.dropboxapi.com not www.dropbox.com
    try {
      const params = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: this.config.clientId,
        code_verifier: codeVerifier
      });

      const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
      });

      if (!response.ok) return null;

      return toAuthData(await response.json());
    } catch {
      return null;
    }
  }
}
