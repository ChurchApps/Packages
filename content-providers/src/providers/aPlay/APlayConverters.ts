import { ContentFile, ContentItem, PlanPresentation, InstructionItem } from "../../interfaces";
import { detectMediaType } from "../../utils";
import { parsePath } from "../../pathUtils";

/**
 * Extract library ID from path based on path structure
 */
export function extractLibraryId(path: string): string | null {
  const { segments, depth } = parsePath(path);

  if (depth < 4 || segments[0] !== "modules") return null;

  // /modules/{moduleId}/products/{productId}/{libraryId}
  if (segments[2] === "products" && depth === 5) {
    return segments[4];
  }
  // /modules/{moduleId}/libraries/{libraryId}
  if (segments[2] === "libraries" && depth === 4) {
    return segments[3];
  }

  return null;
}

/**
 * Convert raw media items to ContentFile array
 */
export function convertMediaToFiles(mediaItems: Record<string, unknown>[]): ContentFile[] {
  const files: ContentFile[] = [];

  for (const item of mediaItems) {
    const mediaType = (item.mediaType as string)?.toLowerCase();
    let url = "";
    let thumbnail = ((item.thumbnail as Record<string, unknown>)?.src || "") as string;
    let muxPlaybackId: string | undefined;

    const video = item.video as Record<string, unknown> | undefined;
    const image = item.image as Record<string, unknown> | undefined;

    if (mediaType === "video" && video) {
      muxPlaybackId = video.muxPlaybackId as string | undefined;
      if (muxPlaybackId) {
        url = `https://stream.mux.com/${muxPlaybackId}/capped-1080p.mp4`;
      } else {
        url = (video.muxStreamingUrl || video.url || "") as string;
      }
      thumbnail = thumbnail || (video.thumbnailUrl as string) || "";
    } else if (mediaType === "image" || image) {
      url = (image?.src || item.url || "") as string;
      thumbnail = thumbnail || (image?.src as string) || "";
    } else {
      url = (item.url || item.src || "") as string;
      thumbnail = thumbnail || (item.thumbnailUrl as string) || "";
    }

    if (!url) continue;

    const detectedMediaType = detectMediaType(url, mediaType);
    const fileId = (item.mediaId || item.id) as string;

    files.push({ type: "file", id: fileId, title: (item.title || item.name || item.fileName || "") as string, mediaType: detectedMediaType, thumbnail: thumbnail, url, muxPlaybackId, mediaId: fileId });
  }

  return files;
}

/**
 * Convert modules response to ContentItem folders
 */
export function convertModulesToFolders(modules: Record<string, unknown>[]): ContentItem[] {
  const items: ContentItem[] = [];

  for (const m of modules) {
    if (m.isLocked) continue;

    const moduleId = (m.id || m.moduleId) as string;
    const moduleTitle = (m.title || m.name) as string;
    const moduleImage = m.image as string | undefined;

    items.push({
      type: "folder" as const,
      id: moduleId,
      title: moduleTitle,
      thumbnail: moduleImage,
      path: `/modules/${moduleId}`
    });
  }

  return items;
}

/**
 * Convert libraries response to ContentItem folders
 */
export function convertLibrariesToFolders(libraries: Record<string, unknown>[], currentPath: string): ContentItem[] {
  return libraries.map((l) => ({
    type: "folder" as const,
    id: (l.libraryId || l.id) as string,
    title: (l.title || l.name) as string,
    thumbnail: l.image as string | undefined,
    isLeaf: true,
    path: `${currentPath}/${l.libraryId || l.id}`
  }));
}

/**
 * Convert products response to ContentItem folders
 */
export function convertProductsToFolders(products: Record<string, unknown>[], currentPath: string): ContentItem[] {
  return products.map((p) => ({
    type: "folder" as const,
    id: (p.productId || p.id) as string,
    title: (p.title || p.name) as string,
    thumbnail: p.image as string | undefined,
    path: `${currentPath}/products/${p.productId || p.id}`
  }));
}

/**
 * Convert files to presentations
 */
interface ConvertFilesResult {
  presentations: PlanPresentation[];
  plan: {
    id: string;
    name: string;
    sections: { id: string; name: string; presentations: PlanPresentation[] }[];
    allFiles: ContentFile[];
  };
}

export function convertFilesToPresentations(files: ContentFile[], libraryId: string): ConvertFilesResult {
  const title = "Library";
  const presentations: PlanPresentation[] = files.map(f => ({ id: f.id, name: f.title, actionType: "play" as const, files: [f] }));
  return {
    presentations,
    plan: { id: libraryId, name: title, sections: [{ id: `section-${libraryId}`, name: title, presentations }], allFiles: files }
  };
}

/**
 * Convert files to instructions
 */
export function convertFilesToInstructions(files: ContentFile[], _libraryId: string): { name: string; items: InstructionItem[] } {
  const items: InstructionItem[] = files.map(file => ({
    id: file.id + "-action",
    itemType: "action",
    label: file.title,
    actionType: "play",
    children: [
      {
        id: file.id,
        itemType: "file",
        label: file.title,
        seconds: file.seconds,
        downloadUrl: file.url,
        thumbnail: file.thumbnail
      }
    ]
  }));

  return { name: "Library", items };
}
