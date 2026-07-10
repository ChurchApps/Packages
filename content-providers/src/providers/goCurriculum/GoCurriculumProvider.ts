import { AuthType, ContentFile, ContentItem, ContentProviderAuthData, ContentProviderConfig, Instructions, ProviderCapabilities, ProviderLogos } from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { createFolder, createFile, detectMediaType, filesToInstructions, slugify } from "../../utils";
import { OAuthHelper } from "../../helpers";
import { getProviderSecret } from "../../helpers/ProviderSecrets";
import { BaseProvider } from "../BaseProvider";
import goCurriculumData from "./data.json";
import { GoCurriculumData, GoCurriculumCollection } from "./GoCurriculumInterfaces";

/**
 * Path: / → collections, /{collection} → lessons (leaf), /{collection}/{lesson} → files.
 * data.json is Go's catalog export dropped in verbatim (media hosted on Dropbox);
 * a valid gocurriculum.com login (WP OAuth Server plugin) gates all of it.
 */
export class GoCurriculumProvider extends BaseProvider {
  private readonly oauthHelper = new OAuthHelper();
  private readonly verifiedTokens = new Set<string>();

  readonly id = "gocurriculum";
  readonly name = "Go Curriculum";

  readonly logos: ProviderLogos = {
    light: "https://gocurriculum.com/wp-content/uploads/go-logo-curriculum-v2.png",
    dark: "https://gocurriculum.com/wp-content/uploads/go-logo-curriculum-v2.png"
  };

  readonly config: ContentProviderConfig = {
    id: "gocurriculum",
    name: "Go Curriculum",
    apiBase: "https://gocurriculum.com",
    oauthBase: "https://gocurriculum.com/oauth",
    clientId: "Rdrvz9jz9nTNf8rCsbpuAgVLdoWHZmcjdmmrP0Bw",
    // supplied at runtime via setProviderSecret("gocurriculum", ...) — never commit the value
    get clientSecret(): string { return getProviderSecret("gocurriculum"); },
    scopes: ["basic"]
  };

  private data: GoCurriculumData = goCurriculumData;

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["oauth_pkce"];
  readonly capabilities: ProviderCapabilities = { browse: true, playlist: true, instructions: true, mediaLicensing: false };

  // ponytail: any valid login unlocks everything for the pilot — per-tier (MemberPress) filtering waits on Go's membership endpoint
  private async verifyAuth(auth?: ContentProviderAuthData | null): Promise<boolean> {
    const token = auth?.access_token;
    if (!token) return false;
    if (this.verifiedTokens.has(token)) return true;
    try {
      // POST body instead of Authorization header — WP hosts commonly strip the header
      const response = await fetch(`${this.config.oauthBase}/me`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ access_token: token }).toString() });
      if (!response.ok) return false;
      this.verifiedTokens.add(token);
      return true;
    } catch {
      return false;
    }
  }

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    if (!(await this.verifyAuth(auth))) return [];
    const { segments, depth } = parsePath(path);

    if (depth === 0) return this.data.catalog.map(c => createFolder(c.id, c.name, `/${c.id}`, c.thumbnail));

    const collection = this.data.catalog.find(c => c.id === segments[0]);
    if (!collection) return [];

    if (depth === 1) return collection.lessons.map(l => createFolder(l.id, l.name, `/${collection.id}/${l.id}`, l.thumbnail || collection.thumbnail, true));
    if (depth === 2) return this.getLessonFiles(collection, segments[1]);

    return [];
  }

  private getLessonFiles(collection: GoCurriculumCollection, lessonId: string): ContentFile[] {
    const lesson = collection.lessons.find(l => l.id === lessonId);
    if (!lesson) return [];
    // ponytail: playlist only — resources are PDFs/docx leader material with nothing to present; wire them into instructions if a consumer grows a downloads section
    return lesson.playlist.map(f => createFile(slugify(f.file), f.title, f.url, { mediaType: detectMediaType(`${f.url} ${f.file}`, f.mediaType), thumbnail: f.thumbnail || lesson.thumbnail || collection.thumbnail, seconds: f.duration }));
  }

  async getPlaylist(path: string, auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    if (!(await this.verifyAuth(auth))) return null;
    const { segments, depth } = parsePath(path);
    if (depth !== 2) return null;

    const collection = this.data.catalog.find(c => c.id === segments[0]);
    if (!collection) return null;

    const files = this.getLessonFiles(collection, segments[1]);
    return files.length > 0 ? files : null;
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const { segments, depth } = parsePath(path);
    if (depth !== 2) return null;

    const files = await this.getPlaylist(path, auth);
    if (!files) return null;

    const collection = this.data.catalog.find(c => c.id === segments[0]);
    const lesson = collection?.lessons.find(l => l.id === segments[1]);
    return filesToInstructions(lesson?.name || "Lesson", files);
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
}
