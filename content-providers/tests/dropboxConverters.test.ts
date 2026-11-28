import { test } from "node:test";
import assert from "node:assert/strict";

import { ManifestProvider } from "../src/manifest/ManifestProvider";
import dropboxManifest from "../src/manifests/providers/dropbox.json";

// Dropbox is defined by its JSON manifest; filterMediaEntries is one of its named functions.
type DropboxEntry = { ".tag": "file" | "folder"; id: string; name: string; path_lower: string; path_display: string; size?: number; is_downloadable?: boolean };
const dropbox = new ManifestProvider(dropboxManifest);
const filterMediaEntries = (entries: DropboxEntry[]) => dropbox.callFunction("filterMediaEntries", entries) as { folders: DropboxEntry[]; mediaFiles: DropboxEntry[] };

const file = (name: string): DropboxEntry => ({ ".tag": "file", id: "id:" + name, name, path_lower: "/" + name.toLowerCase(), path_display: "/" + name, size: 100, is_downloadable: true });
const folder = (name: string): DropboxEntry => ({ ".tag": "folder", id: "id:" + name, name, path_lower: "/" + name.toLowerCase(), path_display: "/" + name });

test("filterMediaEntries orders media files numeric-aware, not lexically", () => {
  const { mediaFiles } = filterMediaEntries([file("11 Closer.png"), file("2 Song.png"), file("01 Opener.png")]);
  assert.deepEqual(mediaFiles.map((f) => f.name), ["01 Opener.png", "2 Song.png", "11 Closer.png"]);
});

test("filterMediaEntries sorts folders independently of files and drops non-media files", () => {
  const { folders, mediaFiles } = filterMediaEntries([
    folder("10 Week"),
    folder("2 Week"),
    file("notes.txt"),
    file("3 Clip.mp4"),
    file("1 Clip.mp4")
  ]);
  assert.deepEqual(folders.map((f) => f.name), ["2 Week", "10 Week"]);
  assert.deepEqual(mediaFiles.map((f) => f.name), ["1 Clip.mp4", "3 Clip.mp4"]);
});
