import { test } from "node:test";
import assert from "node:assert/strict";

import { GoogleDriveProvider } from "../src/providers/googledrive";
import { ContentProviderAuthData } from "../src/interfaces";

const auth: ContentProviderAuthData = { access_token: "at", refresh_token: "rt", token_type: "Bearer", created_at: 0, expires_in: 3600, scope: "" };

const listing = {
  files: [
    { id: "folderA", name: "Week 2", mimeType: "application/vnd.google-apps.folder" },
    { id: "folderB", name: "Week 10", mimeType: "application/vnd.google-apps.folder" },
    { id: "vid1", name: "Opener.mp4", mimeType: "video/mp4", thumbnailLink: "https://x/t.jpg", webContentLink: "https://drive.example/dl?id=vid1" },
    { id: "img1", name: "Slide", mimeType: "image/png" },
    { id: "doc1", name: "Notes", mimeType: "application/vnd.google-apps.document" }
  ]
};
const subfolderListing = { files: [{ id: "sub1", name: "Inner", mimeType: "application/vnd.google-apps.folder", parents: ["folderA"] }] };

function mockFetch(handler: (url: string) => unknown) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: unknown) => {
    const body = handler(String(url));
    return { ok: true, json: async () => body } as Response;
  }) as typeof fetch;
  return () => { globalThis.fetch = realFetch; };
}

test("browse maps folders (with leaf detection) and media files, dropping non-media", async () => {
  const requests: string[] = [];
  const restore = mockFetch((url) => {
    requests.push(url);
    return new URL(url).searchParams.get("q")?.includes("mimeType=") ? subfolderListing : listing;
  });
  try {
    const items = await new GoogleDriveProvider().browse("/parent1", auth);

    assert.equal(new URL(requests[0]).searchParams.get("q"), "'parent1' in parents and trashed=false");
    assert.deepEqual(items.map(i => [i.type, i.id]), [["folder", "folderA"], ["folder", "folderB"], ["file", "vid1"], ["file", "img1"]]);

    const [folderA, folderB] = items as any[];
    assert.equal(folderA.path, "/folderA");
    assert.equal(folderA.isLeaf, false);
    assert.equal(folderB.isLeaf, true);

    const video = items[2] as any;
    assert.equal(video.mediaType, "video");
    assert.equal(video.url, "https://drive.example/dl?id=vid1");
    assert.equal(video.thumbnail, "https://x/t.jpg");

    const image = items[3] as any;
    assert.equal(image.mediaType, "image");
    assert.equal(image.url, "https://drive.google.com/uc?id=img1&export=download");
  } finally {
    restore();
  }
});

test("browse treats empty path as root and rejects malformed folder ids without a request", async () => {
  const requests: string[] = [];
  const restore = mockFetch((url) => { requests.push(url); return { files: [] }; });
  try {
    await new GoogleDriveProvider().browse(null, auth);
    assert.ok(new URL(requests[0]).searchParams.get("q")?.includes("'root' in parents"));

    requests.length = 0;
    const items = await new GoogleDriveProvider().browse("/x' or 'a", auth);
    assert.deepEqual(items, []);
    assert.equal(requests.length, 0);
  } finally {
    restore();
  }
});

test("getPlaylist returns media files for a folder and null at root or when empty", async () => {
  const restore = mockFetch(() => listing);
  try {
    const provider = new GoogleDriveProvider();
    const files = await provider.getPlaylist("/parent1", auth);
    assert.deepEqual(files?.map(f => f.id), ["vid1", "img1"]);
    assert.equal(await provider.getPlaylist("/", auth), null);
  } finally {
    restore();
  }

  const restoreEmpty = mockFetch(() => ({ files: [] }));
  try {
    assert.equal(await new GoogleDriveProvider().getPlaylist("/parent1", auth), null);
  } finally {
    restoreEmpty();
  }
});

test("auth url points at Google consent with offline access and drive.readonly scope", () => {
  const url = new GoogleDriveProvider().buildAuthUrlFromChallenge("challenge123", "https://cb.example/x", "state1");
  assert.ok(url.startsWith("https://accounts.google.com/o/oauth2/v2/auth?"));
  const params = new URL(url).searchParams;
  assert.equal(params.get("access_type"), "offline");
  assert.equal(params.get("prompt"), "consent");
  assert.equal(params.get("scope"), "https://www.googleapis.com/auth/drive.readonly");
  assert.equal(params.get("code_challenge"), "challenge123");
  assert.equal(params.get("code_challenge_method"), "S256");
  assert.equal(params.get("state"), "state1");
});
