import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, ProviderCapabilities, AuthType, Instructions } from "../../interfaces";
import { createFile, createFolder, filesToInstructions } from "../../utils";
import { parsePath } from "../../pathUtils";
import { BaseProvider } from "../BaseProvider";
import type { ArclightMediaListResponse, ArclightLanguageVariant, ArclightMediaComponent, ArclightMediaComponentLinksResponse } from "./JesusFilmInterfaces";

const API_BASE = "https://api.arclight.org/v2";
const API_KEY = "616db012e9a951.51499299";
const LANGUAGE_ID = "529"; // English

const CATEGORY_MAP: Record<string, string> = {
  "feature-films": "featureFilm",
  "series": "series",
  "collections": "collection"
};

const CATEGORY_NAMES: Record<string, string> = {
  "feature-films": "Feature Films",
  "series": "Series",
  "collections": "Collections"
};

/**
 * Path: / → categories, /{category} → items, /{category}/{id} → video or children,
 * /{category}/{...ids}/{id} → nested containers or video.
 */
export class JesusFilmProvider extends BaseProvider {
  readonly id = "jesusfilm";
  readonly name = "Jesus Film Project";

  readonly logos: ProviderLogos = {
    light: "https://www.jesusfilm.org/wp-content/uploads/2022/11/jfp-logo-red.png",
    dark: "https://www.jesusfilm.org/wp-content/uploads/2022/11/jfp-logo-red.png"
  };

  readonly config: ContentProviderConfig = {
    id: "jesusfilm",
    name: "Jesus Film Project",
    apiBase: API_BASE,
    oauthBase: "",
    clientId: "",
    scopes: []
  };

  readonly requiresAuth = false;
  readonly authTypes: AuthType[] = ["none"];
  readonly capabilities: ProviderCapabilities = {
    browse: true,
    playlist: true,
    instructions: true,
    mediaLicensing: false
  };

  // Not ApiHelper: Arclight needs the apiKey query param and callers rely on throw-on-error.
  private async fetchApi<T>(path: string): Promise<T> {
    const separator = path.includes("?") ? "&" : "?";
    const url = `${API_BASE}${path}${separator}apiKey=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Arclight API error: ${response.status}`);
    return response.json() as Promise<T>;
  }

  private async fetchCategoryComponents(subType: string): Promise<ArclightMediaComponent[]> {
    const data = await this.fetchApi<ArclightMediaListResponse>(
      `/media-components?filter=master&subTypes=${subType}&languageIds=${LANGUAGE_ID}&limit=100`
    );
    return data._embedded.mediaComponents;
  }

  async browse(path?: string | null, _auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);

    if (depth === 0) return this.getCategories();
    if (depth === 1) return this.getItemsInCategory(segments[0]);

    const category = segments[0];
    const lastId = segments[depth - 1];

    if (depth === 2 && category === "feature-films") return this.getVideoFile(lastId);

    // For series/collections at depth 2+: try container children, fall back to video
    const pathPrefix = "/" + segments.join("/");
    const children = await this.getContainerChildren(lastId, pathPrefix);
    if (children.length > 0) return children;

    return this.getVideoFile(lastId);
  }

  private getCategories(): ContentItem[] {
    return [
      createFolder("feature-films", "Feature Films", "/feature-films"),
      createFolder("series", "Series", "/series"),
      createFolder("collections", "Collections", "/collections")
    ];
  }

  private async getItemsInCategory(category: string): Promise<ContentItem[]> {
    const subType = CATEGORY_MAP[category];
    if (!subType) return [];

    const components = await this.fetchCategoryComponents(subType);
    return components.map(item => createFolder(
      item.mediaComponentId,
      item.title,
      `/${category}/${item.mediaComponentId}`,
      item.imageUrls.mobileCinematicHigh || item.imageUrls.videoStill || item.imageUrls.thumbnail,
      item.containsCount === 0
    ));
  }

  private async getVideoFile(mediaComponentId: string): Promise<ContentItem[]> {
    const variant = await this.fetchApi<ArclightLanguageVariant>(
      `/media-components/${mediaComponentId}/languages/${LANGUAGE_ID}?platform=web`
    );

    const downloadUrl = variant.downloadUrls.high?.url || variant.downloadUrls.low?.url;
    if (!downloadUrl) return [];

    const components = await this.fetchApi<ArclightMediaListResponse>(
      `/media-components?ids=${mediaComponentId}&languageIds=${LANGUAGE_ID}`
    );
    const component = components._embedded?.mediaComponents?.[0];
    const title = component?.title || mediaComponentId;
    const seconds = component ? Math.round(component.lengthInMilliseconds / 1000) : 0;
    const thumbnail = component?.imageUrls.mobileCinematicHigh || component?.imageUrls.videoStill;

    return [
      createFile(mediaComponentId, title, downloadUrl, {
        mediaType: "video",
        muxPlaybackId: this.extractMuxPlaybackId(downloadUrl),
        seconds,
        thumbnail
      })
    ];
  }

  private async getContainerChildren(containerId: string, pathPrefix: string): Promise<ContentItem[]> {
    const linksData = await this.fetchApi<ArclightMediaComponentLinksResponse>(
      `/media-component-links/${containerId}`
    );

    const childIds = linksData.linkedMediaComponentIds?.contains;
    if (!childIds || childIds.length === 0) return [];

    const childrenData = await this.fetchApi<ArclightMediaListResponse>(
      `/media-components?ids=${childIds.join(",")}&languageIds=${LANGUAGE_ID}`
    );

    if (!childrenData._embedded?.mediaComponents) return [];

    return childrenData._embedded.mediaComponents.map(item => createFolder(
      item.mediaComponentId,
      item.title,
      `${pathPrefix}/${item.mediaComponentId}`,
      item.imageUrls.mobileCinematicHigh || item.imageUrls.videoStill || item.imageUrls.thumbnail,
      item.containsCount === 0
    ));
  }

  private extractMuxPlaybackId(url: string): string | undefined {
    const match = url.match(/stream\.mux\.com\/([^/]+)/);
    return match ? match[1] : undefined;
  }

  private async fetchVideoFiles(components: ArclightMediaComponent[]): Promise<ContentFile[]> {
    const files: ContentFile[] = [];

    for (const component of components) {
      try {
        const variant = await this.fetchApi<ArclightLanguageVariant>(
          `/media-components/${component.mediaComponentId}/languages/${LANGUAGE_ID}?platform=web`
        );
        const url = variant.downloadUrls.high?.url || variant.downloadUrls.low?.url;
        if (!url) continue;

        files.push({
          type: "file",
          id: component.mediaComponentId,
          title: component.title,
          mediaType: "video",
          url,
          thumbnail: component.imageUrls.mobileCinematicHigh || component.imageUrls.videoStill,
          muxPlaybackId: this.extractMuxPlaybackId(url),
          seconds: Math.round(component.lengthInMilliseconds / 1000)
        });
      } catch {
        // Skip items that fail to resolve
      }
    }

    return files;
  }

  private async fetchContainerVideoFiles(containerId: string): Promise<ContentFile[]> {
    const linksData = await this.fetchApi<ArclightMediaComponentLinksResponse>(
      `/media-component-links/${containerId}`
    );
    const childIds = linksData.linkedMediaComponentIds?.contains;
    if (!childIds || childIds.length === 0) return [];

    const childrenData = await this.fetchApi<ArclightMediaListResponse>(
      `/media-components?ids=${childIds.join(",")}&languageIds=${LANGUAGE_ID}`
    );
    if (!childrenData._embedded?.mediaComponents) return [];

    const contentItems = childrenData._embedded.mediaComponents.filter(c => c.containsCount === 0);
    const containerItems = childrenData._embedded.mediaComponents.filter(c => c.containsCount > 0);

    const files = await this.fetchVideoFiles(contentItems);
    for (const container of containerItems) {
      const nested = await this.fetchContainerVideoFiles(container.mediaComponentId);
      files.push(...nested);
    }
    return files;
  }

  async getPlaylist(path: string, _auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const { segments, depth } = parsePath(path);
    if (depth < 1) return null;

    const category = segments[0];

    if (depth >= 3) {
      const lastId = segments[depth - 1];
      // Try as video first, then as container
      const items = await this.getVideoFile(lastId);
      const files = items.filter((item): item is ContentFile => item.type === "file");
      if (files.length > 0) return files;
      const containerFiles = await this.fetchContainerVideoFiles(lastId);
      return containerFiles.length > 0 ? containerFiles : null;
    }

    if (depth === 2) {
      if (category === "feature-films") {
        const items = await this.getVideoFile(segments[1]);
        if (items.length === 0) return null;
        return items.filter((item): item is ContentFile => item.type === "file");
      }

      // Series/Collection container: return all children as playlist
      const files = await this.fetchContainerVideoFiles(segments[1]);
      return files.length > 0 ? files : null;
    }

    // Depth 1: return all items in category as playlist
    const subType = CATEGORY_MAP[category];
    if (!subType) return null;

    const components = await this.fetchCategoryComponents(subType);
    const files = await this.fetchVideoFiles(components.filter(item => item.containsCount === 0));
    return files.length > 0 ? files : null;
  }

  private async buildVideoInstructions(mediaComponentId: string, category: string): Promise<Instructions | null> {
    const items = await this.getVideoFile(mediaComponentId);
    const file = items.find((item): item is ContentFile => item.type === "file");
    if (!file) return null;

    return filesToInstructions(file.title, [file], { id: category + "-section", label: file.title });
  }

  private async buildContainerInstructions(containerId: string): Promise<Instructions> {
    const containerData = await this.fetchApi<ArclightMediaListResponse>(
      `/media-components?ids=${containerId}&languageIds=${LANGUAGE_ID}`
    );
    const containerName = containerData._embedded?.mediaComponents?.[0]?.title || containerId;

    const videoFiles = await this.fetchContainerVideoFiles(containerId);
    if (videoFiles.length === 0) return { name: containerName, items: [] };

    return filesToInstructions(containerName, videoFiles, { id: containerId + "-section", label: containerName });
  }

  async getInstructions(path: string, _auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const { segments, depth } = parsePath(path);
    if (depth < 1) return null;

    const category = segments[0];
    const subType = CATEGORY_MAP[category];
    if (!subType) return null;

    if (depth === 1) {
      const categoryName = CATEGORY_NAMES[category];
      const components = await this.fetchCategoryComponents(subType);
      const files = await this.fetchVideoFiles(components.filter(c => c.containsCount === 0));
      return filesToInstructions(categoryName, files, { id: category + "-section", label: categoryName });
    }

    if (depth === 2) {
      if (category === "feature-films") return this.buildVideoInstructions(segments[1], category);
      return this.buildContainerInstructions(segments[1]);
    }

    const lastId = segments[depth - 1];
    const videoResult = await this.buildVideoInstructions(lastId, category);
    if (videoResult) return videoResult;
    return this.buildContainerInstructions(lastId);
  }
}
