import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiHelper } from "@churchapps/helpers";
import { Forgot } from "../components/Forgot";
import { LoginSetPassword } from "../components/LoginSetPassword";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const mount = () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<LoginSetPassword
      appName="B1 Admin"
      appUrl="http://localhost:3101"
      auth="one-time-reset-token"
      email="member@example.com"
      isSubmitting={false}
      setErrors={vi.fn()}
      setShowForgot={vi.fn()}
      login={vi.fn()}
    />);
  });
};

const setValue = (selector: string, value: string) => {
  const input = container?.querySelector(selector) as HTMLInputElement | null;
  if (!input) throw new Error(`Missing input ${selector}`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!setter) throw new Error("Input value setter is unavailable");
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const dispatchInput = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!setter) throw new Error("Input value setter is unavailable");
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

beforeEach(() => vi.restoreAllMocks());
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("LoginSetPassword", () => {
  it("submits a one-time password token only once while the request is pending", async () => {
    let finishSave: ((result: any) => void) | undefined;
    const post = vi.spyOn(ApiHelper, "postAnonymous").mockImplementation(((path: string) => {
      if (path === "/users/login") return Promise.resolve({});
      return new Promise((resolve) => { finishSave = resolve; });
    }) as any);

    mount();
    setValue("#new-password", "safe-password-1");
    setValue("#verify-password", "safe-password-1");

    const form = container?.querySelector("form");
    if (!form) throw new Error("Missing password form");
    act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(post.mock.calls.filter(([path]) => path === "/users/setPasswordGuid")).toHaveLength(1);
    expect((container?.querySelector("button[type='submit']") as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      finishSave?.({ success: true, email: "member@example.com" });
    });
  });
});

describe("Forgot", () => {
  it("verifies an auto-completed code only once if the form is submitted immediately too", async () => {
    let finishVerify: ((result: any) => void) | undefined;
    const post = vi.spyOn(ApiHelper, "postAnonymous").mockImplementation(((path: string) => {
      if (path === "/users/forgot") return Promise.resolve({ emailed: true });
      return new Promise((resolve) => { finishVerify = resolve; });
    }) as any);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(<Forgot registerCallback={vi.fn()} loginCallback={vi.fn()} onVerified={vi.fn()} />));

    setValue("#forgot-email", "member@example.com");
    const requestForm = container.querySelector("form");
    if (!requestForm) throw new Error("Missing email form");
    await act(async () => {
      requestForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const digits = Array.from(container.querySelectorAll("input[type='text']")) as HTMLInputElement[];
    expect(digits).toHaveLength(6);
    for (const [index, digit] of ["1", "2", "3", "4", "5", "6"].entries()) dispatchInput(digits[index], digit);

    const codeForm = container.querySelector("form");
    if (!codeForm) throw new Error("Missing verification form");
    act(() => codeForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(post.mock.calls.filter(([path]) => path === "/users/verifyCode")).toHaveLength(1);
    await act(async () => { finishVerify?.({ authGuid: "verified-test-token" }); });
  });
});
