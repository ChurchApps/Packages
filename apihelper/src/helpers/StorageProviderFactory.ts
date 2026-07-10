import { ChurchAppsStorageProvider } from "./ChurchAppsStorageProvider.js";
import { IStorageProvider } from "./IStorageProvider.js";

const providers = new Map<string, IStorageProvider>();
providers.set("churchapps", new ChurchAppsStorageProvider());

export class StorageProviderFactory {
  static register(name: string, provider: IStorageProvider): void {
    providers.set(name.toLowerCase(), provider);
  }

  static getProvider(name: string): IStorageProvider {
    const provider = providers.get(name.toLowerCase());
    if (!provider) throw new Error(`Unsupported storage provider: ${name}. Available: ${Array.from(providers.keys()).join(", ")}`);
    return provider;
  }

  static getDefault(): IStorageProvider {
    return StorageProviderFactory.getProvider("churchapps");
  }

  static isAvailable(name: string): boolean {
    return providers.has(name.toLowerCase());
  }
}
