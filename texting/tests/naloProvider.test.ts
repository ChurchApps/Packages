import { test } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";

import { NaloProvider } from "../src/providers/nalo/NaloProvider.js";
import { getProvider } from "../src/providers/index.js";

const config = { churchId: "church1", apiKey: "auth-key", apiSecret: "", fromNumber: "MyChurch" };
const provider = new NaloProvider();

test("registered as nalo", () => {
  assert.ok(getProvider("Nalo") instanceof NaloProvider);
});

test("normalizeNumber converts local Ghana numbers and strips formatting", () => {
  assert.equal(NaloProvider.normalizeNumber("024 407 1872"), "233244071872");
  assert.equal(NaloProvider.normalizeNumber("+233 24 407 1872"), "233244071872");
  assert.equal(NaloProvider.normalizeNumber("+1 (555) 123-4567"), "15551234567");
});

test("sendBulk posts one request with comma-joined msisdn and maps 1701 success", async (t) => {
  const post = t.mock.method(axios, "post", async () => ({ data: { status: "1701", job_id: "api.1", msisdn: "233244071872" } }) as any);
  const results = await provider.sendBulk(config, ["0244071872", "+233501371674"], "hi");
  assert.deepEqual(results, [{ success: true, providerMessageId: "api.1" }, { success: true, providerMessageId: "api.1" }]);
  assert.equal(post.mock.callCount(), 1);
  const [url, body] = post.mock.calls[0].arguments as any[];
  assert.equal(url, "https://sms.nalosolutions.com/smsbackend/Resl_Nalo/send-message/");
  assert.deepEqual(body, { key: "auth-key", msisdn: "233244071872,233501371674", message: "hi", sender_id: "MyChurch" });
});

test("sendMessage maps a 412 error code response", async (t) => {
  t.mock.method(axios, "post", async () => { throw { response: { data: { code: 1713, message: "Invalid auth key" } }, message: "412" }; });
  const result = await provider.sendMessage(config, "0244071872", "hi");
  assert.deepEqual(result, { success: false, error: "1713: Invalid auth key" });
});

test("validateCredentials requires key and sender id", async () => {
  assert.equal(await provider.validateCredentials(config), true);
  assert.equal(await provider.validateCredentials({ ...config, fromNumber: "" }), false);
});
