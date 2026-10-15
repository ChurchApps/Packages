import {
  AuthType,
  ContentFile,
  ContentItem,
  ContentProviderAuthData,
  ContentProviderConfig,
  Instructions,
  NetworkInstance,
  ProviderCapabilities,
  ProviderLogos
} from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { BaseProvider } from "../BaseProvider";
import { createFile, createFolder, detectMediaType, filesToInstructions } from "../../utils";
import { freeShowMediaUrl, freeShowRequest } from "./FreeShowApi";
import { authToNetworkInstance, networkInstanceToAuth, showToFiles } from "./FreeShowConverters";
import { DEFAULT_SLIDE_SECONDS, FreeShowDiscoverer, FreeShowProject, FreeShowShow } from "./FreeShowInterfaces";

const byName = (a: [string, { name?: string }], b: [string, { name?: string }]) => (a[1].name || "").localeCompare(b[1].name || "");

export class FreeShowProvider extends BaseProvider {
  readonly id = "freeshow";
  readonly name = "FreeShow";

  readonly logos: ProviderLogos = {
    light: "https://freeshow.app/images/favicon.png",
    dark: "https://freeshow.app/images/favicon.png"
  };

  readonly config: ContentProviderConfig = {
    id: "freeshow",
    name: "FreeShow",
    apiBase: "",
    oauthBase: "",
    clientId: "",
    scopes: []
  };

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["network_discovery"];
  readonly capabilities: ProviderCapabilities = {
    browse: true,
    playlist: true,
    instructions: true,
    mediaLicensing: false
  };

  private discoverer: FreeShowDiscoverer | null = null;

  /** mDNS needs native code, so the host app browses `_freeshow._udp` and maps results with freeShowServicesToInstances. */
  setDiscoverer(discoverer: FreeShowDiscoverer | null): void {
    this.discoverer = discoverer;
  }

  async discoverInstances(): Promise<NetworkInstance[]> {
    return this.discoverer ? this.discoverer() : [];
  }

  toAuth(instance: NetworkInstance): ContentProviderAuthData {
    return networkInstanceToAuth(instance);
  }

  selectedInstance(auth?: ContentProviderAuthData | null): NetworkInstance | null {
    return authToNetworkInstance(auth);
  }

  private requireInstance(auth?: ContentProviderAuthData | null): NetworkInstance {
    const instance = authToNetworkInstance(auth);
    if (!instance) throw new Error("No FreeShow machine selected");
    return instance;
  }

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);
    if (depth === 0) return [createFolder("projects", "Projects", "/projects"), createFolder("shows", "Shows", "/shows")];
    if (depth !== 1) return [];

    const instance = this.requireInstance(auth);
    if (segments[0] === "projects") {
      const projects = await freeShowRequest<Record<string, FreeShowProject>>(instance, "get_projects") || {};
      return Object.entries(projects)
        .filter(([, project]) => !project.deleted && !project.archived)
        .sort(byName)
        .map(([id, project]) => createFolder(id, project.name || "Project", `/projects/${id}`, undefined, true));
    }
    if (segments[0] === "shows") {
      const shows = await freeShowRequest<Record<string, FreeShowShow>>(instance, "get_shows") || {};
      return Object.entries(shows)
        .sort(byName)
        .map(([id, show]) => createFolder(id, show.name || "Show", `/shows/${id}`, undefined, true));
    }
    return [];
  }

  private async showFiles(instance: NetworkInstance, id: string): Promise<{ name: string; files: ContentFile[] }> {
    const show = await freeShowRequest<FreeShowShow>(instance, "get_show", { id });
    if (!show) return { name: "Show", files: [] };
    return { name: show.name || "Show", files: showToFiles(show, (mediaPath, type) => freeShowMediaUrl(instance, mediaPath, type)) };
  }

  private async load(path: string, auth?: ContentProviderAuthData | null): Promise<{ name: string; files: ContentFile[] } | null> {
    const { segments, depth } = parsePath(path);
    if (depth !== 2) return null;
    const instance = this.requireInstance(auth);
    const [kind, id] = segments;

    if (kind === "shows") return this.showFiles(instance, id);
    if (kind !== "projects") return null;

    const project = await freeShowRequest<FreeShowProject>(instance, "get_project", { id });
    if (!project) return null;
    const files: ContentFile[] = [];
    for (const [index, item] of (project.shows || []).entries()) {
      if (!item.type || item.type === "show") {
        const { files: showFiles } = await this.showFiles(instance, item.id);
        files.push(...showFiles.map(file => ({ ...file, id: `${index}-${file.id}` })));
      } else if (item.type === "image" || item.type === "video") {
        const url = freeShowMediaUrl(instance, item.id, item.type);
        if (!url) continue;
        const mediaType = detectMediaType(item.id, item.type);
        files.push(createFile(`${index}-media`, item.name || "Media", url, {
          mediaType,
          seconds: mediaType === "image" ? DEFAULT_SLIDE_SECONDS : undefined
        }));
      }
    }
    return { name: project.name || "Project", files };
  }

  async getPlaylist(path: string, auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const result = await this.load(path, auth);
    return result?.files.length ? result.files : null;
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const result = await this.load(path, auth);
    return result?.files.length ? filesToInstructions(result.name, result.files) : null;
  }
}
