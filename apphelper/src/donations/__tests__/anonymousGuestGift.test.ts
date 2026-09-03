import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const files = [
  "../providers/stripe/NonAuthDonationInner.tsx",
  "../providers/paypal/PayPalNonAuthDonationInner.tsx",
  "../providers/paystack/PaystackNonAuthDonationInner.tsx",
  "../providers/kingdomfunding/KingdomFundingNonAuthDonationInner.tsx"
];

const read = (rel: string) => readFileSync(join(dir, rel), "utf8");

describe("anonymous guest gift", () => {
  it("offers a labelled anonymous checkbox on every guest donation form", () => {
    for (const rel of files) {
      const src = read(rel);
      expect(src, rel).toContain('name="anonymous"');
      expect(src, rel).toContain('"aria-label": "anonymous"');
      expect(src, rel).toContain('Locale.label("donation.donationForm.anonymous")');
    }
  });

  it("forces a one-time gift when anonymous is checked", () => {
    for (const rel of files) {
      const src = read(rel);
      expect(src, rel).toMatch(/const handleAnonymousChange = [^;]*?\{[\s\S]*?setAnonymous\(checked\);[\s\S]*?if \(checked\) setDonationType\("once"\);/);
    }
  });

  it("skips the first/last name requirement when anonymous", () => {
    for (const rel of files) {
      const src = read(rel);
      expect(src, rel).toContain("if (!anonymous && !firstName)");
      expect(src, rel).toContain("if (!anonymous && !lastName)");
    }
  });

  it("does not create a user or person record for an anonymous gift", () => {
    for (const rel of files) {
      const src = read(rel);
      // Both loadOrCreate calls must sit behind an `anonymous` branch, never before it.
      const userIdx = src.indexOf('ApiHelper.post("/users/loadOrCreate"');
      const personIdx = src.indexOf('ApiHelper.post("/people/loadOrCreate"');
      expect(userIdx, `${rel} posts /users/loadOrCreate`).toBeGreaterThan(-1);
      expect(personIdx, `${rel} posts /people/loadOrCreate`).toBeGreaterThan(-1);

      const guardIdx = src.indexOf("if (anonymous) {");
      expect(guardIdx, `${rel} guards person creation with if (anonymous)`).toBeGreaterThan(-1);
      expect(guardIdx, `${rel} guards before /users/loadOrCreate`).toBeLessThan(userIdx);
      expect(guardIdx, `${rel} guards before /people/loadOrCreate`).toBeLessThan(personIdx);
    }
  });

  it("sends anonymous on the charge payload", () => {
    for (const rel of files) {
      const src = read(rel);
      // `anonymous` is a shorthand property on the object posted to the charge endpoint.
      expect(src, rel).toMatch(/\n\s*anonymous\n?\s*\}/);
      expect(src, rel).toContain('"/donate/charge"');
    }
  });
});
