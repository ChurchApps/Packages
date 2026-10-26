import { AuthType, ContentFile, ContentItem, ContentProviderAuthData, ContentProviderConfig, InstructionItem, Instructions, ProviderCapabilities, ProviderLogos } from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { createFolder, createFile, detectMediaType, filesToInstructions, isPlaylistMedia, slugify } from "../../utils";
import { OAuthHelper } from "../../helpers";
import { getProviderSecret } from "../../helpers/ProviderSecrets";
import { BaseProvider } from "../BaseProvider";
import { GoCurriculumData, GoCurriculumCollection, GoCurriculumGuide, GoCurriculumGuideItem, GoCurriculumLesson } from "./GoCurriculumInterfaces";

/**
 * Path: / → age groups, /{group} → collections, /{group}/{collection} → lessons (leaf), /{group}/{collection}/{lesson} → files.
 * A lesson's instructions are its Large Group guide (script). Small Group guides (no media) live in a sibling folder,
 * /{group}/{collection}/small-group/{lesson}, so Large Group paths and series order stay untouched.
 * Each group is a Go export fetched at runtime. Feed URLs are private: a server host supplies them with
 * setProviderSecret("gocurriculumFeeds", '{"elementary":"https://...","preschool":"https://..."}'); a device host calls
 * setCatalogLoader to fetch through its server instead. A valid gocurriculum.com login (WP OAuth Server plugin) gates all of it.
 */
const GROUPS = [
  { id: "elementary", name: "Elementary" },
  { id: "preschool", name: "Preschool" }
];
const CATALOG_TTL_MS = 60 * 60 * 1000;
const SMALL_GROUP = "small-group";

function guideAction(item: GoCurriculumGuideItem, id: string, lesson: GoCurriculumLesson): InstructionItem {
  const plain = (item.content || "").replace(/\*+/g, "").trim();
  const label = plain.length > 100 ? plain.slice(0, 100).trimEnd() + "…" : plain;
  const files: InstructionItem[] = (item.files || []).map(f => ({
    id: slugify(f.file),
    itemType: "file",
    label: lesson.playlist.find(p => p.url === f.url)?.title || f.file,
    seconds: f.seconds,
    downloadUrl: f.url,
    mediaType: detectMediaType(`${f.url} ${f.file}`, f.mediaType),
    thumbnail: f.thumbnail || lesson.thumbnail
  }));
  return { id, itemType: "action", actionType: item.type, label, content: item.content !== label ? item.content : undefined, seconds: files[0]?.seconds, children: files.length ? files : undefined };
}

function guideToInstructions(name: string, guide: GoCurriculumGuide, prefix: string, lesson: GoCurriculumLesson): Instructions {
  // ponytail: index-based ids — Go's export has no stable ids, so a re-export that reorders items re-ids them
  const items: InstructionItem[] = guide.sections.map((s, i) => ({
    id: `${prefix}-${i}`,
    itemType: "section",
    label: s.name,
    children: s.items.map((a, j) => guideAction(a, `${prefix}-${i}-${j}`, lesson))
  }));
  return { name, items };
}

export type GoCurriculumCatalogLoader = (groupId: string, auth: ContentProviderAuthData) => Promise<GoCurriculumData | null>;

async function loadFromFeed(groupId: string): Promise<GoCurriculumData | null> {
  let url: string | undefined;
  try { url = JSON.parse(getProviderSecret("gocurriculumFeeds") || "{}")[groupId]; } catch { return null; }
  if (!url) return null;
  const response = await fetch(url);
  return response.ok ? await response.json() as GoCurriculumData : null;
}

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

  private data: Record<string, GoCurriculumData> = {};
  private dataFetchedAt = 0;
  private loadCatalog: GoCurriculumCatalogLoader = loadFromFeed;

  setCatalogLoader(loader: GoCurriculumCatalogLoader): void {
    this.loadCatalog = loader;
    this.dataFetchedAt = 0;
  }

  private async getData(groupId: string, auth: ContentProviderAuthData): Promise<GoCurriculumData | undefined> {
    if (Date.now() - this.dataFetchedAt >= CATALOG_TTL_MS) {
      await Promise.all(GROUPS.map(async g => {
        try {
          const data = await this.loadCatalog(g.id, auth);
          if (data) this.data[g.id] = data;
        } catch { /* keep last good catalog */ }
      }));
      // no bundled fallback, so retry on the next call until every feed has loaded
      if (GROUPS.every(g => this.data[g.id])) this.dataFetchedAt = Date.now();
    }
    return this.data[groupId];
  }

  private async getCollection(segments: string[], auth: ContentProviderAuthData): Promise<GoCurriculumCollection | undefined> {
    return (await this.getData(segments[0], auth))?.catalog.find(c => c.id === segments[1]);
  }

  // what a server host returns to a device host's setCatalogLoader
  async getCatalog(groupId: string, auth?: ContentProviderAuthData | null): Promise<GoCurriculumData | null> {
    if (!auth || !(await this.verifyAuth(auth))) return null;
    return (await this.getData(groupId, auth)) || null;
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
    if (!auth || !(await this.verifyAuth(auth))) return [];
    const { segments, depth } = parsePath(path);

    if (depth === 0) return GROUPS.map(g => createFolder(g.id, g.name, `/${g.id}`));
    if (depth === 1) return ((await this.getData(segments[0], auth))?.catalog || []).map(c => createFolder(c.id, c.name, `/${segments[0]}/${c.id}`, c.thumbnail));

    const collection = await this.getCollection(segments, auth);
    if (!collection) return [];

    const base = `/${segments[0]}/${collection.id}`;
    if (depth === 2) {
      const lessons = collection.lessons.map(l => createFolder(l.id, l.name, `${base}/${l.id}`, l.thumbnail || collection.thumbnail, true));
      // first, so bulk scheduling from a lesson (which takes the lessons after it) never picks it up
      return collection.lessons.some(l => l.smallGroup) ? [createFolder(SMALL_GROUP, "Small Group Guides", `${base}/${SMALL_GROUP}`, collection.thumbnail), ...lessons] : lessons;
    }
    if (depth === 3 && segments[2] === SMALL_GROUP) return collection.lessons.filter(l => l.smallGroup).map(l => createFolder(l.id, l.name, `${base}/${SMALL_GROUP}/${l.id}`, l.thumbnail || collection.thumbnail, true));
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
    if (!auth || !(await this.verifyAuth(auth))) return null;
    const { segments, depth } = parsePath(path);
    if (depth !== 3) return null;

    const collection = await this.getCollection(segments, auth);
    if (!collection) return null;

    const files = this.getLessonFiles(collection, segments[2]);
    return files.length > 0 ? files : null;
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    if (!auth || !(await this.verifyAuth(auth))) return null;
    const { segments, depth } = parsePath(path);
    const smallGroup = depth === 4 && segments[2] === SMALL_GROUP;
    if (depth !== 3 && !smallGroup) return null;

    const collection = await this.getCollection(segments, auth);
    const lesson = collection?.lessons.find(l => l.id === segments[depth - 1]);
    if (!collection || !lesson) return null;

    let instructions: Instructions;
    if (smallGroup) {
      if (!lesson.smallGroup?.sections?.length) return null;
      instructions = guideToInstructions(`${lesson.name} - Small Group`, lesson.smallGroup, "sg", lesson);
    } else if (lesson.script?.sections?.length) {
      instructions = guideToInstructions(lesson.name, lesson.script, "lg", lesson);
    } else {
      const files = this.getLessonFiles(collection, lesson.id);
      if (files.length === 0) return null;
      instructions = filesToInstructions(lesson.name, files);
    }

    const downloads = (lesson.resources || [])
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
