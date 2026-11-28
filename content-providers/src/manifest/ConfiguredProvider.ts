import { AuthType, ContentProviderConfig, ProviderCapabilities, ProviderLogos } from "../interfaces";
import { BaseProvider } from "../providers/BaseProvider";
import { getProviderSecret } from "../helpers/ProviderSecrets";
import { fillTemplate } from "./expression";
import { ProviderManifest } from "./types";
import { validateManifest } from "./validate";

/**
 * A provider whose identity, auth settings, environments and settings come from its JSON manifest.
 * The generic ManifestProvider extends it, and so do the built-in implementations a manifest can name
 * with "implementation" for logic that JSON can't express.
 */
export abstract class ConfiguredProvider extends BaseProvider {
  readonly id: string;
  readonly name: string;
  readonly logos: ProviderLogos;
  readonly config: ContentProviderConfig;
  readonly requiresAuth: boolean;
  readonly authTypes: AuthType[];
  readonly capabilities: ProviderCapabilities;
  readonly manifest: ProviderManifest;

  protected environment?: string;

  constructor(manifest: unknown) {
    super();
    const m = validateManifest(manifest);
    this.manifest = m;
    this.id = m.id;
    this.name = m.name;
    this.logos = { ...m.logos };
    this.requiresAuth = m.requiresAuth;
    this.capabilities = { ...m.capabilities };
    this.environment = m.defaultEnvironment;

    const auth = m.auth;
    this.authTypes = m.authTypes
      ? [...m.authTypes]
      : auth ? [...(auth.pkce ? ["oauth_pkce" as const] : []), ...(auth.deviceFlow ? ["device_flow" as const] : [])] : ["none"];

    // apiBase and oauthBase are getters so switching environment changes them.
    const config = { id: m.id, name: m.name, clientId: auth?.clientId || "", scopes: [...(auth?.scopes || [])] } as ContentProviderConfig;
    Object.defineProperty(config, "apiBase", { get: () => this.fill(m.apiBase), enumerable: true });
    Object.defineProperty(config, "oauthBase", { get: () => (auth ? this.fill(auth.oauthBase) : ""), enumerable: true });
    if (auth?.clientSecret) {
      const secretName = auth.clientSecret.slice("secret:".length);
      Object.defineProperty(config, "clientSecret", { get: () => getProviderSecret(secretName), enumerable: true });
    }
    if (auth?.deviceFlow) {
      config.supportsDeviceFlow = true;
      config.deviceAuthEndpoint = auth.deviceFlow.endpoint;
    }
    this.config = config;

    if (m.environments) {
      const setEnvironment = (name: string) => {
        if (!m.environments?.[name]) return;
        this.environment = name;
        this.onEnvironmentChange();
      };
      Object.defineProperty(this, "setEnvironment", { value: setEnvironment, enumerable: false });
      Object.defineProperty(this, "getEnvironment", { value: () => this.environment, enumerable: false });
    }
  }

  /** Free-form values from the manifest's "settings", for implementations to read instead of hard-coding. */
  protected get settings(): Record<string, unknown> {
    return this.manifest.settings || {};
  }

  /** The current environment's values, readable in templates as env.*. */
  protected get env(): Record<string, string> {
    return (this.environment && this.manifest.environments?.[this.environment]) || {};
  }

  protected fill(template: string): string {
    return fillTemplate(template, { env: this.env }, false);
  }

  /** Called after setEnvironment, e.g. to clear caches whose ids differ between environments. */
  protected onEnvironmentChange(): void {}
}
