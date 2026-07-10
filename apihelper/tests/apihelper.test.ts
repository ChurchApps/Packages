import { test } from "node:test";
import assert from "node:assert/strict";

import { SlugHelper } from "../src/helpers/SlugHelper";
import { OmitEmpty } from "../src/helpers/OmitEmpty";
import { EncryptionHelper } from "../src/helpers/EncryptionHelper";
import { EnvironmentBase } from "../src/helpers/EnvironmentBase";
import { BasePermissions } from "../src/helpers/BasePermissions";
import { MySqlHelper } from "../src/helpers/MySqlHelper";
import { Principal } from "../src/auth/Principal";

test("SlugHelper.slugifyString strips default stop-words, dashifies and lowercases", () => {
  assert.equal(SlugHelper.slugifyString("The Quick Brown Fox"), "-quick-brown-fox");
  assert.equal(SlugHelper.slugifyString("A Tale of Two Cities"), "-tale-of-two-cities");
  assert.equal(SlugHelper.slugifyString("Simple Title"), "simple-title");
});

test("SlugHelper.slugifyString honours a custom removeCharacters list", () => {
  assert.equal(SlugHelper.slugifyString("Simple Title", ["title"]), "simple-");
  // Custom list means the built-in stop-words ("the") are no longer stripped.
  assert.equal(SlugHelper.slugifyString("The Big Idea", ["idea"]), "the-big-");
});

test("SlugHelper.numerifySlug collapses runs of digits (and dash-joined digit groups) to their first character", () => {
  assert.equal(SlugHelper.numerifySlug("chapter-123-verse"), "chapter-1-verse");
  // The whole dash-joined run "2024-01-02" is treated as a single match and collapsed to its first character.
  assert.equal(SlugHelper.numerifySlug("2024-01-02"), "2");
  assert.equal(SlugHelper.numerifySlug("no-digits-here"), "no-digits-here");
  assert.equal(SlugHelper.numerifySlug("id5"), "id5");
});

test("OmitEmpty.omitEmpty drops null/undefined/empty-string fields but keeps zero and false", () => {
  const result = OmitEmpty.omitEmpty({ a: "", b: null, c: undefined, d: 0, e: false, f: "keep" }) as Record<string, unknown>;
  assert.deepEqual(result, { d: 0, e: false, f: "keep" });
});

test("OmitEmpty.omitEmpty recurses into nested objects and drops empty-array/object leaves by default rules", () => {
  const result = OmitEmpty.omitEmpty({ nested: { x: "", y: "keep" }, emptyObj: {}, list: ["a", ""] }) as Record<string, unknown>;
  assert.deepEqual(result, { nested: { y: "keep" }, list: ["a"] });
});

test("OmitEmpty.omitEmpty honours omitZero and omitEmptyArray options", () => {
  const withZero = OmitEmpty.omitEmpty({ a: 0, b: 1 }, { omitZero: true }) as Record<string, unknown>;
  assert.deepEqual(withZero, { b: 1 });

  const withEmptyArray = OmitEmpty.omitEmpty({ a: [], b: [1] }, { omitEmptyArray: true }) as Record<string, unknown>;
  assert.deepEqual(withEmptyArray, { b: [1] });

  // Without omitEmptyArray, an empty array is preserved as-is (not considered "empty").
  const withoutOption = OmitEmpty.omitEmpty({ a: [] }) as Record<string, unknown>;
  assert.deepEqual(withoutOption, { a: [] });
});

test("OmitEmpty.omitEmpty respects excludedProperties and returns {} for a fully-empty object", () => {
  const excluded = OmitEmpty.omitEmpty({ secret: "", keepMe: "" }, { excludedProperties: ["secret"] }) as Record<string, unknown>;
  assert.deepEqual(excluded, {});

  assert.deepEqual(OmitEmpty.omitEmpty({ a: null, b: "" }), {});
});

test("EncryptionHelper.encrypt/decrypt round-trips a plaintext value", () => {
  EnvironmentBase.encryptionKey = "12345678901234567890123456789012"; // 32 bytes for aes-256-ctr
  const plain = "hello world, this is a secret!";
  const encrypted = EncryptionHelper.encrypt(plain);
  assert.notEqual(encrypted, plain);
  assert.ok(encrypted.includes("|"));
  assert.equal(EncryptionHelper.decrypt(encrypted), plain);
});

test("EncryptionHelper.encrypt produces a fresh IV (and thus different ciphertext) each call", () => {
  EnvironmentBase.encryptionKey = "12345678901234567890123456789012";
  const a = EncryptionHelper.encrypt("same-input");
  const b = EncryptionHelper.encrypt("same-input");
  assert.notEqual(a, b);
  assert.equal(EncryptionHelper.decrypt(a), "same-input");
  assert.equal(EncryptionHelper.decrypt(b), "same-input");
});

test("EncryptionHelper.decrypt returns an empty string for a malformed (non-piped) payload", () => {
  EnvironmentBase.encryptionKey = "12345678901234567890123456789012";
  assert.equal(EncryptionHelper.decrypt("not-a-valid-payload"), "");
});

test("BasePermissions exposes the expected static contentType/action pairs", () => {
  assert.deepEqual(BasePermissions.forms.admin, { contentType: "Forms", action: "Admin" });
  assert.deepEqual(BasePermissions.forms.edit, { contentType: "Forms", action: "Edit" });
  assert.deepEqual(BasePermissions.links.edit, { contentType: "Links", action: "Edit" });
  assert.deepEqual(BasePermissions.pages.edit, { contentType: "Pages", action: "Edit" });
  assert.deepEqual(BasePermissions.settings.edit, { contentType: "Settings", action: "Edit" });
});

test("MySqlHelper.toQuotedAndCommaSeparatedString quotes/joins values and returns '' for an empty list", () => {
  assert.equal(MySqlHelper.toQuotedAndCommaSeparatedString([]), "");
  assert.equal(MySqlHelper.toQuotedAndCommaSeparatedString(["abc"]), "'abc'");
  assert.equal(MySqlHelper.toQuotedAndCommaSeparatedString(["a", "b", "c"]), "'a','b','c'");
});

test("Principal.isAuthenticated always resolves true", async () => {
  const principal = new Principal({ id: "u1" });
  assert.equal(await principal.isAuthenticated(), true);
});

// Suspicious: isResourceOwner ignores principal.details entirely and just compares the
// argument against the hard-coded literal 1111 (src/auth/Principal.ts:31) — looks like
// unfinished/stub logic rather than a real ownership check.
test("Principal.isResourceOwner only ever matches the hard-coded id 1111, regardless of principal details", async () => {
  const principal = new Principal({ id: "1111" });
  assert.equal(await principal.isResourceOwner(1111), true);
  assert.equal(await principal.isResourceOwner("1111"), false);
  assert.equal(await principal.isResourceOwner(2222), false);
});

// Suspicious: isInRole ignores principal.details.permissions/roles and just checks the
// literal string "admin" against the requested role (src/auth/Principal.ts:35) — looks
// like unfinished/stub logic rather than a real role check.
test("Principal.isInRole only ever matches the literal role string 'admin'", async () => {
  const principal = new Principal({ permissions: ["admin", "editor"] });
  assert.equal(await principal.isInRole("admin"), true);
  assert.equal(await principal.isInRole("editor"), false);
});
