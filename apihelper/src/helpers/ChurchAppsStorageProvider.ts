import fs from "fs";
import path from "path";
import { AwsHelper } from "./AwsHelper.js";
import { EnvironmentBase } from "./EnvironmentBase.js";
import { IStorageProvider, PresignedPostData, StorageQuota } from "./IStorageProvider.js";

export class ChurchAppsStorageProvider implements IStorageProvider {
  readonly name = "churchapps";
  private rootPath = path.resolve("./content") + path.sep;

  private safePath(key: string): string {
    if (key.split(/[/\\]/).includes("..") || /^[a-zA-Z]:[\\/]/.test(key) || key.startsWith("//") || key.startsWith("\\\\")) throw new Error("Invalid storage key");
    if (path.isAbsolute(key)) {
      const abs = path.resolve(key);
      if (abs !== this.rootPath.slice(0, -1) && !abs.startsWith(this.rootPath) && fs.existsSync(abs)) throw new Error("Invalid storage key");
    }
    if (key.startsWith("/")) key = key.substring(1);
    if (path.isAbsolute(key) || path.win32.isAbsolute(key)) throw new Error("Invalid storage key");
    const resolved = path.resolve(this.rootPath, key);
    if (resolved !== this.rootPath.slice(0, -1) && !resolved.startsWith(this.rootPath)) throw new Error("Invalid storage key");
    return resolved;
  }

  async store(key: string, contentType: string, contents: Buffer): Promise<string> {
    switch (EnvironmentBase.fileStore) {
      case "S3": await AwsHelper.S3Upload(key, contentType, contents); break;
      default: this.storeLocal(key, contents); break;
    }
    return (EnvironmentBase.contentRoot || "") + key;
  }

  async getUploadUrl(key: string, _contentType: string, _size: number): Promise<PresignedPostData | null> {
    // S3PresignedUrl doesn't constrain contentType/size; params exist for providers that do
    if (EnvironmentBase.fileStore === "S3") return await AwsHelper.S3PresignedUrl(key);
    return null;
  }

  async remove(key: string): Promise<void> {
    switch (EnvironmentBase.fileStore) {
      case "S3": await AwsHelper.S3Remove(key); break;
      default: fs.unlinkSync(this.safePath(key)); break;
    }
  }

  async removeFolder(key: string): Promise<void> {
    switch (EnvironmentBase.fileStore) {
      case "S3": break;
      default: fs.rmdirSync(this.safePath(key)); break;
    }
  }

  async list(prefix: string): Promise<string[]> {
    switch (EnvironmentBase.fileStore) {
      case "S3": return await AwsHelper.S3List(prefix);
      default: {
        const fullPath = this.safePath(prefix);
        if (!fs.existsSync(fullPath)) return [];
        return fs.readdirSync(fullPath);
      }
    }
  }

  async move(oldKey: string, newKey: string): Promise<void> {
    switch (EnvironmentBase.fileStore) {
      case "S3": await AwsHelper.S3Move(oldKey, newKey); break;
      default: fs.renameSync(this.safePath(oldKey), this.safePath(newKey)); break;
    }
  }

  async getQuota(_churchId: string): Promise<StorageQuota | null> {
    return null;
  }

  private storeLocal(key: string, contents: Buffer) {
    const fileName = this.safePath(key);
    const dirName = path.dirname(fileName);
    if (!fs.existsSync(dirName)) fs.mkdirSync(dirName, { recursive: true });
    fs.writeFileSync(fileName, contents);
  }
}
