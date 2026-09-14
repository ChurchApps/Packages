import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiHelper } from "@churchapps/helpers";
import { PodcastElement } from "../PodcastElement";

const FEED = {
  title: "Grace Community Podcast",
  description: "Weekly conversations from Grace Community Church.",
  image: "https://cdn.example.com/artwork.png",
  episodes: [
    { guid: "ep-2", title: "Walking Through Ruth", pubDate: "2026-09-05T12:00:00.000Z", description: "Donald Clark opens the book of Ruth.", audioUrl: "https://cdn.example.com/audio/ep-2.mp3", audioType: "audio/mpeg", duration: 2853, image: "https://cdn.example.com/ep-2.png", episodeNumber: 2 },
    { guid: "ep-1", title: "Welcome to the Podcast", pubDate: "2026-08-29T12:00:00.000Z", description: "Our very first episode.", audioUrl: "https://cdn.example.com/audio/ep-1.mp3", audioType: "audio/mpeg", duration: 1800, image: "", episodeNumber: 1 },
    { guid: "ep-0", title: "Trailer", pubDate: "", description: "", audioUrl: "https://cdn.example.com/audio/trailer.mp3", audioType: "audio/mpeg", duration: 0, image: "", episodeNumber: null }
  ]
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const mount = async (answers: Record<string, unknown>, onEdit?: () => void) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<PodcastElement element={{ id: "el1", elementType: "podcast", answers }} onEdit={onEdit} />); });
  return container;
};

afterEach(async () => {
  if (root) await act(async () => { root!.unmount(); });
  container?.remove();
  root = null;
  container = null;
  vi.restoreAllMocks();
});

describe("PodcastElement", () => {
  it("renders the feed header and one player per episode", async () => {
    const spy = vi.spyOn(ApiHelper, "getAnonymous").mockResolvedValue(FEED);
    const el = await mount({ feedUrl: "https://feeds.example.com/podcast.xml", itemCount: "10" });

    expect(spy).toHaveBeenCalledWith("/podcast/feed?url=" + encodeURIComponent("https://feeds.example.com/podcast.xml"), "ContentApi");
    expect(el.querySelector(".podcastTitle")?.textContent).toBe("Grace Community Podcast");
    const episodes = el.querySelectorAll('[data-testid="podcast-episode"]');
    expect(episodes).toHaveLength(3);
    expect(episodes[0].id).toBe("ep-2");
    expect(episodes[0].querySelector("h3")?.textContent).toBe("Walking Through Ruth");
    expect(episodes[0].querySelector(".podcastEpisodeMeta")?.textContent).toContain("September 5, 2026");
    expect(episodes[0].querySelector(".podcastEpisodeMeta")?.textContent).toContain("47 min");
    expect(episodes[0].querySelector(".podcastEpisodeDesc")?.textContent).toBe("Donald Clark opens the book of Ruth.");
    expect(episodes[0].querySelector("audio")?.getAttribute("src")).toBe("https://cdn.example.com/audio/ep-2.mp3");
    expect(episodes[1].querySelector("img")).toBeNull();
    // Trailer has no episode number, so it gets a positional anchor.
    expect(episodes[2].id).toBe("ep-1");
  });

  it("honors itemCount and the date/description toggles", async () => {
    vi.spyOn(ApiHelper, "getAnonymous").mockResolvedValue(FEED);
    const el = await mount({ feedUrl: "https://feeds.example.com/podcast.xml", itemCount: "1", showDates: "false", showDescriptions: "false" });

    expect(el.querySelectorAll('[data-testid="podcast-episode"]')).toHaveLength(1);
    expect(el.querySelector(".sermonCardDate")).toBeNull();
    expect(el.querySelector(".podcastEpisodeDesc")).toBeNull();
    expect(el.querySelector(".podcastDesc")).toBeNull();
    expect(el.querySelector("audio")).not.toBeNull();
  });

  it("shows an editor-only hint until a feed URL is set", async () => {
    const spy = vi.spyOn(ApiHelper, "getAnonymous");
    const editing = await mount({ feedUrl: "" }, () => {});
    expect(editing.querySelector('[data-testid="podcast-empty"]')?.textContent).toContain("RSS feed URL");
    expect(spy).not.toHaveBeenCalled();

    await act(async () => { root!.unmount(); });
    container?.remove();
    const published = await mount({ feedUrl: "" });
    expect(published.innerHTML).toBe("");
  });

  it("fails soft when the Api cannot load the feed", async () => {
    vi.spyOn(ApiHelper, "getAnonymous").mockResolvedValue({ error: "Feed URL host is not allowed" });
    const editing = await mount({ feedUrl: "http://localhost/feed" }, () => {});
    expect(editing.querySelector('[data-testid="podcast-error"]')?.textContent).toBe("Podcast: Feed URL host is not allowed");

    await act(async () => { root!.unmount(); });
    container?.remove();
    vi.spyOn(ApiHelper, "getAnonymous").mockRejectedValue(new Error("network"));
    const published = await mount({ feedUrl: "https://feeds.example.com/down.xml" });
    expect(published.querySelector('[data-testid="podcast-error"]')?.textContent).toBe("This podcast is unavailable right now.");
    expect(published.querySelector("audio")).toBeNull();
  });
});
