import { AuthType, ContentItem, ContentProviderAuthData, ContentProviderConfig, IProvider, ProviderCapabilities, ProviderLogos } from "../interfaces";
import { ApiHelper } from "../helpers";

/**
 * Shared base for providers: identity metadata, an authenticated fetch wrapper, and a
 * config-driven supportsDeviceFlow. Auth-flow methods (initiateDeviceFlow, buildAuthUrl, ...)
 * deliberately do NOT live here: consumers feature-detect them with `"method" in provider`,
 * so they must exist only on the providers that actually support each flow.
 */
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
