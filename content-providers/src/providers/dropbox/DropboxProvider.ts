import {
  ContentProviderConfig, ContentProviderAuthData, ContentItem,
  ContentFile, ProviderLogos, ProviderCapabilities, IProvider,
  AuthType, Instructions
} from "../../interfaces";
import { OAuthHelper } from "../../helpers";
import {
  DropboxListFolderResponse, DropboxEntry,
  DropboxFileEntry, DropboxTemporaryLinkResponse, DropboxSharedLinkResponse
} from "./DropboxInterfaces";
import {
  filterMediaEntries, folderEntryToContentFolder,
  fileEntryToContentFile, buildInstructionsFromFiles
} from "./DropboxConverters";

const MAX_PAGINATION_CALLS = 50;

export class DropboxProvider implements IProvider {
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
    clientId: "edggy1jh5vvnxyd",
    scopes: [],
    endpoints: {
      listFolder: "/2/files/list_folder",
      listFolderContinue: "/2/files/list_folder/continue",
      getTemporaryLink: "/2/files/get_temporary_link"
    }
  };

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["oauth_pkce"];
  readonly capabilities: ProviderCapabilities = {
    browse: true,
    presentations: false,
    playlist: true,
    instructions: true,
    mediaLicensing: false
  };

  // -- Pagination helper --

  private async dropboxPost<T>(endpoint: string, body: Record<string, unknown>, auth?: ContentProviderAuthData | null): Promise<T | null> {
    if (!auth) { console.error("[Dropbox] No auth token provided"); return null; }
    try {
      const url = `${this.config.apiBase}${endpoint}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${auth.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Dropbox] API error ${response.status}: ${errorText}`);
        return null;
      }
      return await response.json();
    } catch (err) {
      console.error("[Dropbox] Fetch error:", err);
      return null;
    }
  }

  private async listAllEntries(dropboxPath: string, auth?: ContentProviderAuthData | null): Promise<DropboxEntry[]> {
    const allEntries: DropboxEntry[] = [];

    const response = await this.dropboxPost<DropboxListFolderResponse>(
      this.config.endpoints.listFolder as string,
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
        this.config.endpoints.listFolderContinue as string,
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

  // -- File link helpers --

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
    // Convert shared link to raw content URL: replace dl=0 with raw=1
    const url = new URL(sharedUrl);
    url.searchParams.delete("dl");
    url.searchParams.set("raw", "1");
    return url.toString();
  }

  private async getTemporaryLink(filePath: string, auth?: ContentProviderAuthData | null): Promise<string | null> {
    const response = await this.dropboxPost<DropboxTemporaryLinkResponse>(
      this.config.endpoints.getTemporaryLink as string,
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

  // -- Leaf detection --

  private async checkIsLeaf(folderPath: string, auth?: ContentProviderAuthData | null): Promise<boolean> {
    const response = await this.dropboxPost<DropboxListFolderResponse>(
      this.config.endpoints.listFolder as string,
      { path: folderPath, recursive: false, include_media_info: false },
      auth
    );
    if (!response) return false;
    return !response.entries.some(e => e[".tag"] === "folder");
  }

  // -- IProvider methods --

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    // Root = "" for Dropbox API, subfolders use their path_lower directly
    const dropboxPath = (path && path !== "/") ? (path.startsWith("/") ? path : "/" + path) : "";

    const allEntries = await this.listAllEntries(dropboxPath, auth);
    const { folders, mediaFiles } = filterMediaEntries(allEntries);

    // Check each subfolder for leaf status in parallel
    const leafChecks = await Promise.all(
      folders.map(f => this.checkIsLeaf(f.path_lower, auth).then(isLeaf => ({ folder: f, isLeaf })))
    );
    const folderItems: ContentItem[] = leafChecks.map(({ folder, isLeaf }) => folderEntryToContentFolder(folder, isLeaf));
    const fileItems = await this.resolveFileLinks(mediaFiles, auth);

    return [...folderItems, ...fileItems];
  }

  async getPlaylist(path: string, auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    if (!path || path === "/") return null;
    const dropboxPath = path.startsWith("/") ? path : "/" + path;

    const allEntries = await this.listAllEntries(dropboxPath, auth);
    const { mediaFiles } = filterMediaEntries(allEntries);
    if (mediaFiles.length === 0) return null;

    const files = await this.resolveFileLinks(mediaFiles, auth);
    return files.length > 0 ? files : null;
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    if (!path || path === "/") return null;
    const dropboxPath = path.startsWith("/") ? path : "/" + path;

    const allEntries = await this.listAllEntries(dropboxPath, auth);
    const { mediaFiles } = filterMediaEntries(allEntries);
    if (mediaFiles.length === 0) return null;

    const files = await this.resolveFileLinks(mediaFiles, auth);
    if (files.length === 0) return null;

    const segments = dropboxPath.split("/").filter(Boolean);
    const folderName = segments[segments.length - 1] || "Dropbox";
    return buildInstructionsFromFiles(files, folderName);
  }

  // -- Auth methods --

  supportsDeviceFlow(): boolean {
    return false;
  }

  generateCodeVerifier(): string {
    return this.oauthHelper.generateCodeVerifier();
  }

  async buildAuthUrl(codeVerifier: string, redirectUri: string, state?: string): Promise<{ url: string; challengeMethod: string }> {
    const result = await this.oauthHelper.buildAuthUrl(this.config, codeVerifier, redirectUri, state || this.id);
    const url = new URL(result.url);
    // Dropbox uses app-level permissions configured in the App Console, not URL scopes
    url.searchParams.delete("scope");
    // Dropbox requires token_access_type=offline to return a refresh_token
    url.searchParams.set("token_access_type", "offline");
    return { url: url.toString(), challengeMethod: result.challengeMethod };
  }

  async exchangeCodeForTokens(code: string, codeVerifier: string, redirectUri: string): Promise<ContentProviderAuthData | null> {
    // Custom implementation: Dropbox token endpoint is on api.dropboxapi.com,
    // not www.dropbox.com (which OAuthHelper would construct from oauthBase).
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

      const data = await response.json();
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type || "Bearer",
        created_at: Math.floor(Date.now() / 1000),
        expires_in: data.expires_in,
        scope: data.scope || ""
      };
    } catch {
      return null;
    }
  }
}
