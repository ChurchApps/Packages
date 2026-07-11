import { test } from "node:test";
import assert from "node:assert/strict";

import { filterMediaEntries } from "../src/providers/dropbox/DropboxConverters";
import { DropboxEntry } from "../src/providers/dropbox/DropboxInterfaces";

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
