import { AuthType, ContentFile, ContentItem, ContentProviderAuthData, ContentProviderConfig, InstructionItem, Instructions, ProviderCapabilities, ProviderLogos } from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { createFolder, createFile, detectMediaType, filesToInstructions, isPlaylistMedia, slugify } from "../../utils";
import { OAuthHelper } from "../../helpers";
import { getProviderSecret } from "../../helpers/ProviderSecrets";
import { BaseProvider } from "../BaseProvider";
import { GoCurriculumData, GoCurriculumCollection, GoCurriculumGuide, GoCurriculumGuideItem, GoCurriculumLesson, GoCurriculumPlaylistItem } from "./GoCurriculumInterfaces";
import { GO_LOGO } from "./logo";

/**
 * Path: / → age groups, /{group} → collections, /{group}/{collection} → lessons (leaf), /{group}/{collection}/{lesson} → files.
 * A lesson's instructions are its Large Group guide (script). Small Group guides (no media) live in a sibling folder,
 * /{group}/{collection}/small-group/{lesson}, so Large Group paths and series order stay untouched.
 * Each group is a Go export fetched at runtime. Feed URLs are private: a server host supplies them with
 * setProviderSecret("gocurriculumFeeds", '{"elementary":"https://...","preschool":"https://..."}'); a device host calls
 * setCatalogLoader to fetch through its server instead. A gocurriculum.com login (WP OAuth Server plugin) gates all of it, and
 * each age group only opens for members whose memberships include it (see MEMBERSHIP_IDS).
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

// Memberships come from /oauth/me as memberpress.active_memberships: [{ id: 5399, title: "ELEMENTARY [PREMIUM]" }].
// Known MemberPress product ids map to the catalogs and feed tier tag Go assigned them; anything else falls back to parsing
// a "GROUP [TIER]" title. Tiers are compared with case and punctuation stripped, so "videoPlus" matches "videoplus".
// An empty group (title fallback only) means the membership counts for every age group.
interface GoMembership { group: string; tier: string; }
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const MEMBERSHIP_IDS: Record<number, GoMembership[]> = {
  486: [{ group: "preschool", tier: "basic" }],
  5398: [{ group: "preschool", tier: "premium" }],
  485: [{ group: "elementary", tier: "basic" }],
  5399: [{ group: "elementary", tier: "premium" }],
  7467: [{ group: "preschool", tier: "videoplus" }], // Topher Time Plus
  7468: [{ group: "elementary", tier: "videoplus" }], // JTS Plus
  7466: [{ group: "preschool", tier: "platinum" }, { group: "elementary", tier: "platinum" }],
  5401: [{ group: "preschool", tier: "basic" }, { group: "elementary", tier: "basic" }],
  5402: [{ group: "preschool", tier: "premium" }, { group: "elementary", tier: "premium" }]
};

export function parseMemberships(me: unknown): GoMembership[] {
  const body = me as { active_memberships?: unknown, memberpress?: { active_memberships?: unknown } } | null;
  const raw = body?.memberpress?.active_memberships ?? body?.active_memberships;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const result: GoMembership[] = [];
  for (const entry of list) {
    const known = MEMBERSHIP_IDS[Number((entry as { id?: unknown })?.id)];
    if (known) { result.push(...known); continue; }
    const title = typeof entry === "string" ? entry : (entry as { title?: string, name?: string })?.title || (entry as { name?: string })?.name;
    const match = typeof title === "string" ? /^(.*?)\s*\[([^\]]+)\]\s*$/.exec(title) : null;
    if (match) result.push({ group: normalize(match[1]), tier: normalize(match[2]) });
  }
  return result;
}

// a membership with no group (title fallback only) counts for every age group
function hasGroup(groupId: string, memberships: GoMembership[]): boolean {
  return memberships.some(m => !m.group || m.group === normalize(groupId));
}

// within an age group the member can open, untagged items are open; tagged ones need a membership in that tier for this group
function canSee(item: GoCurriculumPlaylistItem, groupId: string, memberships: GoMembership[]): boolean {
  if (!item.tiers?.length) return true;
  const tiers = item.tiers.map(normalize);
  return memberships.some(m => (!m.group || m.group === normalize(groupId)) && tiers.includes(m.tier));
}

function filterGuide(guide: GoCurriculumGuide | undefined, hidden: Set<string>): GoCurriculumGuide | undefined {
  if (!guide || hidden.size === 0) return guide;
  return { ...guide, sections: guide.sections.map(s => ({ ...s, items: s.items.map(i => i.files ? { ...i, files: i.files.filter(f => !hidden.has(f.url)) } : i) })) };
}

// drops tier-restricted playlist items the user can't see, plus the guide steps' links to them
function filterCollection(collection: GoCurriculumCollection, groupId: string, memberships: GoMembership[]): GoCurriculumCollection {
  return {
    ...collection,
    lessons: collection.lessons.map(lesson => {
      const hidden = new Set(lesson.playlist.filter(p => !canSee(p, groupId, memberships)).map(p => p.url));
      if (hidden.size === 0) return lesson;
      return { ...lesson, playlist: lesson.playlist.filter(p => !hidden.has(p.url)), script: filterGuide(lesson.script, hidden), smallGroup: filterGuide(lesson.smallGroup, hidden) };
    })
  };
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
  // token → its active memberships, from /oauth/me
  private readonly verifiedTokens = new Map<string, GoMembership[]>();

  readonly id = "gocurriculum";
  readonly name = "Go Curriculum";

  readonly logos: ProviderLogos = { light: GO_LOGO, dark: GO_LOGO };

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
    if (!hasGroup(segments[0], this.membershipsFor(auth))) return undefined;
    const collection = (await this.getData(segments[0], auth))?.catalog.find(c => c.id === segments[1]);
    return collection && filterCollection(collection, segments[0], this.membershipsFor(auth));
  }

  private membershipsFor(auth: ContentProviderAuthData): GoMembership[] {
    return this.verifiedTokens.get(auth.access_token) || [];
  }

  // what a server host returns to a device host's setCatalogLoader — already filtered to the user's tiers
  async getCatalog(groupId: string, auth?: ContentProviderAuthData | null): Promise<GoCurriculumData | null> {
    if (!auth || !(await this.verifyAuth(auth))) return null;
    const data = await this.getData(groupId, auth);
    if (!data) return null;
    const memberships = this.membershipsFor(auth);
    // an empty catalog rather than null, so a device's loader treats the group as loaded instead of retrying it
    if (!hasGroup(groupId, memberships)) return { ...data, catalog: [] };
    return { ...data, catalog: data.catalog.map(c => filterCollection(c, groupId, memberships)) };
  }

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["oauth_pkce"];
  readonly capabilities: ProviderCapabilities = { browse: true, playlist: true, instructions: true, mediaLicensing: false };

  // a valid login plus a membership for the age group opens it; playlist items with `tiers` also need a matching tier
  private async verifyAuth(auth?: ContentProviderAuthData | null): Promise<boolean> {
    const token = auth?.access_token;
    if (!token) return false;
    if (this.verifiedTokens.has(token)) return true;
    try {
      // POST body instead of Authorization header — WP hosts commonly strip the header
      const response = await fetch(`${this.config.oauthBase}/me`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ access_token: token }).toString() });
      if (!response.ok) return false;
      let me: unknown = null;
      try { me = await response.json(); } catch { /* no body: untagged content only */ }
      this.verifiedTokens.set(token, parseMemberships(me));
      return true;
    } catch {
      return false;
    }
  }

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    if (!auth || !(await this.verifyAuth(auth))) return [];
    const { segments, depth } = parsePath(path);

    // only the age groups this member has a membership for
    if (depth === 0) return GROUPS.filter(g => hasGroup(g.id, this.membershipsFor(auth))).map(g => createFolder(g.id, g.name, `/${g.id}`));
    if (!hasGroup(segments[0], this.membershipsFor(auth))) return [];
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
