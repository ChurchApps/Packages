import { test } from "node:test";
import assert from "node:assert/strict";

import { buildS3UploadPolicy, DEFAULT_CONTENT_TYPE, isAllowedContentType, MAX_UPLOAD_BYTES, s3ObjectAcl } from "../src/helpers/S3UploadPolicy";

test("buildS3UploadPolicy makes an unlisted type private instead of throwing", () => {
  const doc = buildS3UploadPolicy({ key: "church1/files/notes.docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  assert.equal(doc.acl, undefined);
  assert.equal(doc.contentType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.deepEqual(doc.conditions[0], ["eq", "$Content-Type", doc.contentType]);
  assert.ok(!doc.conditions.some((c) => !Array.isArray(c) && c.acl));

  const html = buildS3UploadPolicy({ key: "x.html", contentType: "text/html" });
  assert.equal(html.acl, undefined);
  assert.equal(html.contentType, "text/html");
});

test("buildS3UploadPolicy falls back to a private default when no type can be resolved", () => {
  for (const policy of [buildS3UploadPolicy({ key: "church1/files/payload.bin", contentType: "" }), buildS3UploadPolicy({ key: "church1/files/payload" })]) {
    assert.equal(policy.contentType, DEFAULT_CONTENT_TYPE);
    assert.equal(policy.acl, undefined);
    assert.deepEqual(policy.conditions[0], ["eq", "$Content-Type", DEFAULT_CONTENT_TYPE]);
  }

  const html = buildS3UploadPolicy({ key: "church1/files/page.html", contentType: "" });
  assert.equal(html.contentType, DEFAULT_CONTENT_TYPE);
  assert.equal(html.acl, undefined);

  // A malformed type is not echoed back into the policy.
  const junk = buildS3UploadPolicy({ key: "church1/files/payload.bin", contentType: "not a mime type" });
  assert.equal(junk.contentType, DEFAULT_CONTENT_TYPE);
  assert.equal(junk.acl, undefined);
});

test("buildS3UploadPolicy does not accept empty Content-Type as-is even when the key can be inferred", () => {
  const policy = buildS3UploadPolicy({ key: "gallery/1.77/123.jpg", contentType: "" });
  assert.equal(policy.contentType, "image/jpeg");
  assert.ok(!policy.conditions.some((c) => Array.isArray(c) && c[0] === "starts-with" && c[2] === ""));
  assert.deepEqual(policy.conditions[0], ["eq", "$Content-Type", "image/jpeg"]);
});

test("buildS3UploadPolicy ignores a client-supplied ACL", () => {
  const fromClient = buildS3UploadPolicy({ key: "a.jpg", contentType: "image/jpeg", acl: "authenticated-read" });
  assert.equal(fromClient.acl, "public-read");
  assert.ok(!JSON.stringify(fromClient.conditions).includes("authenticated-read"));
  assert.ok(fromClient.conditions.some((c) => !Array.isArray(c) && c.acl === "public-read"));

  const html = buildS3UploadPolicy({ key: "x.html", contentType: "text/html", acl: "public-read" });
  assert.equal(html.acl, undefined);
  assert.ok(!JSON.stringify(html.conditions).includes("public-read"));
  assert.equal(s3ObjectAcl("text/html"), undefined);
});

test("buildS3UploadPolicy allowlists image/pdf/video and adds content-length-range", () => {
  const image = buildS3UploadPolicy({ key: "photo.png", contentType: "image/png", size: 2048 });
  assert.equal(image.acl, "public-read");
  assert.deepEqual(image.conditions[0], ["eq", "$Content-Type", "image/png"]);
  assert.deepEqual(image.conditions[1], ["content-length-range", 1, 2048]);

  const pdf = buildS3UploadPolicy({ key: "doc.pdf", contentType: "application/pdf" });
  assert.equal(pdf.acl, "public-read");
  assert.deepEqual(pdf.conditions[1], ["content-length-range", 1, MAX_UPLOAD_BYTES]);

  const video = buildS3UploadPolicy({ key: "sermon.mp4", contentType: "video/mp4", size: MAX_UPLOAD_BYTES * 4 });
  assert.deepEqual(video.conditions[1], ["content-length-range", 1, MAX_UPLOAD_BYTES]);
});

test("isAllowedContentType rejects html/js/empty and accepts first-party prefixes", () => {
  assert.equal(isAllowedContentType(""), false);
  assert.equal(isAllowedContentType("text/html"), false);
  assert.equal(isAllowedContentType("application/javascript"), false);
  assert.equal(isAllowedContentType("application/octet-stream"), false);
  assert.equal(isAllowedContentType("image/jpeg"), true);
  assert.equal(isAllowedContentType("IMAGE/PNG; charset=binary"), true);
  assert.equal(isAllowedContentType("application/pdf"), true);
  assert.equal(isAllowedContentType("font/woff2"), true);
});
