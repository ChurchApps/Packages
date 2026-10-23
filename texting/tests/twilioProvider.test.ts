import { test } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";

import { TwilioProvider } from "../src/providers/twilio/TwilioProvider.js";
import { getProvider, getProviderInfo } from "../src/providers/index.js";

const config = { churchId: "church1", apiKey: "AC123", apiSecret: "token", fromNumber: "+12175550000" };
const provider = new TwilioProvider();

test("registered as twilio with key and secret required", () => {
  assert.ok(getProvider("Twilio") instanceof TwilioProvider);
  const info = getProviderInfo().find((p) => p.id === "twilio");
  assert.equal(info?.name, "Twilio");
  assert.equal(info?.requiresApiKey, true);
  assert.equal(info?.requiresSecret, true);
});

test("normalizeNumber produces E.164", () => {
  assert.equal(TwilioProvider.normalizeNumber("(217) 555-2502"), "+12175552502");
  assert.equal(TwilioProvider.normalizeNumber("1-217-555-2502"), "+12175552502");
  assert.equal(TwilioProvider.normalizeNumber("+44 20 7946 0958"), "+442079460958");
});

test("sendMessage posts form data with basic auth and From", async (t) => {
  const post = t.mock.method(axios, "post", async () => ({ data: { sid: "SM1" } }) as any);
  const result = await provider.sendMessage(config, "(217) 555-2502", "hi");
  assert.deepEqual(result, { success: true, providerMessageId: "SM1" });
  const [url, body, opts] = post.mock.calls[0].arguments as any[];
  assert.equal(url, "https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json");
  assert.equal(body.toString(), "To=%2B12175552502&Body=hi&From=%2B12175550000");
  assert.deepEqual(opts.auth, { username: "AC123", password: "token" });
});

test("sendMessage uses MessagingServiceSid when fromNumber starts with MG", async (t) => {
  const post = t.mock.method(axios, "post", async () => ({ data: { sid: "SM2" } }) as any);
  await provider.sendMessage({ ...config, fromNumber: "MGabc" }, "+12175552502", "hi");
  const body = (post.mock.calls[0].arguments as any[])[1] as URLSearchParams;
  assert.equal(body.get("MessagingServiceSid"), "MGabc");
  assert.equal(body.get("From"), null);
});

test("sendMessage maps a Twilio error body", async (t) => {
  t.mock.method(axios, "post", async () => { throw { response: { data: { code: 21211, message: "Invalid 'To' Phone Number" } }, message: "400" }; });
  const result = await provider.sendMessage(config, "123", "hi");
  assert.deepEqual(result, { success: false, error: "21211: Invalid 'To' Phone Number" });
});

test("sendBulk sends one request per recipient", async (t) => {
  let n = 0;
  const post = t.mock.method(axios, "post", async () => ({ data: { sid: "SM" + ++n } }) as any);
  const results = await provider.sendBulk(config, ["2175552502", "2175552503"], "hi");
  assert.deepEqual(results, [{ success: true, providerMessageId: "SM1" }, { success: true, providerMessageId: "SM2" }]);
  assert.equal(post.mock.callCount(), 2);
});

test("validateCredentials checks the account and requires all fields", async (t) => {
  const get = t.mock.method(axios, "get", async () => ({ status: 200, data: {} }) as any);
  assert.equal(await provider.validateCredentials(config), true);
  assert.equal((get.mock.calls[0].arguments as any[])[0], "https://api.twilio.com/2010-04-01/Accounts/AC123.json");
  assert.equal(await provider.validateCredentials({ ...config, fromNumber: "" }), false);
  assert.equal(await provider.validateCredentials({ ...config, apiSecret: "" }), false);
  assert.equal(get.mock.callCount(), 1);
});
