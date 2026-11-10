import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../donations", () => ({ NonAuthDonation: (props: { recaptchaSiteKey: string }) => <div data-testid="donation-form" data-sitekey={props.recaptchaSiteKey} /> }));
vi.mock("../../helpers", () => ({ EnvironmentHelper: { init: () => {} } }));

import { NonAuthDonationWrapper } from "../donate/NonAuthDonationWrapper";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const mount = (props: { recaptchaSiteKey?: string } = {}) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(<NonAuthDonationWrapper churchId="CHU1" {...props} />); });
  return container;
};

afterEach(() => {
  if (root) act(() => { root!.unmount(); });
  container?.remove();
  root = null;
  container = null;
  vi.unstubAllEnvs();
});

describe("NonAuthDonationWrapper reCAPTCHA site key", () => {
  it("shows the missing-key error when there is no key and no bypass", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_BYPASS_RECAPTCHA", "");
    const el = mount();
    expect(el.textContent).toContain("reCAPTCHA site key is missing");
    expect(el.querySelector("[data-testid='donation-form']")).toBeNull();
  });

  it("renders the form without the error when the captcha is bypassed", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_BYPASS_RECAPTCHA", "true");
    const el = mount();
    expect(el.textContent).not.toContain("reCAPTCHA site key is missing");
    expect(el.querySelector("[data-testid='donation-form']")).not.toBeNull();
  });

  it("passes a provided key through to the form", () => {
    vi.stubEnv("NEXT_PUBLIC_BYPASS_RECAPTCHA", "");
    const el = mount({ recaptchaSiteKey: "site-key" });
    expect(el.querySelector("[data-testid='donation-form']")?.getAttribute("data-sitekey")).toBe("site-key");
  });
});
