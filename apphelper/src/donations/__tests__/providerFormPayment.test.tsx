import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { get, getAnonymous, post, postAnonymous, openPaystackPopup } = vi.hoisted(() => ({ get: vi.fn(), getAnonymous: vi.fn(), post: vi.fn(), postAnonymous: vi.fn(), openPaystackPopup: vi.fn() }));
vi.mock("@churchapps/helpers", async (orig) => {
  const actual: any = await orig();
  return { ...actual, ApiHelper: { ...actual.ApiHelper, isAuthenticated: false, get, getAnonymous, post, postAnonymous } };
});
vi.mock("../providers/paystack/paystackPopup", () => ({ openPaystackPopup, toSubunits: (a: number) => a * 100 }));
vi.mock("react-google-recaptcha", () => ({ default: (p: any) => <button data-testid="recaptcha" onClick={() => p.onChange("tok")}>captcha</button> }));

import { FormPaymentQuestion } from "../components/FormPaymentQuestion";
import type { FormPaymentHandle } from "../providers/types";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const question: any = { id: "Q1", fieldType: "Payment", choices: [{ text: "Amount", value: "50" }, { text: "FundId", value: "F1" }] };
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const type = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("form payment question with a non-Stripe gateway", () => {
  let container: HTMLDivElement;
  beforeEach(() => {
    [get, getAnonymous, post, postAnonymous, openPaystackPopup].forEach((m) => m.mockReset());
    getAnonymous.mockResolvedValue({ gateways: [{ id: "G2", provider: "Paystack", publicKey: "pk_test_ps", currency: "GHS" }] });
    get.mockResolvedValue({ id: "CHU2", name: "Accra", subDomain: "accra" });
    post.mockImplementation((url: string) => {
      if (url === "/donate/charge") return Promise.resolve({ status: "succeeded" });
      return Promise.resolve({ id: "P1", name: { display: "Ama Mensah" }, contactInfo: { email: "ama@example.com" } });
    });
    postAnonymous.mockResolvedValue({ response: "human", pass: "PASS1" });
    openPaystackPopup.mockResolvedValue({ reference: "ref_123" });
  });
  afterEach(() => container?.remove());

  const render = async () => {
    const ref = createRef<FormPaymentHandle>();
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => { createRoot(container).render(<FormPaymentQuestion ref={ref} churchId="CHU2" question={question} />); });
    await flush();
    return ref;
  };

  it("renders the payment block instead of 'not available'", async () => {
    await render();
    expect(container.textContent).not.toMatch(/not available/);
    expect(container.querySelector('[data-testid="form-payment"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="paystack-entry"]')).not.toBeNull();
    expect(container.textContent).toContain("GH₵");
  });

  it("charges through Paystack with the captcha pass", async () => {
    const ref = await render();
    const inputs = container.querySelectorAll("input");
    await act(async () => { type(inputs[0], "ama@example.com"); type(inputs[1], "Ama"); type(inputs[2], "Mensah"); });

    const blocked = await act(() => ref.current!.handlePayment());
    expect(blocked.paymentSuccessful).toBe(false);
    expect(openPaystackPopup).not.toHaveBeenCalled();

    await act(async () => { (container.querySelector('[data-testid="recaptcha"]') as HTMLButtonElement).click(); });
    await flush();
    const result = await act(() => ref.current!.handlePayment());
    expect(result).toMatchObject({ paymentSuccessful: true, name: "Ama Mensah" });
    expect(openPaystackPopup).toHaveBeenCalledWith(expect.objectContaining({ key: "pk_test_ps", email: "ama@example.com", amount: 50, currency: "ghs" }));
    const charge = post.mock.calls.find((c) => c[0] === "/donate/charge")?.[1];
    expect(charge).toMatchObject({ provider: "paystack", gatewayId: "G2", id: "ref_123", amount: 50, funds: [{ id: "F1", amount: 50 }], person: { id: "P1" }, captchaPass: "PASS1" });
  });

  it("reports a cancelled Paystack window as a failed payment", async () => {
    openPaystackPopup.mockRejectedValue(new Error("cancelled"));
    const ref = await render();
    const inputs = container.querySelectorAll("input");
    await act(async () => { type(inputs[0], "ama@example.com"); type(inputs[1], "Ama"); type(inputs[2], "Mensah"); });
    await act(async () => { (container.querySelector('[data-testid="recaptcha"]') as HTMLButtonElement).click(); });
    await flush();
    const result = await act(() => ref.current!.handlePayment());
    expect(result.paymentSuccessful).toBe(false);
    expect(post).not.toHaveBeenCalledWith("/donate/charge", expect.anything(), "GivingApi");
  });
});
