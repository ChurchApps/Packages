import { test } from "node:test";
import assert from "node:assert/strict";

import { UniqueIdHelper } from "../src/UniqueIdHelper";

test("isMissing treats null, undefined, and empty string as missing", () => {
  assert.equal(UniqueIdHelper.isMissing(null), true);
  assert.equal(UniqueIdHelper.isMissing(undefined), true);
  assert.equal(UniqueIdHelper.isMissing(""), true);
  assert.equal(UniqueIdHelper.isMissing("0"), false);
  assert.equal(UniqueIdHelper.isMissing(0), false); // (0).toString() === "0", not ""
  assert.equal(UniqueIdHelper.isMissing("abc"), false);
});

test("shortId generates an 11-char string from the url-safe char set", () => {
  const id = UniqueIdHelper.shortId();
  assert.equal(id.length, 11);
  assert.match(id, /^[A-Za-z0-9\-_]{11}$/);
});

test("generateAlphanumeric generates an 11-char alphanumeric-only string", () => {
  const id = UniqueIdHelper.generateAlphanumeric();
  assert.equal(id.length, 11);
  assert.match(id, /^[A-Za-z0-9]{11}$/);
});

test("generate builds a string of the requested length from the given char list", () => {
  const result = UniqueIdHelper.generate(["x"], 5);
  assert.equal(result, "xxxxx");
  assert.equal(UniqueIdHelper.generate(["a", "b"], 0), "");
});
