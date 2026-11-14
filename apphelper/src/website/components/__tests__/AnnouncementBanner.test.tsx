import React from "react";
import { act } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnnouncementBanner, type AnnouncementConfig } from "../AnnouncementBanner";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const DAY = 24 * 60 * 60 * 1000;
const config: AnnouncementConfig = { text: "Thanksgiving dinner is this Sunday after the second service", linkUrl: "/thanksgiving", linkText: "Thanksgiving" };

// Node's own (file-less) localStorage global shadows jsdom's, so give each test fresh in-memory stores.
class MemoryStorage {
  private items = new Map<string, string>();
  get length() { return this.items.size; }
  key(i: number) { return Array.from(this.items.keys())[i] ?? null; }
  getItem(k: string) { return this.items.has(k) ? this.items.get(k)! : null; }
  setItem(k: string, v: string) { this.items.set(k, String(v)); }
  removeItem(k: string) { this.items.delete(k); }
  clear() { this.items.clear(); }
  keys() { return Array.from(this.items.keys()); }
}
let local: MemoryStorage;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const banner = () => container!.querySelector(".announcement-banner");
const storedKeys = () => local.keys().filter((k) => k.startsWith("announcement-dismissed-"));

const mount = async (c: AnnouncementConfig = config) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<AnnouncementBanner config={c} />); });
};

const unmount = () => {
  if (root) act(() => { root!.unmount(); });
  container?.remove();
  root = null;
  container = null;
};

const dismiss = async () => {
  await act(async () => { (container!.querySelector(".announcement-banner__close") as HTMLButtonElement).click(); });
};

beforeEach(() => {
  local = new MemoryStorage();
  Object.defineProperty(window, "localStorage", { configurable: true, value: local });
  Object.defineProperty(window, "sessionStorage", { configurable: true, value: new MemoryStorage() });
});

afterEach(() => {
  unmount();
  vi.useRealTimers();
});

describe("AnnouncementBanner", () => {
  it("renders the text and link", async () => {
    await mount();
    expect(banner()?.textContent).toContain(config.text);
    expect(container!.querySelector("a")?.getAttribute("href")).toBe("/thanksgiving");
  });

  it("hides on dismiss and remembers it for a day in localStorage", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-14T12:00:00Z"));
    await mount();
    await dismiss();
    expect(banner()).toBeNull();

    const keys = storedKeys();
    expect(keys).toHaveLength(1);
    expect(Number(local.getItem(keys[0]))).toBe(Date.now() + DAY);
  });

  it("stays hidden on the next visit within the day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-14T12:00:00Z"));
    await mount();
    await dismiss();
    unmount();

    vi.setSystemTime(new Date("2026-11-15T11:00:00Z"));
    await mount();
    expect(banner()).toBeNull();
  });

  it("comes back after a day and clears the stale key", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-14T12:00:00Z"));
    await mount();
    await dismiss();
    unmount();

    vi.setSystemTime(new Date("2026-11-15T12:00:01Z"));
    await mount();
    expect(banner()).not.toBeNull();
    expect(storedKeys()).toHaveLength(0);
  });

  it("shows a changed announcement right away", async () => {
    await mount();
    await dismiss();
    unmount();

    await mount({ ...config, text: "Christmas Eve service at 6pm" });
    expect(banner()).not.toBeNull();
  });

  it("hydrates the server markup without a mismatch, then hides a dismissed banner", async () => {
    const html = renderToString(<AnnouncementBanner config={config} />);
    await mount();
    await dismiss();
    unmount();

    container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();
    await act(async () => { root = hydrateRoot(container!, <AnnouncementBanner config={config} />, { onRecoverableError }); });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(banner()).toBeNull();
  });
});
