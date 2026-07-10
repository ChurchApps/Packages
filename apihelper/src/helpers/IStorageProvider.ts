export interface PresignedPostData {
  url: string;
  fields: Record<string, string>;
  key: string;
}

export interface StorageQuota {
  usedBytes: number;
  quotaBytes: number;
}

export interface IStorageProvider {
  readonly name: string;
  store(key: string, contentType: string, contents: Buffer): Promise<string>;
  getUploadUrl(key: string, contentType: string, size: number): Promise<PresignedPostData | null>;
  confirmUpload?(key: string): Promise<void>;
  remove(key: string): Promise<void>;
  removeFolder?(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  move(oldKey: string, newKey: string): Promise<void>;
  getQuota?(churchId: string): Promise<StorageQuota | null>;
}
