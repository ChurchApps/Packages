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

// The `.then` body of the funds load in init(), where the ?fundId / ?amount link params are applied.
const fundsLoadBlock = (src: string, rel: string) => {
  const start = src.indexOf('ApiHelper.get("/funds/churchId/"');
  expect(start, `${rel} loads funds in init`).toBeGreaterThan(-1);
  const end = src.indexOf('ApiHelper.get("/churches/lookup/', start);
  expect(end, `${rel} loads the church after the funds`).toBeGreaterThan(start);
  return src.slice(start, end);
};

// Body of a function, matched by braces from its declaration.
const functionBody = (src: string, declaration: string, rel: string) => {
  const start = src.indexOf(declaration);
  expect(start, `${rel} declares ${declaration}`).toBeGreaterThan(-1);
  const open = src.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error(`${rel}: unbalanced braces in ${declaration}`);
};

describe("giving link fund/amount preselect", () => {
  it("reads fundId and amount off the donate link", () => {
    for (const rel of files) {
      const src = read(rel);
      expect(src, rel).toContain('getUrlParam("fundId")');
      expect(src, rel).toContain('getUrlParam("amount")');
    }
  });

  it("applies the preselected fund through handleFundDonationsChange", () => {
    for (const rel of files) {
      const block = fundsLoadBlock(read(rel), rel);
      expect(block, `${rel} funds load calls handleFundDonationsChange`).toMatch(/handleFundDonationsChange\(\[\{\s*fundId:/);
      expect(block, `${rel} passes the link amount through`).toContain("parseFloat(amount)");
    }
  });

  it("never sets fund donations directly on the link-preselect path", () => {
    for (const rel of files) {
      const block = fundsLoadBlock(read(rel), rel);
      // The original bug: setFundDonations filled the amount field while fundsTotal, the
      // transaction fee and the total all stayed at 0 until the donor touched a field.
      expect(block, `${rel} funds load must not call setFundDonations directly`).not.toMatch(/setFundDonations\(\[\{\s*fundId:/);
    }
  });

  it("sums the fund amounts into fundsTotal and then the total", () => {
    for (const rel of files) {
      const src = read(rel);
      const body = functionBody(src, "const handleFundDonationsChange", rel);
      expect(body, `${rel} sums the fund donation amounts`).toMatch(/(totalAmount \+= fundDonation\.amount|\.reduce\(\(t, f\) => t \+ \(f\.amount)/);
      const fundsTotalIdx = body.indexOf("setFundsTotal(totalAmount)");
      const totalIdx = body.indexOf("setTotal(");
      expect(fundsTotalIdx, `${rel} sets fundsTotal from the summed amounts`).toBeGreaterThan(-1);
      expect(totalIdx, `${rel} sets the total`).toBeGreaterThan(-1);
      expect(fundsTotalIdx, `${rel} sets fundsTotal before the total`).toBeLessThan(totalIdx);
      expect(body, `${rel} recalculates the transaction fee`).toContain("getTransactionFee(totalAmount)");
    }
  });
});
