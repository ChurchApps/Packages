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

const mount = async (props: any = {}) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<LoginPage context={context} jwt="" auth="" {...props} />); });
};

const typeCode = async (code: string) => {
  const input = container!.querySelector<HTMLInputElement>("#mfa-code")!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(input, code);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => { input.form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
};

afterEach(() => {
  if (root) act(() => { root!.unmount(); });
  container?.remove();
  root = null;
  container = null;
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("LoginPage two-factor step", () => {
  it("asks for a code when the login answers mfaRequired, then sends it with the challenge token", async () => {
    const post = vi.spyOn(ApiHelper, "postAnonymous").mockResolvedValueOnce({ mfaRequired: true, mfaToken: "challenge" } as any)
      .mockRejectedValueOnce(new Error("Invalid code"));
    await mount({ jwt: "user-jwt" });
    expect(container!.querySelector("#mfa-code")).not.toBeNull();

    await typeCode("123456");
    expect(post).toHaveBeenLastCalledWith("/users/login", { mfaToken: "challenge", mfaCode: "123456" }, "MembershipApi");
    expect(container!.textContent).toContain("That code didn't work");
    expect(container!.querySelector("#mfa-code")).not.toBeNull();
  });

  it("picks up the challenge token an SSO redirect leaves in the hash", async () => {
    vi.spyOn(ApiHelper, "postAnonymous");
    window.history.replaceState(null, "", "/login#mfaToken=from-sso");
    await mount();
    expect(container!.querySelector("#mfa-code")).not.toBeNull();
    expect(window.location.hash).toBe("");
    expect(ApiHelper.postAnonymous).not.toHaveBeenCalled();
  });
});
