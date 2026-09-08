import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Login } from "../components/Login";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(dir, rel), "utf8");

const FOOTER_VAR = "--login-footer-height";

// jsdom has no ResizeObserver, and Login bails out of publishing the footer
// height without one, so stand in a stub that fires the callback once.
class ResizeObserverStub {
  constructor(private callback: () => void) {}
  observe() { this.callback(); }
  unobserve() {}
  disconnect() {}
}

const noop = () => {};
const baseProps = {
  login: noop,
  isSubmitting: false,
  setShowRegister: noop,
  setShowForgot: noop,
  setErrors: noop
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const mountLogin = (showFooter?: boolean) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(<Login {...baseProps} showFooter={showFooter} />); });
};

const unmountLogin = () => {
  if (root) act(() => { root!.unmount(); });
  container?.remove();
  root = null;
  container = null;
};

beforeAll(() => {
  (globalThis as any).ResizeObserver = ResizeObserverStub;
});

afterEach(() => {
  unmountLogin();
  document.documentElement.style.removeProperty(FOOTER_VAR);
});

describe("Login footer clearance", () => {
  it("renders the fixed footer above the card", () => {
    mountLogin(true);
    const footer = document.getElementById("login-footer");
    expect(footer).not.toBeNull();
    const inline = footer!.getAttribute("style") || "";
    expect(inline).toContain("position: fixed");
    expect(inline.replace(/\s/g, "")).toContain("z-index:1");
  });

  it("publishes the footer height as a CSS variable while mounted", () => {
    mountLogin(true);
    const footer = document.getElementById("login-footer") as HTMLElement;
    expect(document.documentElement.style.getPropertyValue(FOOTER_VAR)).toBe(`${footer.offsetHeight}px`);
  });

  it("clears the CSS variable on unmount", () => {
    mountLogin(true);
    expect(document.documentElement.style.getPropertyValue(FOOTER_VAR)).not.toBe("");
    unmountLogin();
    expect(document.documentElement.style.getPropertyValue(FOOTER_VAR)).toBe("");
  });

  it("does not render the footer or reserve room when showFooter is omitted", () => {
    mountLogin();
    expect(document.getElementById("login-footer")).toBeNull();
    expect(document.documentElement.style.getPropertyValue(FOOTER_VAR)).toBe("");
  });
});

// LoginPage's init() hits the network on mount, so pin the wrapper reservation
// by reading the source instead of rendering it.
describe("LoginPage wrapper viewport reservation", () => {
  const src = read("../LoginPage.tsx");

  it("sizes the wrapper with the dynamic viewport unit", () => {
    expect(src).toContain('minHeight: "100dvh"');
    expect(src).not.toContain('minHeight: "100vh"');
  });

  it("reserves the fixed footer's height in the wrapper padding", () => {
    expect(src).toContain('paddingBottom: "calc(16px + var(--login-footer-height, 0px))"');
  });
});
