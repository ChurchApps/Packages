import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, ProviderCapabilities, IProvider, AuthType, Instructions, InstructionItem } from "../../interfaces";
import { createFile, slugify } from "../../utils";
import { parsePath } from "../../pathUtils";
import bibleProjectData from "./data.json";
import { BibleProjectData } from "./BibleProjectInterfaces";

/**
 * BibleProject Provider
 *
 * Path structure:
 *   /                              -> list collections
 *   /{collectionSlug}              -> list videos in collection
 *   /{collectionSlug}/{videoId}    -> single video
 */
export class BibleProjectProvider implements IProvider {
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
    scopes: [],
    endpoints: { downloads: "/downloads/" }
  };

  private data: BibleProjectData = bibleProjectData;

  private getMuxThumbnail(muxPlaybackId: string, width = 400, height = 225): string {
    return `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?width=${width}&height=${height}`;
  }

  readonly requiresAuth = false;
  readonly authTypes: AuthType[] = ["none"];
  readonly capabilities: ProviderCapabilities = {
    browse: true,
    presentations: true,
    playlist: true,
    instructions: true,
    mediaLicensing: false
  };

  async browse(path?: string | null, _auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);

    // / -> list all collections
    if (depth === 0) {
      return this.getCollections();
    }

    // /{collectionSlug} -> list videos in collection
    if (depth === 1) {
      const collectionSlug = segments[0];
      return this.getLessonFolders(collectionSlug, path!);
    }

    // /{collectionSlug}/{videoId} -> single video file
    if (depth === 2) {
      const collectionSlug = segments[0];
      const videoId = segments[1];
      return this.getVideoFile(collectionSlug, videoId);
    }

    return [];
  }

  private getCollections(): ContentItem[] {
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

  private getLessonFolders(collectionSlug: string, currentPath: string): ContentItem[] {
    const collection = this.data.collections.find(c => slugify(c.name) === collectionSlug);
    if (!collection) return [];

    return collection.videos.map(video => ({
      type: "folder" as const,
      id: video.id,
      title: video.title,
      thumbnail: this.getMuxThumbnail(video.muxPlaybackId),
      isLeaf: true,
      path: `${currentPath}/${video.id}`
    }));
  }

  private getVideoFile(collectionSlug: string, videoId: string): ContentItem[] {
    const collection = this.data.collections.find(c => slugify(c.name) === collectionSlug);
    if (!collection) return [];

    const video = collection.videos.find(v => v.id === videoId);
    if (!video) return [];

    return [createFile(video.id, video.title, video.videoUrl, { mediaType: "video", muxPlaybackId: video.muxPlaybackId, seconds: 0 })];
  }

  // async getPresentations(path: string, _auth?: ContentProviderAuthData | null): Promise<Plan | null> {
  //   const { segments, depth } = parsePath(path);

  //   if (depth < 1) return null;

  //   const collectionSlug = segments[0];
  //   const collection = this.data.collections.find(c => slugify(c.name) === collectionSlug);
  //   if (!collection) return null;

  //   // For collection level (depth 1), create a plan with all videos
  //   if (depth === 1) {
  //     const allFiles: ContentFile[] = [];
  //     const presentations: PlanPresentation[] = collection.videos.map(video => {
  //       const file: ContentFile = { type: "file", id: video.id, title: video.title, mediaType: "video", url: video.videoUrl, thumbnail: this.getMuxThumbnail(video.muxPlaybackId), muxPlaybackId: video.muxPlaybackId, seconds: 0 };
  //       allFiles.push(file);
  //       return { id: video.id, name: video.title, actionType: "play" as const, files: [file] };
  //     });

  //     return { id: slugify(collection.name), name: collection.name, thumbnail: collection.image || undefined, sections: [{ id: "videos", name: "Videos", presentations }], allFiles };
  //   }

  //   // For video level (depth 2, single video), create a simple plan
  //   if (depth === 2) {
  //     const videoId = segments[1];
  //     const video = collection.videos.find(v => v.id === videoId);
  //     if (!video) return null;

  //     const file: ContentFile = { type: "file", id: video.id, title: video.title, mediaType: "video", url: video.videoUrl, thumbnail: this.getMuxThumbnail(video.muxPlaybackId), muxPlaybackId: video.muxPlaybackId, seconds: 0 };
  //     return { id: video.id, name: video.title, thumbnail: this.getMuxThumbnail(video.muxPlaybackId), sections: [{ id: "main", name: "Content", presentations: [{ id: video.id, name: video.title, actionType: "play", files: [file] }] }], allFiles: [file] };
  //   }

  //   return null;
  // }

  async getPlaylist(path: string, _auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const { segments, depth } = parsePath(path);

    if (depth < 1) return null;

    const collectionSlug = segments[0];
    const collection = this.data.collections.find(c => slugify(c.name) === collectionSlug);
    if (!collection) return null;

    // For collection level, return all videos
    if (depth === 1) {
      const files = collection.videos.map(video => ({ type: "file" as const, id: video.id, title: video.title, mediaType: "video" as const, url: video.videoUrl, thumbnail: this.getMuxThumbnail(video.muxPlaybackId), muxPlaybackId: video.muxPlaybackId, seconds: 0 }));
      return files.length > 0 ? files : null;
    }

    // For video level, return the single video
    if (depth === 2) {
      const videoId = segments[1];
      const video = collection.videos.find(v => v.id === videoId);
      if (!video) return null;
      return [{ type: "file", id: video.id, title: video.title, mediaType: "video", url: video.videoUrl, thumbnail: this.getMuxThumbnail(video.muxPlaybackId), muxPlaybackId: video.muxPlaybackId, seconds: 0 }];
    }

    return null;
  }

  async getInstructions(path: string, _auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const { segments, depth } = parsePath(path);

    if (depth < 1) return null;

    const collectionSlug = segments[0];
    const collection = this.data.collections.find(c => slugify(c.name) === collectionSlug);
    if (!collection) return null;

    // For collection level (depth 1), create instructions with all videos wrapped in a section
    if (depth === 1) {
      const actionItems: InstructionItem[] = collection.videos.map(video => ({
        id: video.id + "-action",
        itemType: "action",
        label: video.title,
        actionType: "play",
        children: [
          {
            id: video.id,
            itemType: "file",
            label: video.title,
            downloadUrl: video.videoUrl,
            thumbnail: this.getMuxThumbnail(video.muxPlaybackId)
          }
        ]
      }));

      // Wrap actions in a section using the collection name
      const sectionItem: InstructionItem = {
        id: slugify(collection.name) + "-section",
        itemType: "section",
        label: collection.name,
        children: actionItems
      };

      return { name: collection.name, items: [sectionItem] };
    }

    // For video level (depth 2), create instructions for single video wrapped in a section
    if (depth === 2) {
      const videoId = segments[1];
      const video = collection.videos.find(v => v.id === videoId);
      if (!video) return null;

      const actionItem: InstructionItem = {
        id: video.id + "-action",
        itemType: "action",
        label: video.title,
        actionType: "play",
        children: [
          {
            id: video.id,
            itemType: "file",
            label: video.title,
            downloadUrl: video.videoUrl,
            thumbnail: this.getMuxThumbnail(video.muxPlaybackId)
          }
        ]
      };

      // Wrap in a section using the collection name
      const sectionItem: InstructionItem = {
        id: slugify(collection.name) + "-section",
        itemType: "section",
        label: collection.name,
        children: [actionItem]
      };

      return { name: video.title, items: [sectionItem] };
    }

    return null;
  }

  supportsDeviceFlow(): boolean {
    return false;
  }
}
