import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiHelper } from "@churchapps/helpers";
import { SermonElement } from "../SermonElement";

const PLAYLISTS = [{ id: "pl1", title: "Podcast", thumbnail: "https://cdn.example.com/podcast.png" }];
const SERMONS = [
  { id: "s2", playlistId: "pl1", title: "Walking Through Ruth", description: "Donald Clark opens the book of Ruth.", publishDate: "2026-09-05T12:00:00.000Z", thumbnail: "https://cdn.example.com/ep-2.png", videoType: "", videoData: "", videoUrl: "", audioUrl: "https://cdn.example.com/audio/ep-2.mp3" },
  { id: "s1", playlistId: "pl1", title: "Welcome", description: "", publishDate: "2026-08-29T12:00:00.000Z", thumbnail: "", videoType: "youtube", videoData: "abc", videoUrl: "https://www.youtube.com/embed/abc?controls=0", audioUrl: "" }
];

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const mount = async (answers: Record<string, unknown>) => {
  vi.spyOn(ApiHelper, "getAnonymous").mockImplementation((url: string) => Promise.resolve(url.startsWith("/playlists") ? PLAYLISTS : SERMONS) as any);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<SermonElement churchId="church1" appearance={{}} element={{ id: "el1", elementType: "sermons", answers }} />); });
  return container;
};

const click = async (el: Element | null | undefined) => {
  expect(el).toBeTruthy();
  await act(async () => { (el as HTMLElement).click(); });
};

afterEach(async () => {
  if (root) await act(async () => { root!.unmount(); });
  container?.remove();
  root = null;
  container = null;
  vi.restoreAllMocks();
});

describe("SermonElement audio-only sermons", () => {
  it("plays an audio-only sermon picked from a playlist", async () => {
    const el = await mount({});
    await click(el.querySelector(".MuiCard-root"));
    const cards = Array.from(el.querySelectorAll(".MuiCard-root"));
    await click(cards.find((c) => c.textContent?.includes("Walking Through Ruth")));
    const audio = el.querySelector('[data-testid="sermon-audio"]');
    expect(audio?.tagName).toBe("AUDIO");
    expect(audio?.getAttribute("src")).toBe("https://cdn.example.com/audio/ep-2.mp3");
    expect(el.querySelector("iframe")).toBeNull();
  });

  it("plays an audio-only sermon clicked in the list layout", async () => {
    const el = await mount({ layout: "list" });
    await click(el.querySelector(".sermonListItem"));
    expect(el.querySelector('[data-testid="sermon-list"]')).toBeNull();
    expect(el.querySelector('[data-testid="sermon-audio"]')?.getAttribute("src")).toBe("https://cdn.example.com/audio/ep-2.mp3");
  });

  it("still plays a video sermon in the grid layout", async () => {
    const el = await mount({ layout: "grid" });
    await click(el.querySelectorAll(".sermonCard")[1]);
    expect(el.querySelector("iframe")?.getAttribute("src")).toBe("https://www.youtube.com/embed/abc?controls=1");
    expect(el.querySelector('[data-testid="sermon-audio"]')).toBeNull();
  });
});
