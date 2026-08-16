import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";

// rootPath resolves from cwd at module load; chdir to a temp dir before importing
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "apihelper-storage-"));
process.chdir(tmp);

const { ChurchAppsStorageProvider } = await import("../src/helpers/ChurchAppsStorageProvider");
const { StorageProviderFactory } = await import("../src/helpers/StorageProviderFactory");
const { FileStorageHelper } = await import("../src/helpers/FileStorageHelper");
const { EnvironmentBase } = await import("../src/helpers/EnvironmentBase");

test("ChurchAppsStorageProvider disk mode: store returns contentRoot URL and writes the file", async () => {
  EnvironmentBase.contentRoot = "http://localhost:8084/content";
  const provider = new ChurchAppsStorageProvider();
  const url = await provider.store("/church1/files/hello.txt", "text/plain", Buffer.from("hi"));
  assert.equal(url, "http://localhost:8084/content/church1/files/hello.txt");
  assert.equal(fs.readFileSync(path.join(tmp, "content", "church1", "files", "hello.txt"), "utf8"), "hi");
});

test("ChurchAppsStorageProvider disk mode: list returns directory entries, empty for missing path", async () => {
  const provider = new ChurchAppsStorageProvider();
  assert.deepEqual(await provider.list("/church1/files"), ["hello.txt"]);
  assert.deepEqual(await provider.list("/nope"), []);
});

test("ChurchAppsStorageProvider disk mode: getUploadUrl returns null (base64 fallback path)", async () => {
  const provider = new ChurchAppsStorageProvider();
  assert.equal(await provider.getUploadUrl("/x", "text/plain", 10), null);
});

test("ChurchAppsStorageProvider S3 mode: getUploadUrl forwards contentType and size", async () => {
  const { AwsHelper } = await import("../src/helpers/AwsHelper");
  const calls: unknown[] = [];
  const original = AwsHelper.S3PresignedUrl;
  AwsHelper.S3PresignedUrl = (async (key: string, contentType?: string, size?: number) => {
    calls.push({ key, contentType, size });
    return { url: "https://s3.example/post", fields: { "Content-Type": contentType || "", acl: "public-read" }, key };
  }) as typeof AwsHelper.S3PresignedUrl;
  EnvironmentBase.fileStore = "S3";
  try {
    const provider = new ChurchAppsStorageProvider();
    const result = await provider.getUploadUrl("/church1/photo.jpg", "image/jpeg", 4096);
    assert.deepEqual(calls, [{ key: "/church1/photo.jpg", contentType: "image/jpeg", size: 4096 }]);
    assert.equal(result?.fields.acl, "public-read");
    assert.notEqual(result?.fields.acl, undefined);
  } finally {
    AwsHelper.S3PresignedUrl = original;
    EnvironmentBase.fileStore = "";
  }
});

test("ChurchAppsStorageProvider disk mode: remove deletes the file, removeFolder the dir", async () => {
  const provider = new ChurchAppsStorageProvider();
  await provider.remove("/church1/files/hello.txt");
  assert.equal(fs.existsSync(path.join(tmp, "content", "church1", "files", "hello.txt")), false);
  await provider.removeFolder("/church1/files");
  assert.equal(fs.existsSync(path.join(tmp, "content", "church1", "files")), false);
});

test("ChurchAppsStorageProvider getQuota returns null (free tier, no quota)", async () => {
  const provider = new ChurchAppsStorageProvider();
  assert.equal(await provider.getQuota("church1"), null);
});

test("StorageProviderFactory: default is churchapps, lookup is case-insensitive, unknown throws", () => {
  assert.equal(StorageProviderFactory.getDefault().name, "churchapps");
  assert.equal(StorageProviderFactory.getProvider("ChurchApps").name, "churchapps");
  assert.equal(StorageProviderFactory.isAvailable("nope"), false);
  assert.throws(() => StorageProviderFactory.getProvider("nope"), /Unsupported storage provider/);
});

test("StorageProviderFactory.register makes a custom provider retrievable", () => {
  const fake = {
    name: "fake",
    store: async () => "url",
    getUploadUrl: async () => null,
    remove: async () => {},
    list: async () => [],
    move: async () => {}
  };
  StorageProviderFactory.register("Fake", fake);
  assert.equal(StorageProviderFactory.getProvider("fake").name, "fake");
  assert.equal(StorageProviderFactory.isAvailable("FAKE"), true);
});

test("FileStorageHelper delegates to the default provider (store + list round-trip)", async () => {
  await FileStorageHelper.store("/church2/a.txt", "text/plain", Buffer.from("x"));
  assert.deepEqual(await FileStorageHelper.list("/church2"), ["a.txt"]);
  await FileStorageHelper.remove("/church2/a.txt");
  await FileStorageHelper.removeFolder("/church2");
  assert.equal(fs.existsSync(path.join(tmp, "content", "church2")), false);
});
