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
