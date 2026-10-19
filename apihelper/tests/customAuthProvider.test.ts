import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { principalFromAuthorizationHeader } from "../src/auth/principalFromHeader";

// LessonsApi prod 2026-10-18 01:51-01:53Z: a scanner sent "Authorization: Bearer <garbage>" and
// jwt.verify threw inside CustomAuthProvider.getUser. Nothing caught the rejected promise, so the
// Lambda container died with Runtime.UnhandledPromiseRejection twelve times. A bad token is an
// anonymous caller. getUser now delegates to principalFromAuthorizationHeader.
const SECRET = "test-secret";

test("a malformed token is anonymous instead of throwing", () => {
  assert.equal(principalFromAuthorizationHeader("Bearer not.a.jwt", SECRET), null);
  assert.equal(principalFromAuthorizationHeader("Bearer", SECRET), null);
});

test("a token signed with another secret is anonymous", () => {
  const forged = jwt.sign({ id: "u1" }, "other-secret", { algorithm: "HS256" });
  assert.equal(principalFromAuthorizationHeader("Bearer " + forged, SECRET), null);
});

test("an expired token is anonymous", () => {
  const expired = jwt.sign({ id: "u1", exp: Math.floor(Date.now() / 1000) - 60 }, SECRET, { algorithm: "HS256" });
  assert.equal(principalFromAuthorizationHeader("Bearer " + expired, SECRET), null);
});

test("a valid token still resolves to a principal carrying the token", () => {
  const token = jwt.sign({ id: "u1", churchId: "c1" }, SECRET, { algorithm: "HS256" });
  const principal = principalFromAuthorizationHeader("Bearer " + token, SECRET);
  assert.equal(principal?.details.id, "u1");
  assert.equal(principal?.details.churchId, "c1");
  assert.equal(principal?.details.jwt, token);
});

test("no header is anonymous", () => {
  assert.equal(principalFromAuthorizationHeader(undefined, SECRET), null);
});

test("the old behaviour: jwt.verify throws on a malformed token, which is what crashed the container", () => {
  assert.throws(() => jwt.verify("garbage", SECRET, { algorithms: ["HS256"] }), /jwt malformed/);
});
