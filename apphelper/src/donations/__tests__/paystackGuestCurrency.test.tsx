import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@churchapps/helpers", async (orig) => {
  const actual: any = await orig();
  return { ...actual, ApiHelper: { ...actual.ApiHelper, get, post: vi.fn(), postAnonymous: vi.fn() } };
});
vi.mock("react-google-recaptcha", () => ({ default: () => null }));

import { PaystackNonAuthDonationInner } from "../providers/paystack/PaystackNonAuthDonationInner";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("Paystack guest donation form", () => {
  let container: HTMLDivElement;
  afterEach(() => container?.remove());

  it("shows the church's currency symbol in the amount box, not $", async () => {
    get.mockImplementation((url: string) => {
      if (url.startsWith("/funds/churchId/")) return Promise.resolve([{ id: "F1", name: "General Fund" }]);
      if (url.startsWith("/churches/lookup/")) return Promise.resolve({ id: "CHU1", name: "Grace" });
      if (url.startsWith("/donate/gateways/")) return Promise.resolve({ gateways: [{ id: "G1", provider: "paystack", currency: "ngn" }] });
      return Promise.resolve({});
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => { createRoot(container).render(<PaystackNonAuthDonationInner churchId="CHU1" recaptchaSiteKey="key" />); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    const amount = container.querySelector('input[name="amount"]');
    expect(amount, "amount field rendered").not.toBeNull();
    const adornment = amount!.closest(".MuiInputBase-root")!.textContent;
    expect(adornment).toContain("₦");
    expect(adornment).not.toContain("$");
  });
});
