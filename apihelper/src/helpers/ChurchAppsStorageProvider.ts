import fs from "fs";
import path from "path";
import { AwsHelper } from "./AwsHelper.js";
import { EnvironmentBase } from "./EnvironmentBase.js";
import { IStorageProvider, PresignedPostData, StorageQuota } from "./IStorageProvider.js";

export class ChurchAppsStorageProvider implements IStorageProvider {
  readonly name = "churchapps";
  private rootPath = path.resolve("./content") + path.sep;

  // Keys name a location inside ./content, never on the wider filesystem. Anything that could
  // escape is rejected up front, then whatever survives is resolved and must still sit under
  // rootPath (which keeps its trailing separator, so a sibling like ./content-evil never matches).
  private safePath(key: string): string {
    const invalid =
      !key ||
      key.includes("\0") ||
      /^[a-zA-Z]:/.test(key) || // C:\x, C:/x, and drive-relative C:x
      /^[/\\]{2}/.test(key) || // //host/share, \\host\share, \\?\C:\x, ///x
      key.split(/[/\\]+/).includes("..");
    if (invalid) throw new Error("Invalid storage key");
    // A leading slash is the shape callers already use ("/churchId/..."); it is root-relative here.
    const resolved = path.resolve(this.rootPath, key.replace(/^[/\\]+/, ""));
    if (!resolved.startsWith(this.rootPath)) throw new Error("Invalid storage key");
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
