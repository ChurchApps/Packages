import { test } from "node:test";
import assert from "node:assert/strict";

import { GoCurriculumProvider } from "../src/providers/goCurriculum/GoCurriculumProvider";
import { ContentProviderAuthData } from "../src/interfaces";
import { setProviderSecret } from "../src/helpers/ProviderSecrets";

const ELEMENTARY = "https://feeds.test/elementary.json";
const PRESCHOOL = "https://feeds.test/preschool.json";
setProviderSecret("gocurriculumFeeds", JSON.stringify({ elementary: ELEMENTARY, preschool: PRESCHOOL }));
const catalog = { catalog: [{ id: "faith-lab", name: "Faith Lab", lessons: [] }] };
const goAuth = { access_token: "at", refresh_token: "rt", token_type: "Bearer", created_at: 0, expires_in: 3600, scope: "basic" } as ContentProviderAuthData;

// records every feed fetch; oauth/me always verifies
function mockFetch(feed: (url: string) => { ok: boolean, json?: unknown }) {
  const realFetch = globalThis.fetch;
  const dropboxCalls: string[] = [];
  globalThis.fetch = (async (url: unknown) => {
    const u = String(url);
    if (u.includes("gocurriculum.com/oauth/me")) return { ok: true, json: async () => ({}) } as Response;
    dropboxCalls.push(u);
    const res = feed(u);
    return { ok: res.ok, json: async () => res.json } as Response;
  }) as typeof fetch;
  return { dropboxCalls, restore: () => { globalThis.fetch = realFetch; } };
}

test("GoCurriculum retries the catalog while a feed is still missing", async () => {
  const { dropboxCalls, restore } = mockFetch((url) => url.includes(PRESCHOOL) ? { ok: false } : { ok: true, json: catalog });
  try {
    const provider = new GoCurriculumProvider();
    const first = await provider.browse("/elementary", goAuth);
    assert.ok(first.some(i => i.title === "Faith Lab"));
    dropboxCalls.length = 0;
    const second = await provider.browse("/elementary", goAuth);
    assert.ok(second.some(i => i.title === "Faith Lab"));
    assert.ok(dropboxCalls.some(u => u.includes(ELEMENTARY)), "elementary feed should be refetched while preschool is missing");
  } finally {
    restore();
  }
});

test("GoCurriculum caches the catalog once every feed has loaded", async () => {
  const { dropboxCalls, restore } = mockFetch(() => ({ ok: true, json: catalog }));
  try {
    const provider = new GoCurriculumProvider();
    const first = await provider.browse("/elementary", goAuth);
    assert.ok(first.some(i => i.title === "Faith Lab"));
    dropboxCalls.length = 0;
    const second = await provider.browse("/elementary", goAuth);
    assert.ok(second.some(i => i.title === "Faith Lab"));
    assert.deepEqual(dropboxCalls, []);
  } finally {
    restore();
  }
});

test("GoCurriculum fetches nothing without configured feeds or a loader", async () => {
  setProviderSecret("gocurriculumFeeds", "");
  const { dropboxCalls, restore } = mockFetch(() => ({ ok: true, json: catalog }));
  try {
    const provider = new GoCurriculumProvider();
    assert.deepEqual(await provider.browse("/elementary", goAuth), []);
    assert.deepEqual(dropboxCalls, []);
  } finally {
    restore();
    setProviderSecret("gocurriculumFeeds", JSON.stringify({ elementary: ELEMENTARY, preschool: PRESCHOOL }));
  }
});

test("GoCurriculum uses the host catalog loader", async () => {
  const { dropboxCalls, restore } = mockFetch(() => ({ ok: false }));
  try {
    const provider = new GoCurriculumProvider();
    const groups: string[] = [];
    provider.setCatalogLoader(async (groupId, auth) => { groups.push(`${groupId}:${auth.access_token}`); return catalog; });
    const items = await provider.browse("/preschool", goAuth);
    assert.ok(items.some(i => i.title === "Faith Lab"));
    assert.deepEqual(groups.sort(), ["elementary:at", "preschool:at"]);
    assert.deepEqual(dropboxCalls, []);
    assert.equal(await provider.getCatalog("preschool", null), null);
  } finally {
    restore();
  }
});

test("GoCurriculum turns the Large and Small Group guides into instructions", async () => {
  const video = { file: "intro.mp4", url: "https://feeds.test/intro.mp4", mediaType: "video", seconds: 30 };
  const guided = { catalog: [{ id: "faith-lab", name: "Faith Lab", lessons: [{
    id: "lesson-1", name: "Lesson 1",
    playlist: [{ title: "Intro Video", ...video }],
    script: { sections: [{ name: "Opening", role: "lesson", items: [{ type: "play", content: "Play intro", files: [video] }, { type: "say", content: "*Welcome* everyone!" }] }] },
    smallGroup: { sections: [{ name: "Story Questions", role: "lesson", items: [{ type: "do", content: "Ask the questions." }] }] }
  }] }] };
  const { restore } = mockFetch(() => ({ ok: false }));
  try {
    const provider = new GoCurriculumProvider();
    provider.setCatalogLoader(async () => guided);

    const lessons = await provider.browse("/elementary/faith-lab", goAuth);
    assert.deepEqual(lessons.map(l => l.path), ["/elementary/faith-lab/small-group", "/elementary/faith-lab/lesson-1"]);
    assert.deepEqual((await provider.browse("/elementary/faith-lab/small-group", goAuth)).map(l => l.path), ["/elementary/faith-lab/small-group/lesson-1"]);

    const lg = await provider.getInstructions("/elementary/faith-lab/lesson-1", goAuth);
    const opening = lg?.items[0];
    assert.equal(opening?.itemType, "section");
    assert.equal(opening?.label, "Opening");
    const [play, say] = opening?.children || [];
    assert.equal(play.actionType, "play");
    assert.equal(play.children?.[0].downloadUrl, video.url);
    assert.equal(play.children?.[0].label, "Intro Video");
    assert.equal(say.actionType, "say");
    assert.equal(say.label, "Welcome everyone!");
    assert.equal(say.content, "*Welcome* everyone!");

    const sg = await provider.getInstructions("/elementary/faith-lab/small-group/lesson-1", goAuth);
    assert.equal(sg?.items[0].label, "Story Questions");
    assert.equal(sg?.items[0].children?.[0].actionType, "do");
    assert.equal(await provider.getPlaylist("/elementary/faith-lab/small-group", goAuth), null);
  } finally {
    restore();
  }
});
