import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, ProviderCapabilities, MediaLicenseResult, IProvider, AuthType, Instructions } from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { ApiHelper } from "../../helpers";
import { checkMediaLicense, API_BASE } from "./APlayApi";
import { extractLibraryId, convertMediaToFiles, convertModulesToFolders, convertLibrariesToFolders, convertProductsToFolders, convertFilesToInstructions } from "./APlayConverters";

/**
 * Extracts an array from an API response that may have different formats.
 * Handles: { data: [...] }, { <key>: [...] }, or [...] directly.
 */
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

/**
 * APlay Provider
 *
 * Path structure (variable depth based on module products):
 *   /modules                                              -> list modules
 *   /modules/{moduleId}                                   -> list products OR libraries (depends on module)
 *   /modules/{moduleId}/products/{productId}              -> list libraries (if module has multiple products)
 *   /modules/{moduleId}/products/{productId}/{libraryId}  -> media files
 *   /modules/{moduleId}/libraries/{libraryId}             -> media files (if module has 0-1 products)
 */
export class APlayProvider implements IProvider {
  private readonly apiHelper = new ApiHelper();

  private async apiRequest<T>(path: string, auth?: ContentProviderAuthData | null): Promise<T | null> {
    return this.apiHelper.apiRequest<T>(this.config, this.id, path, auth);
  }

  readonly id = "aplay";
  readonly name = "APlay";

  readonly logos: ProviderLogos = { light: "https://www.joinamazing.com/_assets/v11/3ba846c5afd7e73d27bc4d87b63d423e7ae2dc73.svg", dark: "https://www.joinamazing.com/_assets/v11/3ba846c5afd7e73d27bc4d87b63d423e7ae2dc73.svg" };

  readonly config: ContentProviderConfig = { id: "aplay", name: "APlay", apiBase: API_BASE, oauthBase: "https://api.joinamazing.com/prod/aims/oauth", clientId: "xFJFq7yNYuXXXMx0YBiQ", scopes: ["openid", "profile", "email"], endpoints: { modules: "/prod/curriculum/modules", productLibraries: (productId: string) => `/prod/curriculum/modules/products/${productId}/libraries`, libraryMedia: (libraryId: string) => `/prod/creators/libraries/${libraryId}/media` } };

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
    const response = await this.apiRequest<Record<string, unknown>>(this.config.endpoints.modules as string, auth);
    const modules = extractArray(response, "data", "modules");
    return convertModulesToFolders(modules);
  }

  private async getModuleContent(moduleId: string, currentPath: string, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const response = await this.apiRequest<Record<string, unknown>>(this.config.endpoints.modules as string, auth);
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
    const pathFn = this.config.endpoints.productLibraries as (id: string) => string;
    const response = await this.apiRequest<Record<string, unknown>>(pathFn(productId), auth);
    const libraries = extractArray(response, "data", "libraries");
    return convertLibrariesToFolders(libraries, currentPath);
  }

  private async getMediaFiles(libraryId: string, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const pathFn = this.config.endpoints.libraryMedia as (id: string) => string;
    const response = await this.apiRequest<Record<string, unknown>>(pathFn(libraryId), auth);
    const mediaItems = extractArray(response, "data", "media");
    return convertMediaToFiles(mediaItems);
  }

  async getPlaylist(path: string, auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const libraryId = extractLibraryId(path);
    if (!libraryId) return null;

    const files = await this.getMediaFiles(libraryId, auth) as ContentFile[];
    return files.length > 0 ? files : null;
  }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const libraryId = extractLibraryId(path);
    if (!libraryId) return null;

    const files = await this.getMediaFiles(libraryId, auth) as ContentFile[];
    if (files.length === 0) return null;

    return convertFilesToInstructions(files, libraryId);
  }

  async checkMediaLicense(mediaId: string, auth?: ContentProviderAuthData | null): Promise<MediaLicenseResult | null> {
    return checkMediaLicense(mediaId, auth);
  }

  supportsDeviceFlow(): boolean {
    return false;
  }
}
