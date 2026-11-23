import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { DonationHelper } from "../helpers/DonationHelper";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(dir, rel), "utf8");

const guestForms = [
  "../providers/stripe/NonAuthDonationInner.tsx",
  "../providers/paypal/PayPalNonAuthDonationInner.tsx",
  "../providers/paystack/PaystackNonAuthDonationInner.tsx",
  "../providers/kingdomfunding/KingdomFundingNonAuthDonationInner.tsx"
];

describe("giving link ?recurring param", () => {
  afterEach(() => { window.history.replaceState(null, "", "/"); });

  it("treats 1, true and yes as a recurring link", () => {
    for (const v of ["1", "true", "TRUE", " yes "]) expect(DonationHelper.isRecurringLinkValue(v), v).toBe(true);
  });

  it("defaults to a one-time gift when the param is missing or anything else", () => {
    for (const v of [null, undefined, "", "0", "false", "no", "monthly"]) expect(DonationHelper.isRecurringLinkValue(v as any), String(v)).toBe(false);
  });

  it("reads the param from a query string", () => {
    expect(DonationHelper.isRecurringLink("?fundId=abc&amount=25&recurring=1")).toBe(true);
    expect(DonationHelper.isRecurringLink("?fundId=abc&amount=25")).toBe(false);
    expect(DonationHelper.isRecurringLink("")).toBe(false);
  });

  it("falls back to the page URL when no query string is passed", () => {
    window.history.replaceState(null, "", "/donate?recurring=1");
    expect(DonationHelper.isRecurringLink()).toBe(true);
    window.history.replaceState(null, "", "/donate");
    expect(DonationHelper.isRecurringLink()).toBe(false);
  });

  it("every guest form starts on Recurring from the link but keeps one-time as the default", () => {
    for (const rel of guestForms) {
      const src = read(rel);
      expect(src, rel).toMatch(/DonationHelper\.isRecurringLinkValue\(getUrlParam\("recurring"\)\)\) setDonationType\("recurring"\)/);
      // The default stays one-time unless the church only allows recurring gifts.
      expect(src, rel).not.toMatch(/useState<"once" \| "recurring">\(\s*"recurring"\s*\)/);
      // The donor can still switch back before paying.
      expect(src, rel).toContain('onClick={() => setDonationType("once")}');
    }
  });

  it("only applies the link where the one-time/recurring choice is shown", () => {
    expect(read(guestForms[0])).toContain('if (paymentType !== "bank" && allowSingleGift && allowRecurring && DonationHelper.isRecurringLinkValue');
    expect(read(guestForms[1])).toContain("if (allowSingleGift && allowRecurring && DonationHelper.isRecurringLinkValue");
    expect(read(guestForms[2])).toContain("if (props.allowRecurring !== false && DonationHelper.isRecurringLinkValue");
  });

  it("the member form starts on Recurring from the link and keeps both buttons", () => {
    const src = read("../components/MultiGatewayDonationForm.tsx");
    expect(src).toContain('useState<string | undefined>("once")');
    expect(src).toMatch(/if \(DonationHelper\.isRecurringLink\(\)\) setDonationType\("recurring"\)/);
    expect(src).toContain('id="single-donation-button"');
    expect(src).toContain('id="recurring-donation-button"');
  });
});
