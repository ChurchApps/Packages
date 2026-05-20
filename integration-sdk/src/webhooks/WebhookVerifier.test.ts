import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { WebhookVerifier, WebhookVerificationError } from "./WebhookVerifier";

const SECRET = "test-secret-0123456789";
const BODY = JSON.stringify({ event: "person.created", churchId: "ch1", occurredAt: "2026-05-19T00:00:00.000Z", data: { id: "p1", churchId: "ch1" } });

describe("WebhookVerifier.sign", () => {
  it("produces a `sha256=` hex signature matching the server algorithm", () => {
    // Independently compute the expected value the way the B1 Api WebhookSigner does.
    const expected = "sha256=" + crypto.createHmac("sha256", SECRET).update(BODY, "utf8").digest("hex");
    expect(WebhookVerifier.sign(SECRET, BODY)).toBe(expected);
  });
});

describe("WebhookVerifier.verify", () => {
  it("returns true for a valid signature", () => {
    const sig = WebhookVerifier.sign(SECRET, BODY);
    expect(WebhookVerifier.verify(SECRET, BODY, sig)).toBe(true);
  });

  it("returns false when the body is tampered", () => {
    const sig = WebhookVerifier.sign(SECRET, BODY);
    expect(WebhookVerifier.verify(SECRET, BODY + " ", sig)).toBe(false);
  });

  it("returns false when the signature is tampered", () => {
    const sig = WebhookVerifier.sign(SECRET, BODY);
    const bad = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    expect(WebhookVerifier.verify(SECRET, BODY, bad)).toBe(false);
  });

  it("returns false (no throw) for a missing or empty header", () => {
    expect(WebhookVerifier.verify(SECRET, BODY, undefined)).toBe(false);
    expect(WebhookVerifier.verify(SECRET, BODY, null)).toBe(false);
    expect(WebhookVerifier.verify(SECRET, BODY, "")).toBe(false);
  });

  it("returns false (no throw) for a length-mismatched signature", () => {
    expect(WebhookVerifier.verify(SECRET, BODY, "sha256=short")).toBe(false);
  });

  it("accepts both string and Buffer bodies", () => {
    const sig = WebhookVerifier.sign(SECRET, BODY);
    expect(WebhookVerifier.verify(SECRET, Buffer.from(BODY, "utf8"), sig)).toBe(true);
  });
});

describe("WebhookVerifier.verifyAndParse", () => {
  it("returns a typed envelope on a valid signature", () => {
    const sig = WebhookVerifier.sign(SECRET, BODY);
    const env = WebhookVerifier.verifyAndParse(SECRET, BODY, sig);
    expect(env.event).toBe("person.created");
    expect(env.churchId).toBe("ch1");
  });

  it("throws WebhookVerificationError on a bad signature", () => {
    expect(() => WebhookVerifier.verifyAndParse(SECRET, BODY, "sha256=bad")).toThrow(WebhookVerificationError);
  });
});
