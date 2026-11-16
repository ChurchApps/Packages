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
let observer: MutationObserver | null = null;
let sawCredentialField = false;
const CREDENTIAL_FIELDS = "#login-email-field, #login-password-field";

const mount = async (props: any = {}) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  sawCredentialField = false;
  // The bug is a field that is mounted and removed again before anyone looks, so check the
  // nodes each mutation removed as well as the ones it added; a detached subtree keeps its children.
  const check = (node: Node) => {
    if (node instanceof Element && (node.matches(CREDENTIAL_FIELDS) || node.querySelector(CREDENTIAL_FIELDS))) sawCredentialField = true;
  };
  observer = new MutationObserver((records) => {
    records.forEach(r => { r.addedNodes.forEach(check); r.removedNodes.forEach(check); });
  });
  observer.observe(container, { childList: true, subtree: true });
  root = createRoot(container);
  await act(async () => { root!.render(<LoginPage context={context} jwt="" auth="" {...props} />); });
  await act(async () => { await Promise.resolve(); });
};

afterEach(() => {
  observer?.disconnect();
  if (root) act(() => { root!.unmount(); });
  container?.remove();
  root = null;
  container = null;
  observer = null;
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("LoginPage automatic sign-in with a saved jwt", () => {
  it("never draws the email and password fields while the saved session is checked", async () => {
    vi.spyOn(ApiHelper, "postAnonymous").mockReturnValue(new Promise(() => {}) as any);
    await mount({ jwt: "saved-jwt" });
    expect(ApiHelper.postAnonymous).toHaveBeenCalledWith("/users/login", { jwt: "saved-jwt" }, "MembershipApi");
    expect(sawCredentialField).toBe(false);
    expect(container!.querySelector("#login-email-field")).toBeNull();
  });

  it("shows the sign-in form when there is no saved jwt", async () => {
    vi.spyOn(ApiHelper, "postAnonymous");
    await mount();
    expect(container!.querySelector("#login-email-field")).not.toBeNull();
    expect(container!.querySelector("#login-password-field")).not.toBeNull();
  });

  it("shows the sign-in form once a saved jwt is refused", async () => {
    vi.spyOn(ApiHelper, "postAnonymous").mockRejectedValue(new Error("expired"));
    await mount({ jwt: "expired-jwt" });
    expect(container!.querySelector("#login-email-field")).not.toBeNull();
  });
});
