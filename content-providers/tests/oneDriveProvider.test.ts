import { test } from "node:test";
import assert from "node:assert/strict";

import { OneDriveProvider } from "../src/providers/onedrive";
import { ContentProviderAuthData } from "../src/interfaces";

const auth: ContentProviderAuthData = { access_token: "at", refresh_token: "rt", token_type: "Bearer", created_at: 0, expires_in: 3600, scope: "" };
const GRAPH = "https://graph.microsoft.com/v1.0";

test("browse pages through children, keeps folders + media, and hands out stable /content urls", async () => {
  const requests: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: unknown) => {
    requests.push(String(url));
    const body = requests.length === 1
      ? { value: [{ id: "F!1", name: "Week 1", folder: { childCount: 2 } }, { id: "V!2", name: "Opener.mp4", file: { mimeType: "video/mp4" }, thumbnails: [{ medium: { url: "https://t/1.jpg" } }] }], "@odata.nextLink": `${GRAPH}/me/drive/items/P!9/children?$skiptoken=abc` }
      : { value: [{ id: "A!3", name: "Song.mp3", file: { mimeType: "application/octet-stream" } }, { id: "D!4", name: "Notes.docx", file: { mimeType: "application/msword" } }] };
    return { ok: true, json: async () => body } as Response;
  }) as typeof fetch;
  try {
    const items = await new OneDriveProvider().browse("/P!9", auth);
    assert.equal(requests[0], `${GRAPH}/me/drive/items/P!9/children?$top=999&$expand=thumbnails`);
    assert.equal(requests[1], `${GRAPH}/me/drive/items/P!9/children?$skiptoken=abc`);
    assert.deepEqual(items.map(i => [i.type, i.id]), [["folder", "F!1"], ["file", "V!2"], ["file", "A!3"]]);
    assert.equal((items[0] as any).path, "/F!1");
    const video = items[1] as any;
    assert.equal(video.mediaType, "video");
    assert.equal(video.url, `${GRAPH}/me/drive/items/V!2/content`);
    assert.equal(video.thumbnail, "https://t/1.jpg");
    assert.equal((items[2] as any).mediaType, "audio");

    requests.length = 0;
    await new OneDriveProvider().browse("", auth);
    assert.equal(requests[0], `${GRAPH}/me/drive/root/children?$top=999&$expand=thumbnails`);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("auth url targets the Microsoft common endpoint with offline_access", () => {
  const url = new URL(new OneDriveProvider().buildAuthUrlFromChallenge("chal", "https://api/relay", "sess"));
  assert.equal(url.origin + url.pathname, "https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  assert.ok(url.searchParams.get("scope")!.includes("offline_access"));
  assert.equal(url.searchParams.get("state"), "sess");
});
