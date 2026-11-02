import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@churchapps/helpers", async (orig) => {
  const actual: any = await orig();
  return { ...actual, ApiHelper: { ...actual.ApiHelper, post } };
});
vi.mock("@stripe/stripe-js", () => ({ loadStripe: () => Promise.resolve({}) }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: any) => children,
  CardElement: () => null,
  useElements: () => ({ getElement: () => ({}) }),
  useStripe: () => ({ createPaymentMethod: () => Promise.resolve({ paymentMethod: { id: "pm_1" } }) })
}));

import { StripeProvider } from "../providers/stripe/StripeProvider";
import type { MemberEntryHandle } from "../providers/types";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const gateway: any = { id: "G1", provider: "stripe", publicKey: "pk_test", currency: "usd" };
const context = (extra: any = {}): any => ({ provider: "stripe", churchId: "C1", amount: 25, funds: [], person: { id: "", email: "g@x.com", name: "G H" }, ...extra });

async function tokenize(ctx: any) {
  const ref = createRef<MemberEntryHandle>();
  const Entry = StripeProvider.MemberEntry!;
  const root = createRoot(document.createElement("div"));
  await act(async () => { root.render(<Entry ref={ref} gateway={gateway} getContext={() => ctx} />); });
  return ref.current!.tokenize();
}

describe("Stripe card entry captcha pass", () => {
  beforeEach(() => { post.mockReset(); });

  it("sends the guest's pass with the card save", async () => {
    post.mockResolvedValue({ paymentMethod: { id: "pm_1" }, customerId: "cus_1" });
    await tokenize(context({ captchaPass: "pass-1" }));
    expect(post.mock.calls[0][0]).toBe("/paymentmethods/addcard");
    expect(post.mock.calls[0][1].captchaPass).toBe("pass-1");
  });

  it("omits the pass for signed-in members", async () => {
    post.mockResolvedValue({ paymentMethod: { id: "pm_1" }, customerId: "cus_1" });
    await tokenize(context());
    expect(post.mock.calls[0][1]).not.toHaveProperty("captchaPass");
  });

  it("surfaces a refused card save instead of returning an empty token", async () => {
    post.mockResolvedValue({ error: "Captcha verification required" });
    await expect(tokenize(context())).rejects.toThrow("Captcha verification required");
  });
});
