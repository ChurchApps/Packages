import { AuthType, ContentItem, ContentProviderAuthData, ContentProviderConfig, IProvider, ProviderCapabilities, ProviderLogos } from "../interfaces";
import { ApiHelper } from "../helpers";

/** Base for providers; auth-flow methods are intentionally not here so consumers can feature-detect with `"method" in provider`. */
export abstract class BaseProvider implements IProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly logos: ProviderLogos;
  abstract readonly config: ContentProviderConfig;
  abstract readonly requiresAuth: boolean;
  abstract readonly authTypes: AuthType[];
  abstract readonly capabilities: ProviderCapabilities;

  private readonly apiHelper = new ApiHelper();

  protected apiRequest<T>(path: string, auth?: ContentProviderAuthData | null, method: "GET" | "POST" = "GET", body?: unknown): Promise<T | null> {
    return this.apiHelper.apiRequest<T>(this.config, this.id, path, auth, method, body);
  }

  abstract browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]>;

  supportsDeviceFlow(): boolean {
    return !!this.config.supportsDeviceFlow && !!this.config.deviceAuthEndpoint;
  }
}
