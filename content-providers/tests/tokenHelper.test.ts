import { test } from "node:test";
import assert from "node:assert/strict";
import { authIsExpired, toAuthData, TokenHelper } from "../src/helpers/TokenHelper";
import { ContentProviderAuthData, ContentProviderConfig } from "../src/interfaces";

function auth(partial: Partial<ContentProviderAuthData> = {}): ContentProviderAuthData {
  return {
    access_token: "at",
    refresh_token: "rt",
    token_type: "Bearer",
    created_at: Math.floor(Date.now() / 1000),
    expires_in: 3600,
    scope: "",
    ...partial
  };
}

test("authIsExpired: a 10s token is valid immediately after issue", () => {
  const now = 1_700_000_000_000;
  const a = auth({ created_at: Math.floor(now / 1000), expires_in: 10 });
  assert.equal(authIsExpired(a, now), false);
  assert.equal(authIsExpired(a, now + 8_000), false);
});

test("authIsExpired: a 10s token is expired after its lifetime", () => {
  const now = 1_700_000_000_000;
  const a = auth({ created_at: Math.floor(now / 1000), expires_in: 10 });
  assert.equal(authIsExpired(a, now + 11_000), true);
});

test("authIsExpired: 7-day token uses a 5-minute buffer, not more", () => {
  const now = 1_700_000_000_000;
  const a = auth({ created_at: Math.floor(now / 1000), expires_in: 7 * 24 * 3600 });
  const sixDays = now + 6 * 24 * 3600 * 1000;
  assert.equal(authIsExpired(a, sixDays), false);
  const afterTtl = now + (7 * 24 * 3600 + 1) * 1000;
  assert.equal(authIsExpired(a, afterTtl), true);
});

test("TokenHelper.refreshToken is single-flight per refresh_token", async () => {
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 30));
    return {
      ok: true,
      json: async () => ({ access_token: "new", refresh_token: "rt2", expires_in: 10, token_type: "Bearer" })
    };
  }) as typeof fetch;

  try {
    const helper = new TokenHelper();
    const config = { oauthBase: "https://example.test/oauth", clientId: "cid" } as ContentProviderConfig;
    const a = auth({ refresh_token: "same-rt", expires_in: 10 });
    const [one, two] = await Promise.all([helper.refreshToken(config, a), helper.refreshToken(config, a)]);
    assert.equal(calls, 1);
    assert.equal(one?.access_token, "new");
    assert.equal(two?.access_token, "new");
    assert.equal((one as { planTypeId?: string } | null)?.planTypeId, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TokenHelper.refreshToken preserves planTypeId from the incoming auth", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({ access_token: "new", expires_in: 10 })
  })) as typeof fetch;
  try {
    const helper = new TokenHelper();
    const config = { oauthBase: "https://example.test/oauth", clientId: "cid" } as ContentProviderConfig;
    const incoming = { ...auth(), planTypeId: "pt1" } as ContentProviderAuthData & { planTypeId: string };
    const result = await helper.refreshToken(config, incoming);
    assert.equal((result as { planTypeId?: string })?.planTypeId, "pt1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("toAuthData still maps plan_type_id", () => {
  const mapped = toAuthData({ access_token: "at", expires_in: 10, plan_type_id: "pt" });
  assert.equal(mapped.planTypeId, "pt");
});
