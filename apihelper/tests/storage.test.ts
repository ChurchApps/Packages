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

test("ChurchAppsStorageProvider disk mode: remove deletes the file, removeFolder the dir", async () => {
  const provider = new ChurchAppsStorageProvider();
  await provider.remove("/church1/files/hello.txt");
  assert.equal(fs.existsSync(path.join(tmp, "content", "church1", "files", "hello.txt")), false);
  await provider.removeFolder("/church1/files");
  assert.equal(fs.existsSync(path.join(tmp, "content", "church1", "files")), false);
});

const traversalKeys = [
  "", // no key at all
  "/", // separators only, resolves to the content root itself
  ".", // the content root itself
  "..",
  "../etc/passwd",
  "../../etc/passwd",
  "church1/../../escape.txt",
  "church1/files/../../../escape.txt",
  "../content-evil/x.txt", // sibling dir sharing the "content" prefix
  "..\\..\\escape.txt", // backslash traversal, meaningful on win32
  "church1\\..\\..\\escape.txt",
  "//etc/passwd", // UNC-shaped
  "///etc/passwd", // extra slashes
  "\\\\server\\share\\x.txt",
  "\\\\?\\C:\\Windows\\x.txt", // win32 device path
  "//server/share/x.txt",
  "C:\\Windows\\System32\\config",
  "c:/Windows/x.txt",
  "C:evil.txt", // drive-relative, no separator
  "church1/\0/x.txt" // NUL byte
];

test("ChurchAppsStorageProvider disk mode: every disk method rejects traversal keys", async () => {
  const provider = new ChurchAppsStorageProvider();
  const buf = Buffer.from("x");
  for (const key of traversalKeys) {
    const label = JSON.stringify(key);
    await assert.rejects(() => provider.store(key, "text/plain", buf), /Invalid storage key/, `store ${label}`);
    await assert.rejects(() => provider.remove(key), /Invalid storage key/, `remove ${label}`);
    await assert.rejects(() => provider.removeFolder(key), /Invalid storage key/, `removeFolder ${label}`);
    await assert.rejects(() => provider.list(key), /Invalid storage key/, `list ${label}`);
    await assert.rejects(() => provider.move(key, "church1/ok.txt"), /Invalid storage key/, `move from ${label}`);
    await assert.rejects(() => provider.move("church1/ok.txt", key), /Invalid storage key/, `move to ${label}`);
  }
  assert.equal(fs.existsSync(path.join(tmp, "etc")), false);
  assert.equal(fs.existsSync(path.join(tmp, "escape.txt")), false);
  assert.equal(fs.existsSync(path.join(tmp, "content-evil")), false);
});

test("ChurchAppsStorageProvider disk mode: leading and duplicate slashes stay inside content", async () => {
  const provider = new ChurchAppsStorageProvider();
  const buf = Buffer.from("x");
  const url = await provider.store("/church1/safe.txt", "text/plain", buf);
  assert.equal(url, "http://localhost:8084/content/church1/safe.txt");
  assert.equal(fs.readFileSync(path.join(tmp, "content", "church1", "safe.txt"), "utf8"), "x");

  await provider.store("church1//dupes.txt", "text/plain", buf);
  assert.equal(fs.readFileSync(path.join(tmp, "content", "church1", "dupes.txt"), "utf8"), "x");

  // A filesystem-looking key is contained, not honored: it lands under ./content, never at /etc.
  await provider.store("/etc/passwd", "text/plain", buf);
  assert.equal(fs.readFileSync(path.join(tmp, "content", "etc", "passwd"), "utf8"), "x");
  assert.equal(fs.existsSync(path.join(tmp, "etc")), false);
  await provider.remove("/etc/passwd");
  await provider.removeFolder("/etc");
  assert.equal(fs.existsSync(path.join(tmp, "content", "etc")), false);
});

test("ChurchAppsStorageProvider disk mode: move stays inside content", async () => {
  const provider = new ChurchAppsStorageProvider();
  await provider.move("/church1/dupes.txt", "/church1/moved.txt");
  assert.equal(fs.existsSync(path.join(tmp, "content", "church1", "dupes.txt")), false);
  assert.equal(fs.readFileSync(path.join(tmp, "content", "church1", "moved.txt"), "utf8"), "x");
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
