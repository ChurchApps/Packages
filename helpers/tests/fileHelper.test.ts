import { test } from "node:test";
import assert from "node:assert/strict";

import { FileHelper } from "../src/FileHelper";

test("presignedFormFields does not add a client ACL and does not send empty Content-Type", () => {
  const noAcl = FileHelper.presignedFormFields({ fields: { key: "a.jpg", policy: "p" } }, { type: "" });
  assert.equal("acl" in noAcl, false);
  assert.equal("Content-Type" in noAcl, false);

  const serverAcl = FileHelper.presignedFormFields({ fields: { key: "a.jpg", acl: "public-read", "Content-Type": "image/jpeg" } }, { type: "text/html" });
  assert.equal(serverAcl.acl, "public-read");
  assert.equal(serverAcl["Content-Type"], "image/jpeg");
});
