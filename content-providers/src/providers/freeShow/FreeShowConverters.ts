import { ContentFile, ContentFolder, ContentProviderAuthData, NetworkInstance } from "../../interfaces";
import { createFile, createFolder, detectMediaType } from "../../utils";
import {
  DEFAULT_SLIDE_SECONDS,
  FreeShowLayoutSlide,
  FreeShowShow
} from "./FreeShowInterfaces";

export const MOCK_FREESHOW_INSTANCE: NetworkInstance = {
  id: "mock-local",
  name: "This PC",
  host: "localhost",
  ip: "127.0.0.1",
  port: 5505
};

export function parseShowExport(raw: unknown): { id: string; show: FreeShowShow } | null {
  if (Array.isArray(raw) && raw.length >= 2 && typeof raw[0] === "string" && raw[1] && typeof raw[1] === "object") {
    return { id: raw[0], show: raw[1] as FreeShowShow };
  }
  if (raw && typeof raw === "object" && "layouts" in (raw as object) && "media" in (raw as object)) {
    const show = raw as FreeShowShow;
    return { id: show.id || "show", show };
  }
  return null;
}

export function slideSeconds(ref: FreeShowLayoutSlide, mediaType: "video" | "image" | "audio"): number | undefined {
  if (typeof ref.nextTimer === "number" && ref.nextTimer > 0) return ref.nextTimer;
  if (ref.actions?.nextAfterMedia && mediaType === "video") return undefined;
  return DEFAULT_SLIDE_SECONDS;
}

export function showToFiles(show: FreeShowShow): ContentFile[] {
  const layoutId = show.settings?.activeLayout || Object.keys(show.layouts || {})[0];
  const layout = layoutId ? show.layouts?.[layoutId] : undefined;
  const refs = layout?.slides || [];
  const loops = refs.some(ref => ref.end === true);

  const files: ContentFile[] = [];
  for (const ref of refs) {
    if (ref.disabled || !ref.background) continue;
    const media = show.media?.[ref.background];
    const path = media?.path;
    if (!path) continue;

    const mediaType = detectMediaType(path, media?.type);
    const slide = show.slides?.[ref.id];
    const title = media?.name || slide?.group || "Slide";
    files.push(createFile(ref.id, title, path, {
      mediaType,
      thumbnail: mediaType === "image" ? path : undefined,
      seconds: slideSeconds(ref, mediaType),
      loop: loops,
      loopVideo: false
    }));
  }
  return files;
}

export function showToFolder(id: string, show: FreeShowShow): ContentFolder {
  const files = showToFiles(show);
  const thumbnail = files.find(file => file.mediaType === "image")?.url || files[0]?.thumbnail;
  return createFolder(id, show.name || "Show", `/${id}`, thumbnail, true);
}

export function networkInstanceToAuth(instance: NetworkInstance): ContentProviderAuthData {
  return {
    access_token: instance.id,
    refresh_token: JSON.stringify(instance),
    token_type: "network",
    created_at: Math.floor(Date.now() / 1000),
    expires_in: 10 * 365 * 24 * 3600,
    scope: "freeshow"
  };
}

export function authToNetworkInstance(auth?: ContentProviderAuthData | null): NetworkInstance | null {
  if (!auth?.refresh_token) return null;
  try {
    const parsed = JSON.parse(auth.refresh_token) as NetworkInstance;
    if (parsed?.id && parsed?.name) return parsed;
  } catch {
    return null;
  }
  return null;
}
