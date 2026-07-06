import { describe, it, expect } from "vitest";
import { isPayPalCaptureComplete } from "../paypalStatus";

// Guards the PayPal "CREATED = success" bug: an order that was created but not
// captured must NOT show the donor a thank-you screen.
describe("isPayPalCaptureComplete", () => {
  it("treats COMPLETED and APPROVED as captured", () => {
    expect(isPayPalCaptureComplete("COMPLETED")).toBe(true);
    expect(isPayPalCaptureComplete("APPROVED")).toBe(true);
  });

  it("treats CREATED as NOT captured (order created, payment not collected)", () => {
    expect(isPayPalCaptureComplete("CREATED")).toBe(false);
  });

  it("treats missing/empty/unexpected statuses as not captured", () => {
    expect(isPayPalCaptureComplete(undefined)).toBe(false);
    expect(isPayPalCaptureComplete("")).toBe(false);
    expect(isPayPalCaptureComplete("VOIDED")).toBe(false);
    expect(isPayPalCaptureComplete("PENDING")).toBe(false);
  });
});
