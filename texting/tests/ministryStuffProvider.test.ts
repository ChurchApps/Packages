import { test } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";

import { MinistryStuffProvider } from "../src/providers/ministryStuff/MinistryStuffProvider.js";
import { getProvider, getProviderInfo } from "../src/providers/index.js";

const config = { churchId: "church1", apiKey: "", apiSecret: "svc-key", baseUrl: "https://api.ministrystuff.org" };
const provider = new MinistryStuffProvider();

test("sendMessage posts churchId with service-key header and maps success", async (t) => {
  const post = t.mock.method(axios, "post", async () => ({ data: { success: true, providerMessageId: "m1" } }) as any);
  const result = await provider.sendMessage(config, "+15551234567", "hello");
  assert.deepEqual(result, { success: true, providerMessageId: "m1", error: undefined });
  const [url, body, opts] = post.mock.calls[0].arguments as any[];
  assert.equal(url, "https://api.ministrystuff.org/sms/send");
  assert.equal(body.churchId, "church1");
  assert.equal(opts.headers["X-Service-Key"], "svc-key");
});

test("sendBulk maps wholesale insufficient_credits onto every recipient", async (t) => {
  t.mock.method(axios, "post", async () => ({ data: { ok: false, reason: "insufficient_credits", remaining: 2 } }) as any);
  const results = await provider.sendBulk(config, ["+15551", "+15552", "+15553"], "hi");
  assert.equal(results.length, 3);
  for (const r of results) assert.deepEqual(r, { success: false, error: "insufficient_credits" });
});

test("sendBulk maps insufficient_credits from an HTTP error response", async (t) => {
  t.mock.method(axios, "post", async () => { throw { response: { data: { ok: false, reason: "insufficient_credits" } }, message: "402" }; });
  const results = await provider.sendBulk(config, ["+15551"], "hi");
  assert.deepEqual(results, [{ success: false, error: "insufficient_credits" }]);
});

test("sendBulk returns per-recipient results from the API", async (t) => {
  t.mock.method(axios, "post", async () => ({ data: { results: [{ success: true, providerMessageId: "a" }, { success: false, error: "opted_out" }] } }) as any);
  const results = await provider.sendBulk(config, ["+15551", "+15552"], "hi");
  assert.equal(results[0].success, true);
  assert.equal(results[1].error, "opted_out");
});

test("validateCredentials requires hasCredits === true", async (t) => {
  const get = t.mock.method(axios, "get", async () => ({ status: 200, data: { hasCredits: true, remaining: 500 } }) as any);
  assert.equal(await provider.validateCredentials(config), true);
  assert.match(get.mock.calls[0].arguments[0] as string, /\/check\/credits\?churchId=church1&creditType=texting$/);

  t.mock.method(axios, "get", async () => ({ status: 200, data: { hasCredits: false } }) as any);
  assert.equal(await provider.validateCredentials(config), false);

  t.mock.method(axios, "get", async () => { throw new Error("down"); });
  assert.equal(await provider.validateCredentials(config), false);
});

test("throws a clear error when no base url is configured", async () => {
  delete process.env.MINISTRYSTUFF_API_URL;
  const result = await provider.sendMessage({ ...config, baseUrl: undefined }, "+15551", "hi");
  assert.equal(result.success, false);
  assert.match(result.error!, /MINISTRYSTUFF_API_URL/);
});

test("registry exposes ministrystuff with keyless metadata", () => {
  assert.equal(getProvider("MinistryStuff").name, "MinistryStuff");
  const info = getProviderInfo().find((p) => p.id === "ministrystuff")!;
  assert.equal(info.requiresApiKey, false);
  assert.equal(info.requiresSecret, false);
  assert.equal(info.settingsUrl, "https://ministrystuff.org");
});

test("capabilities are declared unsupported and stubs answer accordingly", async () => {
  assert.deepEqual(provider.capabilities, { addSubscriber: false, getLists: false });
  assert.equal((await provider.addSubscriber(config, "+15551")).success, false);
  assert.equal((await provider.getLists(config)).success, false);
});
