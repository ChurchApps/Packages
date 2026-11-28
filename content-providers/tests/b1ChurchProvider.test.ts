import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { ManifestProvider } from "../src/manifest/ManifestProvider";
import b1Manifest from "../src/manifests/providers/b1church.json";
import { ContentProviderAuthData } from "../src/interfaces";

const auth: ContentProviderAuthData = { access_token: "b1-tok", refresh_token: "b1-rt", token_type: "Bearer", created_at: 0, expires_in: 3600, scope: "plans" };

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };

function mockFetch(handler: (url: string, body: any) => unknown): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    let parsed: unknown;
    try { parsed = init?.body ? JSON.parse(String(init.body)) : undefined; } catch { parsed = init?.body; }
    calls.push({ url: String(url), method: init?.method || "GET", headers: (init?.headers as Record<string, string>) || {}, body: parsed });
    const res = handler(String(url), parsed);
    if (res instanceof Response) return res;
    if (res === undefined) return new Response("{}", { status: 404 });
    return new Response(JSON.stringify(res), { status: 200 });
  }) as typeof fetch;
  return calls;
}

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00:00.000Z`;
};

test("B1.Church browses root → ministries → plan types → upcoming plans with Lessons.church & external thumbnails", async () => {
  const calls = mockFetch((url, body) => {
    if (url.endsWith("/membership/groups/tag/ministry")) return [{ id: "m1", name: "Kids", photoUrl: "https://x/kids.jpg" }];
    if (url.endsWith("/doing/planTypes/ministryId/m1")) return [{ id: "pt1", name: "Sunday Morning" }];
    if (url.endsWith("/doing/plans/types/pt1")) {
      return [
        { id: "p1", name: "LC Plan", serviceDate: tomorrow(), churchId: "ch1", contentId: "ven1" },
        { id: "p2", name: "Dropbox Plan", serviceDate: tomorrow(), churchId: "ch1", providerId: "dropbox", providerPlanId: "/sunday/week1" }
      ];
    }
    if (url.includes("/venues/public/images?ids=ven1")) return [{ venueId: "ven1", lessonImage: "https://x/lc-thumb.jpg" }];
    if (url.endsWith("/doing/providerProxy/browse") && body?.providerId === "dropbox") {
      return [{ type: "folder", id: "week1", title: "Week 1", path: "/sunday/week1", thumbnail: "https://x/db-thumb.jpg" }];
    }
    return undefined;
  });

  const p = new ManifestProvider(b1Manifest);
  const root = await p.browse("/", auth);
  assert.deepEqual(root.map(i => (i as any).path), ["/ministries"]);

  const ministries = await p.browse("/ministries", auth);
  assert.deepEqual(ministries.map(m => [m.id, m.title, m.thumbnail]), [["m1", "Kids", "https://x/kids.jpg"]]);
  assert.equal(calls[0].headers.Authorization, "Bearer b1-tok");

  const planTypes = await p.browse("/ministries/m1", auth);
  assert.deepEqual(planTypes.map(pt => [pt.id, (pt as any).path]), [["pt1", "/ministries/m1/pt1"]]);

  const plans = await p.browse("/ministries/m1/pt1", auth);
  assert.deepEqual(plans.map(pl => [pl.id, pl.thumbnail, (pl as any).isLeaf]), [
    ["p1", "https://x/lc-thumb.jpg", true],
    ["p2", "https://x/db-thumb.jpg", true]
  ]);
});

test("B1.Church getInstructions expands local Lessons.church sections and external provider items", async () => {
  mockFetch((url, body) => {
    if (url.endsWith("/doing/plans/types/pt1")) return [{ id: "p1", name: "Sunday", churchId: "ch1", contentId: "ven1" }];
    if (url.endsWith("/doing/planFeed/presenter/ch1/p1")) {
      return [
        { id: "s1", itemType: "lessonSection", relatedId: "sec1", label: "Opening" },
        { id: "ext1", itemType: "providerPresentation", label: "External Slide", providerId: "dropbox", providerPath: "/slides", providerContentPath: "0.0" },
        { id: "direct1", itemType: "providerFile", label: "Direct Link", link: "https://x/direct.mp4", seconds: 20 }
      ];
    }
    if (url.endsWith("/venues/public/actions/ven1")) {
      return { sections: [{ id: "sec1", name: "Opening", actions: [{ id: "act1", name: "Countdown", seconds: 60 }] }] };
    }
    if (url.endsWith("/venues/public/feed/ven1")) return { lessonImage: "https://x/lesson.jpg" };
    if (url.endsWith("/doing/providerProxy/getInstructions") && body?.providerId === "dropbox") {
      return {
        name: "Slides",
        items: [{ id: "sec", label: "Sec", children: [{ id: "a0", label: "Action", children: [{ id: "f0", itemType: "file", label: "Slide 1", downloadUrl: "https://x/s1.png" }] }] }]
      };
    }
    return undefined;
  });

  const p = new ManifestProvider(b1Manifest) as any;
  const instructions = await p.getInstructions("/ministries/m1/pt1/p1", auth);
  assert.equal(instructions.name, "Sunday");
  assert.equal(instructions.items.length, 3);
  assert.equal(instructions.items[0].children[0].id, "act1");
  assert.equal(instructions.items[0].children[0].children[0].downloadUrl, "https://lessons.church/embed/action/act1");
  assert.equal(instructions.items[0].children[0].children[0].thumbnail, "https://x/lesson.jpg");
  assert.equal(instructions.items[1].children[0].id, "f0");
  assert.equal(instructions.items[2].downloadUrl, "https://x/direct.mp4");
});

test("B1.Church setPairingData + getCurrentPlan resolves and orders files without wiping existing pairing", async () => {
  mockFetch((url) => {
    if (url.endsWith("/doing/plans/public/current/pt1")) {
      return { id: "p1", name: "This Sunday", serviceDate: "2026-11-29", churchId: "ch1", ministryId: "m1", providerId: "dropbox", providerPlanId: "/sunday" };
    }
    if (url.endsWith("/doing/planItems/presenter/ch1/p1")) {
      return [
        { id: "pi2", itemType: "action", relatedId: "a2", sort: 1 },
        { id: "pi1", itemType: "action", relatedId: "a1", sort: 2 }
      ];
    }
    if (url.endsWith("/doing/providerProxy/getInstructions")) {
      return {
        name: "Sunday",
        items: [
          { id: "a1", itemType: "action", label: "First", children: [{ id: "f1", itemType: "file", label: "One.mp4", downloadUrl: "https://x/1.mp4", thumbnail: "https://x/t1.jpg", seconds: 30 }] },
          { id: "a2", itemType: "action", label: "Second", children: [{ id: "f2", itemType: "file", label: "Two.png", downloadUrl: "https://x/2.png", seconds: 10 }] }
        ]
      };
    }
    return undefined;
  });

  const p = new ManifestProvider(b1Manifest) as any;
  assert.equal(await p.getCurrentPlan(auth), null, "returns null before pairing");

  // Call synchronously without await, matching the IProvider.setPairingData(data): void contract
  p.setPairingData({ planTypeId: "pt1" });
  p.setPairingData({ unrelated: true });

  const plan = await p.getCurrentPlan(auth);
  assert.equal(plan?.id, "p1");
  assert.equal(plan?.title, "This Sunday");
  assert.equal(plan?.thumbnail, "https://x/t1.jpg");
  assert.deepEqual(plan?.files.map((f: any) => f.id), ["f2", "f1"], "respects custom sort order from planItems");
});

test("B1.Church OAuth uses admin.b1.church/oauth and JSON token exchange (including secret helpers)", async () => {
  const calls = mockFetch(() => ({ access_token: "new-at", refresh_token: "new-rt", expires_in: 3600 }));
  const p = new ManifestProvider(b1Manifest) as any;

  const authUrl = p.buildAuthUrlFromChallenge("chal", "https://cb.example/auth", "st");
  assert.ok(authUrl.startsWith("https://admin.b1.church/oauth?"));

  const exchanged = await p.exchangeCodeForTokens("code1", "ver1", "https://cb.example/auth");
  assert.equal(exchanged?.access_token, "new-at");
  assert.equal(calls[0].headers["Content-Type"], "application/json");
  assert.deepEqual(calls[0].body, { grant_type: "authorization_code", code: "code1", redirect_uri: "https://cb.example/auth", client_id: "nsowldn58dk", code_verifier: "ver1" });

  const withSecret = await p.exchangeCodeForTokensWithSecret("code2", "https://cb.example/auth", "sec123");
  assert.equal(withSecret?.access_token, "new-at");
  assert.equal((calls[1].body as any).client_secret, "sec123");

  const refreshed = await p.refreshTokenWithSecret(auth, "sec123");
  assert.equal(refreshed?.access_token, "new-at");
  assert.equal((calls[2].body as any).grant_type, "refresh_token");
  assert.equal((calls[2].body as any).client_secret, "sec123");
});
