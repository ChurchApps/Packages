import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { get, post, postAnonymous } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), postAnonymous: vi.fn() }));
vi.mock("@churchapps/helpers", async (orig) => {
  const actual: any = await orig();
  return { ...actual, ApiHelper: { ...actual.ApiHelper, isAuthenticated: false, get, post, postAnonymous } };
});
vi.mock("@stripe/stripe-js", () => ({ loadStripe: () => Promise.resolve({}) }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: any) => children,
  CardElement: () => null,
  useElements: () => ({ getElement: () => ({}) }),
  useStripe: () => ({ createPaymentMethod: () => Promise.resolve({ paymentMethod: { id: "pm_1" } }) })
}));
vi.mock("react-google-recaptcha", () => ({ default: (p: any) => <button data-testid="recaptcha" onClick={() => p.onChange("tok")}>captcha</button> }));

import { FormCardPayment } from "../providers/stripe/FormCardPayment";
import type { FormPaymentHandle } from "../providers/types";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const question: any = { id: "Q1", fieldType: "Payment", choices: [{ text: "Amount", value: "25" }, { text: "FundId", value: "F1" }] };
const gateway: any = { id: "G1", provider: "stripe", publicKey: "pk_test", currency: "usd" };
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const type = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("form payment block (guest)", () => {
  let container: HTMLDivElement;
  beforeEach(() => {
    get.mockReset(); post.mockReset(); postAnonymous.mockReset();
    get.mockImplementation((url: string) => Promise.resolve(url.startsWith("/funds/") ? [{ id: "F1", name: "General Fund" }] : { id: "CHU1", name: "Grace" }));
    post.mockImplementation((url: string) => {
      if (url === "/paymentmethods/addcard") return Promise.resolve({ paymentMethod: { id: "pm_1", type: "card" }, customerId: "cus_1" });
      if (url === "/donate/charge") return Promise.resolve({ status: "succeeded" });
      return Promise.resolve({ id: "P1", name: { display: "Donald Clark" } });
    });
    postAnonymous.mockResolvedValue({ response: "human", pass: "PASS1" });
  });
  afterEach(() => container?.remove());

  const render = async () => {
    const ref = createRef<FormPaymentHandle>();
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => { createRoot(container).render(<FormCardPayment ref={ref} churchId="CHU1" question={question} gateway={gateway} />); });
    await flush();
    const inputs = container.querySelectorAll("input");
    await act(async () => { type(inputs[0], "donald@example.com"); type(inputs[1], "Donald"); type(inputs[2], "Clark"); });
    return ref;
  };

  it("refuses to save the card until the captcha is checked", async () => {
    const ref = await render();
    const result = await act(() => ref.current!.handlePayment());
    expect(result.paymentSuccessful).toBe(false);
    expect(result.errors.join(" ")).toMatch(/reCAPTCHA/);
    expect(post).not.toHaveBeenCalledWith("/paymentmethods/addcard", expect.anything(), "GivingApi");
  });

  it("shows the captcha and sends its pass with the card save and the charge", async () => {
    const ref = await render();
    const box = container.querySelector('[data-testid="recaptcha"]') as HTMLButtonElement;
    expect(box, "captcha checkbox rendered").not.toBeNull();
    await act(async () => { box.click(); });
    await flush();
    expect(postAnonymous).toHaveBeenCalledWith("/donate/captcha-verify", { token: "tok", churchId: "CHU1" }, "GivingApi");

    const result = await act(() => ref.current!.handlePayment());
    expect(result.paymentSuccessful).toBe(true);
    const body = (url: string) => post.mock.calls.find((c) => c[0] === url)?.[1];
    expect(body("/paymentmethods/addcard")).toMatchObject({ captchaPass: "PASS1" });
    expect(body("/donate/charge")).toMatchObject({ captchaPass: "PASS1" });
  });
});
