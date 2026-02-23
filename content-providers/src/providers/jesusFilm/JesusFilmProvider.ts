import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, ProviderCapabilities, IProvider, AuthType, Instructions, InstructionItem } from "../../interfaces";
import { createFile, createFolder } from "../../utils";
import { parsePath } from "../../pathUtils";
import type { ArclightMediaListResponse, ArclightLanguageVariant, ArclightMediaComponent, ArclightMediaComponentLinksResponse } from "./JesusFilmInterfaces";

const API_BASE = "https://api.arclight.org/v2";
const API_KEY = "616db012e9a951.51499299";
const LANGUAGE_ID = "529"; // English

const CATEGORY_MAP: Record<string, string> = {
  "feature-films": "featureFilm",
  "series": "series",
  "collections": "collection"
};

/**
 * Jesus Film Project Provider
 *
 * Uses the public Arclight API to browse video content from jesusfilm.org.
 *
 * Path structure:
 *   /                                    -> categories (Feature Films, Series, Collections)
 *   /{category}                          -> list items in category
 *   /{category}/{id}                     -> single video (feature film) or container children (series/collection)
 *   /{category}/{containerId}/{videoId}  -> single video within a container
 */
export class JesusFilmProvider implements IProvider {
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
    scopes: [],
    endpoints: { watch: "/watch" }
  };

  readonly requiresAuth = false;
  readonly authTypes: AuthType[] = ["none"];
  readonly capabilities: ProviderCapabilities = {
    browse: true,
    presentations: true,
    playlist: true,
    instructions: true,
    mediaLicensing: false
  };

  private async fetchApi<T>(path: string): Promise<T> {
    const separator = path.includes("?") ? "&" : "?";
    const url = `${API_BASE}${path}${separator}apiKey=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Arclight API error: ${response.status}`);
    return response.json() as Promise<T>;
  }

  async browse(path?: string | null, _auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);

    if (depth === 0) return this.getCategories();
    if (depth === 1) return this.getItemsInCategory(segments[0]);

    if (depth === 2) {
      const category = segments[0];
      if (category === "feature-films") return this.getVideoFile(segments[1]);
      return this.getContainerChildren(segments[1], category);
    }

    if (depth === 3) return this.getVideoFile(segments[2]);

    return [];
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

    const data = await this.fetchApi<ArclightMediaListResponse>(
      `/media-components?filter=master&subTypes=${subType}&languageIds=${LANGUAGE_ID}&limit=100`
    );

    return data._embedded.mediaComponents.map(item => {
      const isLeaf = item.componentType === "content";
      return createFolder(
        item.mediaComponentId,
        item.title,
        `/${category}/${item.mediaComponentId}`,
        item.imageUrls.mobileCinematicHigh || item.imageUrls.videoStill || item.imageUrls.thumbnail,
        isLeaf
      );
    });
  }

  private async getVideoFile(mediaComponentId: string): Promise<ContentItem[]> {
    const variant = await this.fetchApi<ArclightLanguageVariant>(
      `/media-components/${mediaComponentId}/languages/${LANGUAGE_ID}?platform=web`
    );

    const downloadUrl = variant.downloadUrls.high?.url || variant.downloadUrls.low?.url;
    if (!downloadUrl) return [];

    // Also fetch the media component metadata for title and duration
    const components = await this.fetchApi<ArclightMediaListResponse>(
      `/media-components?ids=${mediaComponentId}&languageIds=${LANGUAGE_ID}`
    );
    const component = components._embedded?.mediaComponents?.[0];
    const title = component?.title || mediaComponentId;
    const seconds = component ? Math.round(component.lengthInMilliseconds / 1000) : 0;
    const thumbnail = component?.imageUrls.mobileCinematicHigh || component?.imageUrls.videoStill;

    const muxPlaybackId = this.extractMuxPlaybackId(downloadUrl);

    return [
      createFile(mediaComponentId, title, downloadUrl, {
        mediaType: "video",
        muxPlaybackId,
        seconds,
        thumbnail
      })
    ];
  }

  private async getContainerChildren(containerId: string, category: string): Promise<ContentItem[]> {
    const linksData = await this.fetchApi<ArclightMediaComponentLinksResponse>(
      `/media-component-links/${containerId}`
    );

    const childIds = linksData.linkedMediaComponentIds?.contains;
    if (!childIds || childIds.length === 0) return [];

    const idsParam = childIds.join(",");
    const childrenData = await this.fetchApi<ArclightMediaListResponse>(
      `/media-components?ids=${idsParam}&languageIds=${LANGUAGE_ID}`
    );

    if (!childrenData._embedded?.mediaComponents) return [];

    return childrenData._embedded.mediaComponents.map(item => createFolder(
      item.mediaComponentId,
      item.title,
      `/${category}/${containerId}/${item.mediaComponentId}`,
      item.imageUrls.mobileCinematicHigh || item.imageUrls.videoStill || item.imageUrls.thumbnail,
      true
    ));
  }

  private extractMuxPlaybackId(url: string): string | undefined {
    const match = url.match(/stream\.mux\.com\/([^/]+)/);
    return match ? match[1] : undefined;
  }

  async getPlaylist(path: string, _auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const { segments, depth } = parsePath(path);
    if (depth < 1) return null;

    const category = segments[0];

    if (depth === 3) {
      const items = await this.getVideoFile(segments[2]);
      if (items.length === 0) return null;
      return items.filter((item): item is ContentFile => item.type === "file");
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

    const data = await this.fetchApi<ArclightMediaListResponse>(
      `/media-components?filter=master&subTypes=${subType}&languageIds=${LANGUAGE_ID}&limit=100`
    );

    const contentComponents = data._embedded.mediaComponents.filter(item => item.componentType === "content");
    const files = await this.fetchVideoFiles(contentComponents);
    return files.length > 0 ? files : null;
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

    const idsParam = childIds.join(",");
    const childrenData = await this.fetchApi<ArclightMediaListResponse>(
      `/media-components?ids=${idsParam}&languageIds=${LANGUAGE_ID}`
    );
    if (!childrenData._embedded?.mediaComponents) return [];

    return this.fetchVideoFiles(childrenData._embedded.mediaComponents);
  }

  private async buildVideoInstructions(mediaComponentId: string, category: string): Promise<Instructions | null> {
    const items = await this.getVideoFile(mediaComponentId);
    if (items.length === 0) return null;

    const file = items[0];
    if (file.type !== "file") return null;

    const actionItem: InstructionItem = {
      id: mediaComponentId + "-action",
      itemType: "action",
      label: file.title,
      actionType: "play",
      children: [
        {
          id: mediaComponentId,
          itemType: "file",
          label: file.title,
          downloadUrl: file.url,
          thumbnail: file.thumbnail
        }
      ]
    };

    const sectionItem: InstructionItem = {
      id: category + "-section",
      itemType: "section",
      label: file.title,
      children: [actionItem]
    };

    return { name: file.title, items: [sectionItem] };
  }

  private async buildContainerInstructions(containerId: string, category: string): Promise<Instructions | null> {
    const containerData = await this.fetchApi<ArclightMediaListResponse>(
      `/media-components?ids=${containerId}&languageIds=${LANGUAGE_ID}`
    );
    const container = containerData._embedded?.mediaComponents?.[0];
    const containerName = container?.title || containerId;

    const videoFiles = await this.fetchContainerVideoFiles(containerId);
    if (videoFiles.length === 0) return { name: containerName, items: [] };

    const actionItems: InstructionItem[] = videoFiles.map(file => ({
      id: file.id + "-action",
      itemType: "action",
      label: file.title,
      actionType: "play",
      children: [
        {
          id: file.id,
          itemType: "file",
          label: file.title,
          downloadUrl: file.url,
          thumbnail: file.thumbnail
        }
      ]
    }));

    const sectionItem: InstructionItem = {
      id: containerId + "-section",
      itemType: "section",
      label: containerName,
      children: actionItems
    };

    return { name: containerName, items: [sectionItem] };
  }

  async getInstructions(path: string, _auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const { segments, depth } = parsePath(path);
    if (depth < 1) return null;

    const category = segments[0];
    const subType = CATEGORY_MAP[category];
    if (!subType) return null;

    if (depth === 1) {
      const data = await this.fetchApi<ArclightMediaListResponse>(
        `/media-components?filter=master&subTypes=${subType}&languageIds=${LANGUAGE_ID}&limit=100`
      );

      const categoryName = category === "feature-films" ? "Feature Films" : category === "series" ? "Series" : "Collections";

      const actionItems: InstructionItem[] = await Promise.all(
        data._embedded.mediaComponents.map(async (component) => {
          let downloadUrl: string | undefined;
          if (component.componentType === "content") {
            try {
              const variant = await this.fetchApi<ArclightLanguageVariant>(
                `/media-components/${component.mediaComponentId}/languages/${LANGUAGE_ID}?platform=web`
              );
              downloadUrl = variant.downloadUrls.high?.url || variant.downloadUrls.low?.url;
            } catch {
              // Skip
            }
          }

          return {
            id: component.mediaComponentId + "-action",
            itemType: "action",
            label: component.title,
            actionType: "play",
            children: downloadUrl ? [
              {
                id: component.mediaComponentId,
                itemType: "file",
                label: component.title,
                downloadUrl,
                thumbnail: component.imageUrls.mobileCinematicHigh || component.imageUrls.videoStill
              }
            ] : []
          } satisfies InstructionItem;
        })
      );

      const sectionItem: InstructionItem = {
        id: category + "-section",
        itemType: "section",
        label: categoryName,
        children: actionItems.filter(a => a.children && a.children.length > 0)
      };

      return { name: categoryName, items: [sectionItem] };
    }

    if (depth === 2) {
      if (category === "feature-films") return this.buildVideoInstructions(segments[1], category);
      return this.buildContainerInstructions(segments[1], category);
    }

    if (depth === 3) return this.buildVideoInstructions(segments[2], category);

    return null;
  }

  supportsDeviceFlow(): boolean {
    return false;
  }
}
