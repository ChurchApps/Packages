import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, ProviderCapabilities, MediaLicenseResult, AuthType, Instructions } from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { filesToInstructions } from "../../utils";
import { BaseProvider } from "../BaseProvider";
import { checkMediaLicense, API_BASE } from "./APlayApi";
import { extractLibraryId, convertMediaToFiles, convertModulesToFolders, convertLibrariesToFolders, convertProductsToFolders } from "./APlayConverters";

/** Extracts an array from an API response with various formats: { data: [...] }, { key: [...] }, or [...] directly. */
function extractArray<T = Record<string, unknown>>(
  response: Record<string, unknown> | null,
  ...keys: string[]
): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response as T[];

  for (const key of keys) {
    if (response[key] && Array.isArray(response[key])) {
      return response[key] as T[];
    }
  }

  return [];
}

/** APlay Provider: media curriculum library with OAuth 2.0 auth. */
export class APlayProvider extends BaseProvider {
  readonly id = "aplay";
  readonly name = "APlay";

  readonly logos: ProviderLogos = { light: "https://www.joinamazing.com/_assets/v11/3ba846c5afd7e73d27bc4d87b63d423e7ae2dc73.svg", dark: "https://www.joinamazing.com/_assets/v11/3ba846c5afd7e73d27bc4d87b63d423e7ae2dc73.svg" };

  readonly config: ContentProviderConfig = { id: "aplay", name: "APlay", apiBase: API_BASE, oauthBase: "https://api.joinamazing.com/prod/aims/oauth", clientId: "xFJFq7yNYuXXXMx0YBiQ", scopes: ["openid", "profile", "email"] };

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["oauth_pkce"];
  readonly capabilities: ProviderCapabilities = { browse: true, playlist: true, instructions: true, mediaLicensing: true };

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);

    if (depth === 0) {
      return [{ type: "folder" as const, id: "modules-root", title: "Modules", path: "/modules" }];
    }

    const root = segments[0];
    if (root !== "modules") return [];

    if (depth === 1) return this.getModules(auth);
    if (depth === 2) return this.getModuleContent(segments[1], path!, auth);
    if (depth === 4 && segments[2] === "products") return this.getLibraryFolders(segments[3], path!, auth);
    if (depth === 5 && segments[2] === "products") return this.getMediaFiles(segments[4], auth);
    if (depth === 4 && segments[2] === "libraries") return this.getMediaFiles(segments[3], auth);

    return [];
  }

  private async getModules(auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const response = await this.apiRequest<Record<string, unknown>>("/prod/curriculum/modules", auth);
    const modules = extractArray(response, "data", "modules");
    return convertModulesToFolders(modules);
  }

  private async getModuleContent(moduleId: string, currentPath: string, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const response = await this.apiRequest<Record<string, unknown>>("/prod/curriculum/modules", auth);
    const modules = extractArray(response, "data", "modules");
    const module = modules.find(m => (m.id || m.moduleId) === moduleId);
    if (!module) return [];

    const allProducts = (module.products as Record<string, unknown>[]) || [];
    const products = allProducts.filter((p) => !p.isHidden);

    if (products.length === 0) {
      return this.getLibraryFolders(moduleId, `${currentPath}/libraries`, auth);
    } else if (products.length === 1) {
      const productId = (products[0].productId || products[0].id) as string;
      return this.getLibraryFolders(productId, `${currentPath}/libraries`, auth);
    } else {
      return convertProductsToFolders(products, currentPath);
    }
  }

  private async getLibraryFolders(productId: string, currentPath: string, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const response = await this.apiRequest<Record<string, unknown>>(`/prod/curriculum/modules/products/${productId}/libraries`, auth);
    const libraries = extractArray(response, "data", "libraries");
    return convertLibrariesToFolders(libraries, currentPath);
  }

  private async getMediaFiles(libraryId: string, auth?: ContentProviderAuthData | null): Promise<ContentFile[]> {
    const response = await this.apiRequest<Record<string, unknown>>(`/prod/creators/libraries/${libraryId}/media`, auth);
    const mediaItems = extractArray(response, "data", "media");
    return convertMediaToFiles(mediaItems);
  }

  async getPlaylist(path: string, auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const libraryId = extractLibraryId(path);
    if (!libraryId) return null;

    const files = await this.getMediaFiles(libraryId, auth);
    return files.length > 0 ? files : null;
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const libraryId = extractLibraryId(path);
    if (!libraryId) return null;

    const files = await this.getMediaFiles(libraryId, auth);
    if (files.length === 0) return null;

    return filesToInstructions("Library", files);
  }

  async checkMediaLicense(mediaId: string, auth?: ContentProviderAuthData | null): Promise<MediaLicenseResult | null> {
    return checkMediaLicense(mediaId, auth);
  }
}
