import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiHelper } from "@churchapps/helpers";
import { LoginPage } from "../LoginPage";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const context: any = { setUser: vi.fn(), setUserChurches: vi.fn(), setUserChurch: vi.fn(), setPerson: vi.fn() };
let container: HTMLDivElement | null = null;
let root: Root | null = null;

const mount = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<LoginPage context={context} jwt="" auth="" appName="B1" />); });
};

const setValue = async (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const submit = async (selector: string) => {
  await act(async () => { container!.querySelector(selector)!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
};

const typeCode = async (code: string) => {
  const digits = Array.from(container!.querySelectorAll<HTMLInputElement>("#email-code-verify-form input[type='text']"));
  for (const [i, d] of code.split("").entries()) await setValue(digits[i], d);
};

// Click "Email me a code", enter the address, and send the request.
const requestCode = async (email = "member@example.com") => {
  await setValue(container!.querySelector<HTMLInputElement>("#login-email-field input, input#login-email-field")!, email);
  await act(async () => { container!.querySelector<HTMLButtonElement>("#email-code-link")!.click(); });
  expect(container!.querySelector<HTMLInputElement>("#email-code-email")!.value).toBe(email);
  await submit("#email-code-request-form");
};

afterEach(() => {
  if (root) act(() => { root!.unmount(); });
  container?.remove();
  root = null;
  container = null;
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("LoginPage email code sign-in", () => {
  it("requests a code for the typed email, then signs in with it", async () => {
    const post = vi.spyOn(ApiHelper, "postAnonymous")
      .mockResolvedValueOnce({ emailed: true } as any)
      .mockResolvedValueOnce({ user: { id: "u1", email: "member@example.com", firstName: "A", lastName: "B", jwt: "jwt" }, userChurches: [] } as any);
    await mount();
    await requestCode();
    expect(post).toHaveBeenNthCalledWith(1, "/users/requestLoginCode", { email: "member@example.com" }, "MembershipApi");

    await typeCode("123456");
    expect(post).toHaveBeenNthCalledWith(2, "/users/loginWithCode", { email: "member@example.com", code: "123456", appName: "B1" }, "MembershipApi");
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("shows a plain error for a wrong code and stays on the code step", async () => {
    vi.spyOn(ApiHelper, "postAnonymous")
      .mockResolvedValueOnce({ emailed: true } as any)
      .mockRejectedValueOnce(new Error("Invalid or expired code"));
    await mount();
    await requestCode();
    await typeCode("000000");
    expect(container!.textContent).toContain("That code didn't work or has expired");
    expect(container!.querySelector("#email-code-verify-form")).not.toBeNull();
    expect(container!.textContent).not.toContain("No account");
  });

  it("goes to the two-factor step when the account has MFA", async () => {
    const post = vi.spyOn(ApiHelper, "postAnonymous")
      .mockResolvedValueOnce({ emailed: true } as any)
      .mockResolvedValueOnce({ mfaRequired: true, mfaToken: "challenge" } as any);
    await mount();
    await requestCode();
    await typeCode("123456");
    expect(container!.querySelector("#mfa-code")).not.toBeNull();
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("returns to the password form", async () => {
    vi.spyOn(ApiHelper, "postAnonymous");
    await mount();
    await act(async () => { container!.querySelector<HTMLButtonElement>("#email-code-link")!.click(); });
    const back = Array.from(container!.querySelectorAll("button")).find((b) => b.textContent === "Sign in with password")!;
    await act(async () => { back.click(); });
    expect(container!.querySelector("#login-password-field")).not.toBeNull();
    expect(ApiHelper.postAnonymous).not.toHaveBeenCalled();
  });
});
