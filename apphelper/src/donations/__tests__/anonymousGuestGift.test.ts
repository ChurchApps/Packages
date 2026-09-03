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

  it("does not create a user or person when a wallet pays an anonymous gift", () => {
    const rel = "../providers/stripe/NonAuthDonationInner.tsx";
    const src = read(rel);
    const start = src.indexOf("const handleWalletConfirm");
    expect(start, "handleWalletConfirm is defined").toBeGreaterThan(-1);
    const body = src.slice(start, src.indexOf("const saveDonation", start));

    const guardIdx = body.indexOf("if (anonymous) {");
    const userIdx = body.indexOf('ApiHelper.post("/users/loadOrCreate"');
    const personIdx = body.indexOf('ApiHelper.post("/people/loadOrCreate"');
    expect(userIdx, "handleWalletConfirm posts /users/loadOrCreate").toBeGreaterThan(-1);
    expect(personIdx, "handleWalletConfirm posts /people/loadOrCreate").toBeGreaterThan(-1);
    expect(guardIdx, "handleWalletConfirm guards with if (anonymous)").toBeGreaterThan(-1);
    expect(guardIdx, "wallet guard sits before /users/loadOrCreate").toBeLessThan(userIdx);
    expect(guardIdx, "wallet guard sits before /people/loadOrCreate").toBeLessThan(personIdx);

    // The anonymous branch charges the wallet payment method directly - no vaulting.
    const anonBranch = body.slice(guardIdx, userIdx);
    expect(anonBranch, "anonymous wallet branch does not vault a card").not.toContain("/paymentmethods/addcard");
    expect(anonBranch, "anonymous wallet branch charges the wallet payment method").toContain("saveDonation(new StripePaymentMethod({ id: paymentMethodId, type: \"card\" })");
    // The wallet supplies the receipt email; the form email field may be blank.
    expect(anonBranch, "anonymous wallet branch keeps the wallet receipt email").toContain("donorEmail");
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
