import { describe, it, expect } from "vitest";
import { DonationHelper } from "../DonationHelper";

// Guards the PayPal "CREATED = success" bug: an order that was created but not
// captured must NOT show the donor a thank-you screen.
describe("DonationHelper.isPayPalCaptureComplete", () => {
  it("treats COMPLETED and APPROVED as captured", () => {
    expect(DonationHelper.isPayPalCaptureComplete("COMPLETED")).toBe(true);
    expect(DonationHelper.isPayPalCaptureComplete("APPROVED")).toBe(true);
  });

  it("treats CREATED as NOT captured (order created, payment not collected)", () => {
    expect(DonationHelper.isPayPalCaptureComplete("CREATED")).toBe(false);
  });

  it("treats missing/empty/unexpected statuses as not captured", () => {
    expect(DonationHelper.isPayPalCaptureComplete(undefined)).toBe(false);
    expect(DonationHelper.isPayPalCaptureComplete("")).toBe(false);
    expect(DonationHelper.isPayPalCaptureComplete("VOIDED")).toBe(false);
    expect(DonationHelper.isPayPalCaptureComplete("PENDING")).toBe(false);
  });
});
