import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@churchapps/helpers", async (orig) => {
  const actual: any = await orig();
  return { ...actual, ApiHelper: { ...actual.ApiHelper, get, post } };
});
vi.mock("@stripe/stripe-js", () => ({ loadStripe: () => Promise.resolve({}) }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: any) => children,
  CardElement: () => null,
  useElements: () => ({ getElement: () => ({}) }),
  useStripe: () => ({ createPaymentMethod: () => Promise.resolve({ paymentMethod: { id: "pm_1" } }) })
}));

import { MultiGatewayDonationForm } from "../components/MultiGatewayDonationForm";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const gateway: any = { id: "G1", provider: "stripe", publicKey: "pk_test", currency: "usd", enabled: true };

describe("Signed-in giving form funds", () => {
  beforeEach(() => {
    get.mockReset(); post.mockReset();
    get.mockResolvedValue([]);
    post.mockResolvedValue({});
  });

  it("asks for the church's donor-visible funds, not the staff all-funds list", async () => {
    const root = createRoot(document.createElement("div"));
    await act(async () => {
      root.render(<MultiGatewayDonationForm person={{ id: "P1", name: { display: "Donald Clark" }, contactInfo: { email: "d@x.com" } } as any} customerId="cus_1" paymentMethods={[]} paymentGateways={[gateway]} donationSuccess={() => {}} church={{ id: "C1" } as any} />);
    });
    const fundCalls = get.mock.calls.map((c) => c[0]).filter((u: string) => u.startsWith("/funds"));
    expect(fundCalls).toEqual(["/funds/churchId/C1"]);
    act(() => root.unmount());
  });
});
