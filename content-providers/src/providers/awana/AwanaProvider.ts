import { AuthType, ContentDownload, ContentFile, ContentItem, ContentProviderAuthData, ContentProviderConfig, DeviceAuthorizationResponse, DeviceFlowPollResult, Instructions, ProviderCapabilities, ProviderLogos } from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { createFile, createFolder, filesToInstructions } from "../../utils";
import { getProviderSecret } from "../../helpers/ProviderSecrets";
import { toAuthData } from "../../helpers/TokenHelper";
import { BaseProvider } from "../BaseProvider";
import { AwanaFile, AwanaFileSet, AwanaLibrary, AwanaUnit } from "./AwanaInterfaces";

export type AwanaEnvironment = "dev" | "staging" | "prod";

/** Brite site + Keycloak per environment. Dev and staging share sso.awana.org; prod uses login.awana.org. */
const ENVIRONMENTS: Record<AwanaEnvironment, { site: string; sso: string }> = {
  dev: { site: "https://awanabritedev.wpengine.com", sso: "https://sso.awana.org" },
  staging: { site: "https://awanabritestg.wpengine.com", sso: "https://sso.awana.org" },
  prod: { site: "https://britecurriculum.com", sso: "https://login.awana.org" }
};

// ponytail: dev until Awana ships /wp-json/content/v1 and a churchapps client on prod (both missing as of 2026-11-18)
const DEFAULT_ENVIRONMENT: AwanaEnvironment = "dev";
/** Unit-level files sit beside the lessons as their own leaf folder. */
const UNIT_FILES = "unit";
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 50;
const PLAYABLE = new Set(["video", "audio", "image"]);

/**
 * Path: / → courses, /{course} → units, /{course}/{unit} → lessons (leaf) plus a "Unit Files" leaf when the unit has
 * unit-level files, /{course}/{unit}/{lesson|unit} → files.
 * Videos, audio and images are the playlist; documents (zips, docx, pptx, full lesson download) are instruction downloads.
 * Sign-in is Keycloak device flow on a confidential client: the host supplies the secret with
 * setProviderSecret("awana", ...) — never commit the value. Access tokens last 60 seconds; refresh tokens are offline.
 * Awana enforces access on every call (403 for a unit/lesson the user can't open), so nothing is filtered here.
 */
export class AwanaProvider extends BaseProvider {
  readonly id = "awana";
  readonly name = "Awana";

  readonly logos: ProviderLogos = {
    light: "https://www.awana.org/wp-content/uploads/2025/04/awana-logo-black.svg",
    dark: "https://www.awana.org/wp-content/uploads/2025/04/awana-logo-white.svg"
  };

  private environment: AwanaEnvironment = DEFAULT_ENVIRONMENT;
  // Keyed by access token, never by a claim read out of it, so a server host can't serve one user's cache to another.
  private readonly cache = new Map<string, { at: number; value: unknown }>();

  readonly config: ContentProviderConfig = (() => {
    const env = () => ENVIRONMENTS[this.environment];
    return {
      id: "awana",
      name: "Awana",
      get apiBase(): string { return `${env().site}/wp-json/content/v1`; },
      get oauthBase(): string { return `${env().sso}/auth/realms/awana/protocol/openid-connect`; },
      clientId: "churchapps",
      get clientSecret(): string { return getProviderSecret("awana"); },
      scopes: ["openid", "profile", "email"],
      supportsDeviceFlow: true,
      deviceAuthEndpoint: "/auth/device"
    };
  })();

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["device_flow"];
  readonly capabilities: ProviderCapabilities = { browse: true, playlist: true, instructions: true, mediaLicensing: false };

  /** Pick the Brite/Keycloak environment. Clears cached responses, since ids differ between environments. */
  setEnvironment(environment: AwanaEnvironment): void {
    if (!ENVIRONMENTS[environment]) return;
    this.environment = environment;
    this.cache.clear();
  }

  getEnvironment(): AwanaEnvironment {
    return this.environment;
  }

  // Keycloak wants a form body with the client secret; the shared DeviceFlowHelper posts JSON without one.
  async initiateDeviceFlow(): Promise<DeviceAuthorizationResponse | null> {
    try {
      const response = await fetch(`${this.config.oauthBase}${this.config.deviceAuthEndpoint}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: this.formBody({ scope: this.config.scopes.join(" ") }) });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async pollDeviceFlowToken(deviceCode: string): Promise<DeviceFlowPollResult> {
    try {
      const response = await fetch(`${this.config.oauthBase}/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: this.formBody({ grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: deviceCode }) });
      if (response.ok) return toAuthData(await response.json(), { scope: this.config.scopes.join(" ") });
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error === "authorization_pending") return { error: "authorization_pending" };
      if (errorData.error === "slow_down") return { error: "slow_down", shouldSlowDown: true };
      return null;
    } catch {
      return { error: "network_error" };
    }
  }

  private formBody(fields: Record<string, string>): string {
    const params = new URLSearchParams({ client_id: this.config.clientId, ...fields });
    if (this.config.clientSecret) params.set("client_secret", this.config.clientSecret);
    return params.toString();
  }

  private async cachedRequest<T>(path: string, auth: ContentProviderAuthData): Promise<T | null> {
    const key = `${this.environment}|${auth.access_token}|${path}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
    const value = await this.apiRequest<T>(path, auth);
    if (value) {
      if (this.cache.size >= CACHE_MAX) this.cache.delete(this.cache.keys().next().value as string);
      this.cache.set(key, { at: Date.now(), value });
    }
    return value;
  }

  private getLibrary(auth: ContentProviderAuthData): Promise<AwanaLibrary | null> {
    return this.cachedRequest<AwanaLibrary>("/library", auth);
  }

  private async findUnit(courseId: string, unitId: string, auth: ContentProviderAuthData): Promise<AwanaUnit | undefined> {
    const course = (await this.getLibrary(auth))?.courses?.find(c => String(c.id) === courseId);
    return course?.units?.find(u => String(u.id) === unitId);
  }

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    if (!auth?.access_token) return [];
    const { segments, depth } = parsePath(path);
    const library = await this.getLibrary(auth);
    if (!library?.courses) return [];

    if (depth === 0) return library.courses.map(c => createFolder(String(c.id), c.name, `/${c.id}`, c.image));

    const course = library.courses.find(c => String(c.id) === segments[0]);
    if (!course) return [];
    if (depth === 1) return (course.units || []).map(u => createFolder(String(u.id), u.name, `/${course.id}/${u.id}`, u.image || course.image));

    const unit = course.units?.find(u => String(u.id) === segments[1]);
    if (!unit) return [];
    const base = `/${course.id}/${unit.id}`;
    const thumb = unit.image || course.image;
    if (depth === 2) {
      const lessons = (unit.lessons || []).map(l => createFolder(String(l.id), l.name, `${base}/${l.id}`, thumb, true));
      // first, so bulk scheduling from a lesson (which takes the lessons after it) never picks it up
      return unit.has_files ? [createFolder(UNIT_FILES, "Unit Files", `${base}/${UNIT_FILES}`, thumb, true), ...lessons] : lessons;
    }
    if (depth === 3) return (await this.getFiles(segments, auth))?.playlist || [];
    return [];
  }

  /** Loads a lesson's (or the unit's) files, checking the path against the library so a stale path can't reach another unit. */
  private async getFiles(segments: string[], auth: ContentProviderAuthData): Promise<{ set: AwanaFileSet; playlist: ContentFile[]; downloads: ContentDownload[] } | null> {
    const unit = await this.findUnit(segments[0], segments[1], auth);
    if (!unit) return null;
    const isUnit = segments[2] === UNIT_FILES;
    if (isUnit ? !unit.has_files : !unit.lessons?.some(l => String(l.id) === segments[2])) return null;

    const set = await this.cachedRequest<AwanaFileSet>(isUnit ? `/units/${unit.id}` : `/lessons/${segments[2]}`, auth);
    if (!set?.files) return null;
    const thumb = unit.image;
    const playlist = set.files.filter(f => PLAYABLE.has(f.type) && f.url).map(f => toContentFile(f, thumb));
    const downloads = set.files.filter(f => !PLAYABLE.has(f.type) && f.url).map(toDownload);
    return { set, playlist, downloads };
  }

  async getPlaylist(path: string, auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    if (!auth?.access_token) return null;
    const { segments, depth } = parsePath(path);
    if (depth !== 3) return null;
    const files = await this.getFiles(segments, auth);
    return files && files.playlist.length > 0 ? files.playlist : null;
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    if (!auth?.access_token) return null;
    const { segments, depth } = parsePath(path);
    if (depth !== 3) return null;
    const files = await this.getFiles(segments, auth);
    if (!files || (files.playlist.length === 0 && files.downloads.length === 0)) return null;
    const name = segments[2] === UNIT_FILES ? `${files.set.name} - Unit Files` : files.set.name;
    const instructions = filesToInstructions(name, files.playlist);
    if (files.downloads.length > 0) instructions.downloads = files.downloads;
    return instructions;
  }
}

function toContentFile(f: AwanaFile, thumbnail?: string): ContentFile {
  const mediaType = f.type as "video" | "audio" | "image";
  return createFile(String(f.id), f.name, f.url, { mediaType, thumbnail: mediaType === "image" ? f.url : thumbnail });
}

function toDownload(f: AwanaFile): ContentDownload {
  return { id: String(f.id), title: f.name, url: f.url, fileType: f.mime, bytes: f.size || undefined };
}
