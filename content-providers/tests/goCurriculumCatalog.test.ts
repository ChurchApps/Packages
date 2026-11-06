import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { GoCurriculumProvider, parseMemberships } from "../src/providers/goCurriculum/GoCurriculumProvider";
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

test("GoCurriculum reads tiers from active_memberships", () => {
  assert.deepEqual(parseMemberships({ active_memberships: ["ELEMENTARY [PREMIUM]", "Preschool [Video Plus]", "no brackets"] }),
    [{ group: "elementary", tier: "premium" }, { group: "preschool", tier: "videoplus" }]);
  assert.deepEqual(parseMemberships({ active_memberships: "ELEMENTARY [BASIC]" }), [{ group: "elementary", tier: "basic" }]);
  assert.deepEqual(parseMemberships({ memberpress: { active_memberships: [{ id: 5399, title: "ELEMENTARY [PREMIUM]" }], subscriptions: [] } }),
    [{ group: "elementary", tier: "premium" }]);
  assert.deepEqual(parseMemberships({}), []);
});

test("GoCurriculum hides tier-tagged playlist items from users without that tier", async () => {
  const topher = { title: "Topher Time", file: "topher.mp4", url: "https://feeds.test/topher.mp4", tiers: ["videoPlus", "premium", "platinum"] };
  const intro = { title: "Intro", file: "intro.mp4", url: "https://feeds.test/intro.mp4" };
  const tagged = { catalog: [{ id: "faith-lab", name: "Faith Lab", lessons: [{
    id: "lesson-1", name: "Lesson 1", playlist: [intro, topher],
    script: { sections: [{ name: "Opening", items: [{ type: "play", content: "Play Topher", files: [{ file: topher.file, url: topher.url }] }] }] }
  }] }] };
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    const token = new URLSearchParams(String(init?.body)).get("access_token");
    const memberships = { basic: ["ELEMENTARY [BASIC]"], premium: ["ELEMENTARY [PREMIUM]"], preschool: ["PRESCHOOL [PLATINUM]"], videoplus: ["ELEMENTARY [VIDEO PLUS]"] }[token as string] || [];
    return { ok: true, json: async () => ({ memberpress: { active_memberships: memberships.map((title, id) => ({ id, title })) } }) } as Response;
  }) as typeof fetch;
  try {
    const provider = new GoCurriculumProvider();
    provider.setCatalogLoader(async () => tagged);
    const as = (token: string) => ({ ...goAuth, access_token: token });
    const titles = async (token: string) => (await provider.getPlaylist("/elementary/faith-lab/lesson-1", as(token)))?.map(f => f.title);

    assert.deepEqual(await titles("basic"), ["Intro"]);
    assert.deepEqual(await titles("none"), ["Intro"]);
    assert.deepEqual(await titles("preschool"), ["Intro"], "a preschool membership doesn't unlock elementary");
    assert.deepEqual(await titles("premium"), ["Intro", "Topher Time"]);
    assert.deepEqual(await titles("videoplus"), ["Intro", "Topher Time"]);

    const basicGuide = await provider.getInstructions("/elementary/faith-lab/lesson-1", as("basic"));
    assert.equal(basicGuide?.items[0].children?.[0].children, undefined);
    const premiumGuide = await provider.getInstructions("/elementary/faith-lab/lesson-1", as("premium"));
    assert.equal(premiumGuide?.items[0].children?.[0].children?.[0].downloadUrl, topher.url);

    const basicCatalog = await provider.getCatalog("elementary", as("basic"));
    assert.deepEqual(basicCatalog?.catalog[0].lessons[0].playlist.map(p => p.title), ["Intro"]);
    assert.equal(tagged.catalog[0].lessons[0].playlist.length, 2, "the shared cached feed is not mutated");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("GoCurriculum maps Go's MemberPress product ids to tiers", () => {
  const ids = (...list: number[]) => parseMemberships({ memberpress: { active_memberships: list.map(id => ({ id, title: "unparseable" })) } });
  assert.deepEqual(ids(486), [{ group: "preschool", tier: "basic" }]);
  assert.deepEqual(ids(5398), [{ group: "preschool", tier: "premium" }]);
  assert.deepEqual(ids(485), [{ group: "elementary", tier: "basic" }]);
  assert.deepEqual(ids(5399), [{ group: "elementary", tier: "premium" }]);
  assert.deepEqual(ids(7467), [{ group: "preschool", tier: "videoplus" }]);
  assert.deepEqual(ids(7468), [{ group: "elementary", tier: "videoplus" }]);
  assert.deepEqual(ids(7466), [{ group: "preschool", tier: "platinum" }, { group: "elementary", tier: "platinum" }]);
  assert.deepEqual(ids(5401), [{ group: "preschool", tier: "basic" }, { group: "elementary", tier: "basic" }]);
  assert.deepEqual(ids(5402), [{ group: "preschool", tier: "premium" }, { group: "elementary", tier: "premium" }]);
  assert.deepEqual(parseMemberships({ memberpress: { active_memberships: [{ id: 1, title: "PRESCHOOL [PREMIUM]" }] } }), [{ group: "preschool", tier: "premium" }], "unknown ids fall back to the title");
});

// tests/fixtures/goCurriculumElementary.json is Go's sample Elementary export; every playlist item is tagged basic/premium/platinum
test("GoCurriculum gates Go's tier-tagged export by each test account's membership", async () => {
  const feed = JSON.parse(readFileSync(new URL("./fixtures/goCurriculumElementary.json", import.meta.url), "utf8"));
  const collection = feed.catalog[0];
  const lesson = collection.lessons[0];
  const all = lesson.playlist.map((p: { title: string }) => p.title);
  // the sample has no videoPlus items yet, so add one to cover the Topher Time Plus / JTS Plus accounts
  lesson.playlist.push({ title: "Video Plus Extra", file: "extra.mp4", mediaType: "video", url: "https://feeds.test/extra.mp4", tiers: ["videoPlus"] });
  // the test accounts Go set up for each product, keyed by their MemberPress id
  const accounts: Record<string, number> = { prebasic: 486, prepremium: 5398, elembasic: 485, elempremium: 5399, tophertime: 7467, jtsplus: 7468, platinum: 7466, basicbundle: 5401, premiumbundle: 5402 };
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    const id = accounts[new URLSearchParams(String(init?.body)).get("access_token") as string];
    return { ok: true, json: async () => ({ memberpress: { active_memberships: id ? [{ id, title: "" }] : [] } }) } as Response;
  }) as typeof fetch;
  try {
    const provider = new GoCurriculumProvider();
    provider.setCatalogLoader(async groupId => groupId === "elementary" ? feed : { catalog: [] });
    const titles = async (group: string, token: string) => (await provider.getPlaylist(`/${group}/${collection.id}/${lesson.id}`, { ...goAuth, access_token: token }))?.map(f => f.title) || [];
    const sees = async (group: string, tokens: string[]) => Object.fromEntries(await Promise.all(tokens.map(async t => [t, (await titles(group, t)).length])));

    assert.deepEqual(await sees("elementary", ["elembasic", "elempremium", "platinum", "basicbundle", "premiumbundle"]),
      { elembasic: all.length, elempremium: all.length, platinum: all.length, basicbundle: all.length, premiumbundle: all.length });
    assert.deepEqual(await sees("elementary", ["prebasic", "prepremium", "tophertime", "none"]), { prebasic: 0, prepremium: 0, tophertime: 0, none: 0 });
    assert.deepEqual(await titles("elementary", "jtsplus"), ["Video Plus Extra"], "JTS Plus unlocks elementary videoPlus items only");
  } finally {
    globalThis.fetch = realFetch;
  }
});
