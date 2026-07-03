import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, ProviderCapabilities, AuthType, Instructions } from "../../interfaces";
import { createFile, slugify, filesToInstructions } from "../../utils";
import { parsePath } from "../../pathUtils";
import { BaseProvider } from "../BaseProvider";
import bibleProjectData from "./data.json";
import { BibleProjectData, BibleProjectCollection, BibleProjectVideo } from "./BibleProjectInterfaces";

/** BibleProject Provider: Bible education video content. */
export class BibleProjectProvider extends BaseProvider {
  readonly id = "bibleproject";
  readonly name = "The Bible Project";

  readonly logos: ProviderLogos = {
    light: "https://static.bibleproject.com/bp-web-components/v0.25.0/bibleproject-logo-mark.svg",
    dark: "https://static.bibleproject.com/bp-web-components/v0.25.0/bibleproject-logo-mark.svg"
  };

  readonly config: ContentProviderConfig = {
    id: "bibleproject",
    name: "The Bible Project",
    apiBase: "https://bibleproject.com",
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

  private data: BibleProjectData = bibleProjectData;

  private getMuxThumbnail(muxPlaybackId: string, width = 400, height = 225): string {
    return `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?width=${width}&height=${height}`;
  }

  private videoToFile(video: BibleProjectVideo): ContentFile {
    return createFile(video.id, video.title, video.videoUrl, {
      mediaType: "video",
      thumbnail: this.getMuxThumbnail(video.muxPlaybackId),
      muxPlaybackId: video.muxPlaybackId,
      seconds: 0
    });
  }

  /** Resolve a path to its collection and files: all videos at depth 1, a single video at depth 2. */
  private resolve(path: string | null | undefined): { collection: BibleProjectCollection; files: ContentFile[]; name: string } | null {
    const { segments, depth } = parsePath(path);
    if (depth < 1 || depth > 2) return null;

    const collection = this.data.collections.find(c => slugify(c.name) === segments[0]);
    if (!collection) return null;

    if (depth === 1) {
      return { collection, files: collection.videos.map(v => this.videoToFile(v)), name: collection.name };
    }

    const video = collection.videos.find(v => v.id === segments[1]);
    if (!video) return null;
    return { collection, files: [this.videoToFile(video)], name: video.title };
  }

  async browse(path?: string | null, _auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);

    if (depth === 0) {
      return this.data.collections
        .filter(collection => collection.videos.length > 0)
        .map(collection => ({
          type: "folder" as const,
          id: slugify(collection.name),
          title: collection.name,
          thumbnail: collection.image || undefined,
          path: `/${slugify(collection.name)}`
        }));
    }

    if (depth === 1) {
      const collection = this.data.collections.find(c => slugify(c.name) === segments[0]);
      if (!collection) return [];
      return collection.videos.map(video => ({
        type: "folder" as const,
        id: video.id,
        title: video.title,
        thumbnail: this.getMuxThumbnail(video.muxPlaybackId),
        isLeaf: true,
        path: `${path}/${video.id}`
      }));
    }

    if (depth === 2) {
      return this.resolve(path)?.files ?? [];
    }

    return [];
  }

  async getPlaylist(path: string, _auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const resolved = this.resolve(path);
    return resolved && resolved.files.length > 0 ? resolved.files : null;
  }

  async getInstructions(path: string, _auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const resolved = this.resolve(path);
    if (!resolved) return null;
    return filesToInstructions(resolved.name, resolved.files, {
      id: slugify(resolved.collection.name) + "-section",
      label: resolved.collection.name
    });
  }
}
