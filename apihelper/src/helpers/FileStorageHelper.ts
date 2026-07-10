import { StorageProviderFactory } from "./StorageProviderFactory.js";

export class FileStorageHelper {
  static list = async (filePath: string) => {
    return await StorageProviderFactory.getDefault().list(filePath);
  };

  static move = async (oldKey: string, newKey: string) => {
    await StorageProviderFactory.getDefault().move(oldKey, newKey);
  };

  static store = async (key: string, contentType: string, contents: Buffer) => {
    await StorageProviderFactory.getDefault().store(key, contentType, contents);
  };

  static remove = async (key: string) => {
    await StorageProviderFactory.getDefault().remove(key);
  };

  static removeFolder = async (key: string) => {
    await StorageProviderFactory.getDefault().removeFolder!(key);
  };
}
