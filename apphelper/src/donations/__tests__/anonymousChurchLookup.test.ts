import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const files = [
  "../providers/stripe/FormCardPayment.tsx",
  "../providers/stripe/NonAuthDonationInner.tsx",
  "../providers/paypal/PayPalNonAuthDonationInner.tsx",
  "../providers/paystack/PaystackNonAuthDonationInner.tsx",
  "../providers/kingdomfunding/KingdomFundingNonAuthDonationInner.tsx"
];

describe("anonymous donation church lookup", () => {
  it("loads church via the public lookup endpoint, not GET /churches/:id", () => {
    for (const rel of files) {
      const src = readFileSync(join(dir, rel), "utf8");
      expect(src, rel).toContain('ApiHelper.get("/churches/lookup/?id=" + props.churchId, "MembershipApi")');
      expect(src, rel).not.toMatch(/ApiHelper\.get\("\/churches\/" \+ props\.churchId/);
    }
  });
});
