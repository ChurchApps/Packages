import { test } from "node:test";
import assert from "node:assert/strict";

import { SignPresenterProvider } from "../src/providers/signPresenter";
import { ContentProviderAuthData } from "../src/interfaces";

const auth: ContentProviderAuthData = { access_token: "at", refresh_token: "rt", token_type: "Bearer", created_at: 0, expires_in: 3600, scope: "" };

const playlists = [
  { id: "99", name: "Announcements", image: "https://x/announcements.jpg" },
  { id: "100", name: "Lobby Loop" }
];

const v2Playlist = {
  id: "99",
  name: "Announcements",
  messages: [
    { name: "Welcome", thumbnail: "https://x/welcome-thumb.jpg", slides: [{ seconds: 10, type: "image", data: { url: "https://x/welcome.png" } }] },
    { name: "Sermon Clip", thumbnail: "https://x/clip-thumb.jpg", slides: [{ seconds: 30, type: "video", data: { url: "https://x/clip.mp4", loop: true } }] },
    { name: "Live Feed", slides: [{ seconds: 60, type: "stream", data: { url: "https://stream.mux.com/abc123.m3u8" } }] },
    { name: "Countdown", slides: [{ seconds: 5, type: "web", data: { url: "https://x/countdown.gif" } }] },
    { name: "Website", slides: [{ seconds: 5, type: "web", data: { url: "https://example.com/page" } }] },
    { name: "Bulletin", slides: [{ seconds: 5, type: "pdf", data: { url: "https://x/bulletin.pdf" } }] },
    { name: "Custom Html", slides: [{ seconds: 5, type: "html", data: { url: "https://x/custom.html" } }] },
    { name: "Zones", slides: [{ seconds: 5, type: "multi_zone", data: {} }] },
    {
      name: "Gallery",
      thumbnail: "https://x/gallery-thumb.jpg",
      slides: [
        { seconds: 8, type: "image", data: { url: "https://x/gallery1.jpg" } },
        { seconds: 8, type: "image", data: { url: "https://x/gallery2.jpg" } }
      ]
    }
  ]
};

const legacyMessages = {
  messages: [
    { id: "m1", name: "Has Url", url: "https://x/a.mp4", seconds: 12 },
    { id: "m2", name: "Thumb Only", url: "", thumbnail: " https://x/thumb.jpg " },
    { id: "m3", name: "Image Only", image: "https://x/image.png" },
    { id: "m4", name: "Empty", url: "  " }
  ]
};

function mockFetch(handler: (url: string) => unknown) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: unknown) => {
    const body = handler(String(url));
    if (body === null) return { ok: false, status: 404, statusText: "Not Found", text: async () => "" } as Response;
    return { ok: true, json: async () => body } as Response;
  }) as typeof fetch;
  return () => { globalThis.fetch = realFetch; };
}

test("browse root returns the playlists folder without a network request", async () => {
  const requests: string[] = [];
  const restore = mockFetch((url) => { requests.push(url); return []; });
  try {
    const items = await new SignPresenterProvider().browse(null, auth);
    assert.deepEqual(items, [{ type: "folder", id: "playlists-root", title: "Playlists", path: "/playlists" }]);
    assert.equal(requests.length, 0);
  } finally {
    restore();
  }
});

test("browse /playlists lists leaf folders from /content/playlists (array and wrapper shapes)", async () => {
  for (const body of [playlists, { playlists }]) {
    const requests: string[] = [];
    const restore = mockFetch((url) => { requests.push(url); return body; });
    try {
      const items = await new SignPresenterProvider().browse("/playlists", auth);
      assert.equal(requests[0], "https://api.signpresenter.com/content/playlists");
      assert.deepEqual(items.map(i => [i.type, i.id, i.path, (i as any).isLeaf]), [["folder", "99", "/playlists/99", true], ["folder", "100", "/playlists/100", true]]);
      assert.equal(items[0].thumbnail, "https://x/announcements.jpg");
    } finally {
      restore();
    }
  }
});

test("browse a playlist maps V2 slides to media files, skipping non-playable slide types", async () => {
  const requests: string[] = [];
  const restore = mockFetch((url) => { requests.push(url); return v2Playlist; });
  try {
    const files = await new SignPresenterProvider().browse("/playlists/99", auth) as any[];

    assert.equal(requests[0], "https://api.signpresenter.com/v2/playlists/99");
    // Generic web, pdf, html, and multi_zone slides are dropped; the gallery message yields one file per slide
    assert.deepEqual(files.map(f => [f.id, f.mediaType]), [
      ["99-0-0", "image"],
      ["99-1-0", "video"],
      ["99-2-0", "video"],
      ["99-3-0", "image"],
      ["99-8-0", "image"],
      ["99-8-1", "image"]
    ]);

    const [image, video, stream, webGif] = files;
    assert.equal(image.title, "Welcome");
    assert.equal(image.url, "https://x/welcome.png");
    assert.equal(image.downloadUrl, "https://x/welcome.png");
    assert.equal(image.thumbnail, "https://x/welcome-thumb.jpg");
    assert.equal(image.seconds, 10);

    assert.equal(video.url, "https://x/clip.mp4");
    assert.equal(video.loop, true);
    assert.equal(video.seconds, 30);

    assert.equal(stream.url, "https://stream.mux.com/abc123.m3u8");
    assert.equal(webGif.url, "https://x/countdown.gif");

    assert.deepEqual(files.slice(4).map(f => f.title), ["Gallery", "Gallery"]);
  } finally {
    restore();
  }
});

test("falls back to /content/playlists/:id/messages when V2 is empty or missing", async () => {
  for (const v2Body of [null, { id: "99", name: "Announcements", messages: [] }]) {
    const requests: string[] = [];
    const restore = mockFetch((url) => {
      requests.push(url);
      return url.includes("/v2/") ? v2Body : legacyMessages;
    });
    try {
      const files = await new SignPresenterProvider().browse("/playlists/99", auth) as any[];

      assert.equal(requests[0], "https://api.signpresenter.com/v2/playlists/99");
      assert.equal(requests[1], "https://api.signpresenter.com/content/playlists/99/messages");
      // Messages fall back from url to thumbnail to image; ones with no usable url at all are skipped
      assert.deepEqual(files.map(f => [f.id, f.url, f.mediaType]), [
        ["m1", "https://x/a.mp4", "video"],
        ["m2", "https://x/thumb.jpg", "image"],
        ["m3", "https://x/image.png", "image"]
      ]);
      assert.equal(files[0].seconds, 12);
      assert.equal(files[0].downloadUrl, "https://x/a.mp4");
    } finally {
      restore();
    }
  }
});

test("getPlaylist returns files for a playlist path and null above it", async () => {
  const restore = mockFetch(() => v2Playlist);
  try {
    const provider = new SignPresenterProvider();
    const files = await provider.getPlaylist("/playlists/99", auth);
    assert.equal(files?.length, 6);
    assert.equal(await provider.getPlaylist("/playlists", auth), null);
  } finally {
    restore();
  }
});

test("getInstructions wraps playlist files in a header and section via filesToInstructions", async () => {
  const restore = mockFetch((url) => (url.includes("/v2/") ? v2Playlist : playlists));
  try {
    const instructions = await new SignPresenterProvider().getInstructions("/playlists/99", auth);

    assert.equal(instructions?.name, "Announcements");
    const [header] = instructions!.items;
    assert.equal(header.itemType, "header");
    assert.equal(header.label, "Announcements");

    const [section] = header.children!;
    assert.equal(section.itemType, "section");
    assert.equal(section.children?.length, 6);

    const action = section.children![0];
    assert.equal(action.itemType, "action");
    assert.equal(action.actionType, "play");
    const file = action.children![0];
    assert.equal(file.itemType, "file");
    assert.equal(file.downloadUrl, "https://x/welcome.png");
    assert.equal(file.mediaType, "image");
  } finally {
    restore();
  }
});
