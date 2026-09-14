import { test } from "node:test";
import assert from "node:assert/strict";

import { getProvider } from "../src/providers/index";
import { DEFAULT_SLIDE_SECONDS } from "../src/providers/freeShow/FreeShowInterfaces";
import { parseShowExport, showToFiles, slideSeconds } from "../src/providers/freeShow/FreeShowConverters";
import announcementsShow from "../src/providers/freeShow/announcements.show.json";
import { FreeShowProvider } from "../src/providers/freeShow";
import { isContentFolder } from "../src/interfaces";

test("parseShowExport reads the FreeShow [id, show] export tuple", () => {
  const parsed = parseShowExport(announcementsShow);
  assert.ok(parsed);
  assert.equal(parsed.id, "2f357194dfc");
  assert.equal(parsed.show.name, "Announcements");
});

test("showToFiles maps backgrounds, timers, and nextAfterMedia", () => {
  const parsed = parseShowExport(announcementsShow)!;
  const files = showToFiles(parsed.show);
  assert.equal(files.length, 4);

  assert.equal(files[0].mediaType, "video");
  assert.equal(files[0].seconds, undefined);
  assert.equal(files[0].loop, true);
  assert.ok(files[0].url.includes("stream.mux.com"));

  assert.equal(files[1].mediaType, "image");
  assert.equal(files[1].seconds, 7);

  assert.equal(files[2].mediaType, "video");
  assert.equal(files[2].seconds, undefined);

  assert.equal(files[3].mediaType, "image");
  assert.equal(files[3].seconds, 7);
  assert.equal(files[3].title, "Theme");
});

test("slideSeconds falls back to 5s when the layout has no timer", () => {
  assert.equal(slideSeconds({ id: "x" }, "image"), DEFAULT_SLIDE_SECONDS);
  assert.equal(slideSeconds({ id: "x", nextTimer: 12 }, "image"), 12);
  assert.equal(slideSeconds({ id: "x", actions: { nextAfterMedia: true } }, "video"), undefined);
});

test("FreeShowProvider browse lists the mocked Announcements show as a leaf", async () => {
  const provider = getProvider("freeshow")!;
  assert.equal(provider.authTypes[0], "network_discovery");
  assert.equal(provider.requiresAuth, true);

  const items = await provider.browse(null);
  assert.equal(items.length, 1);
  assert.ok(isContentFolder(items[0]));
  assert.equal(items[0].title, "Announcements");
  assert.equal(items[0].isLeaf, true);
  assert.equal(items[0].path, "/2f357194dfc");
});

test("FreeShowProvider getPlaylist returns the announcement loop", async () => {
  const provider = getProvider("freeshow")!;
  const files = await provider.getPlaylist!("/2f357194dfc");
  assert.ok(files);
  assert.equal(files.length, 4);
  assert.ok(files.every(file => file.loop === true));
});

test("discoverInstances returns the mock machine by default", async () => {
  const provider = new FreeShowProvider();
  const instances = await provider.discoverInstances();
  assert.equal(instances.length, 1);
  assert.equal(instances[0].name, "This PC");
});

test("injected discoverer replaces the mock scan", async () => {
  const provider = new FreeShowProvider();
  provider.setDiscoverer(async () => [{ id: "a", name: "Living Room", host: "tv.local", ip: "10.0.0.8", port: 5505 }]);
  const instances = await provider.discoverInstances();
  assert.equal(instances[0].name, "Living Room");
});
