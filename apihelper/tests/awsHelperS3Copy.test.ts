import { test } from "node:test";
import assert from "node:assert/strict";

import { AwsHelper } from "../src/helpers/AwsHelper";
import { EnvironmentBase } from "../src/helpers/EnvironmentBase";

// Api prod 2026-11-17: approving a directory update with a photo moved
// "/{churchId}/membership/people/pending/x.png" and S3Copy built CopySource "/{bucket}//{churchId}/...",
// so S3 answered NoSuchKey. Keys passed with a leading slash must be stripped like S3Upload/S3Remove do.
test("S3Move strips the leading slash from both keys", async () => {
  const sent: any[] = [];
  const client = (AwsHelper as any)._client;
  const bucket = EnvironmentBase.s3Bucket;
  (AwsHelper as any)._client = { send: async (cmd: any) => { sent.push(cmd.input); return {}; } };
  EnvironmentBase.s3Bucket = "test-bucket";
  const log = console.log;
  console.log = () => {};
  try {
    await AwsHelper.S3Move("/c1/membership/people/pending/p1-1.png", "/c1/membership/people/p1.png");
  } finally {
    console.log = log;
    (AwsHelper as any)._client = client;
    EnvironmentBase.s3Bucket = bucket;
  }
  assert.equal(sent.length, 2);
  assert.equal(sent[0].CopySource, "/test-bucket/c1/membership/people/pending/p1-1.png");
  assert.equal(sent[0].Key, "c1/membership/people/p1.png");
  assert.equal(sent[1].Key, "c1/membership/people/pending/p1-1.png");
});
