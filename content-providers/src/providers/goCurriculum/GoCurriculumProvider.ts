import { AuthType, ContentFile, ContentItem, ContentProviderAuthData, ContentProviderConfig, Instructions, ProviderCapabilities, ProviderLogos } from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { createFolder, createFile, detectMediaType, filesToInstructions, isPlaylistMedia, slugify } from "../../utils";
import { OAuthHelper } from "../../helpers";
import { getProviderSecret } from "../../helpers/ProviderSecrets";
import { BaseProvider } from "../BaseProvider";
import goCurriculumData from "./data.json";
import { GoCurriculumData, GoCurriculumCollection } from "./GoCurriculumInterfaces";

/**
 * Path: / → age groups, /{group} → collections, /{group}/{collection} → lessons (leaf), /{group}/{collection}/{lesson} → files.
 * Each group is a Go export hosted on Dropbox (fetched at runtime so it auto-updates);
 * bundled data.json is the fallback when a fetch fails.
 * A valid gocurriculum.com login (WP OAuth Server plugin) gates all of it.
 */
const FEEDS = [
  { id: "elementary", name: "Elementary", url: "https://dl.dropboxusercontent.com/scl/fi/xortbrs2nk49wemscubpu/data.json?rlkey=gnzxyrauhud7xtjlejrs8ysp7" },
  { id: "preschool", name: "Preschool", url: "https://dl.dropboxusercontent.com/scl/fi/1cdovbglp5rpfmb9mdg2s/data.json?rlkey=miwsssb0o7i2wdijrdc7jjqcl" }
];
const CATALOG_TTL_MS = 60 * 60 * 1000;

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

  private data: Record<string, GoCurriculumData> = goCurriculumData;
  private dataFetchedAt = 0;

  private async getData(groupId: string): Promise<GoCurriculumData | undefined> {
    if (Date.now() - this.dataFetchedAt >= CATALOG_TTL_MS) {
      await Promise.all(FEEDS.map(async f => {
        try {
          const response = await fetch(f.url);
          if (response.ok) this.data[f.id] = await response.json() as GoCurriculumData;
        } catch { /* keep last good catalog (bundled data.json at worst) */ }
      }));
      this.dataFetchedAt = Date.now();
    }
    return this.data[groupId];
  }

  private async getCollection(segments: string[]): Promise<GoCurriculumCollection | undefined> {
    return (await this.getData(segments[0]))?.catalog.find(c => c.id === segments[1]);
  }

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

    if (depth === 0) return FEEDS.map(f => createFolder(f.id, f.name, `/${f.id}`));
    if (depth === 1) return ((await this.getData(segments[0]))?.catalog || []).map(c => createFolder(c.id, c.name, `/${segments[0]}/${c.id}`, c.thumbnail));

    const collection = await this.getCollection(segments);
    if (!collection) return [];

    if (depth === 2) return collection.lessons.map(l => createFolder(l.id, l.name, `/${segments[0]}/${collection.id}/${l.id}`, l.thumbnail || collection.thumbnail, true));
    if (depth === 3) return this.getLessonFiles(collection, segments[2]);

    return [];
  }

  private getLessonFiles(collection: GoCurriculumCollection, lessonId: string): ContentFile[] {
    const lesson = collection.lessons.find(l => l.id === lessonId);
    if (!lesson) return [];
    // playlist only — resources are PDFs/docx leader material with nothing to present; they surface via getInstructions().downloads
    return lesson.playlist.map(f => createFile(slugify(f.file), f.title, f.url, { mediaType: detectMediaType(`${f.url} ${f.file}`, f.mediaType), thumbnail: f.thumbnail || lesson.thumbnail || collection.thumbnail, seconds: f.duration }));
  }

  async getPlaylist(path: string, auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    if (!(await this.verifyAuth(auth))) return null;
    const { segments, depth } = parsePath(path);
    if (depth !== 3) return null;

    const collection = await this.getCollection(segments);
    if (!collection) return null;

    const files = this.getLessonFiles(collection, segments[2]);
    return files.length > 0 ? files : null;
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const { segments, depth } = parsePath(path);
    if (depth !== 3) return null;

    const files = await this.getPlaylist(path, auth);
    if (!files) return null;

    const collection = await this.getCollection(segments);
    const lesson = collection?.lessons.find(l => l.id === segments[2]);
    const instructions = filesToInstructions(lesson?.name || "Lesson", files);
    const downloads = (lesson?.resources || [])
      .filter(r => r.url && !isPlaylistMedia(r.url, undefined, r.file))
      .map(r => ({ id: slugify(r.file || r.title), title: r.title || r.file, url: r.url }));
    if (downloads.length > 0) instructions.downloads = downloads;
    return instructions;
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
