import { test, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { AddressInfo } from "node:net";
import os from "node:os";

import { getProvider } from "../src/providers/index";
import { DEFAULT_SLIDE_SECONDS, FreeShowShow } from "../src/providers/freeShow/FreeShowInterfaces";
import { showToFiles, slideSeconds } from "../src/providers/freeShow/FreeShowConverters";
import { freeShowMediaUrl, freeShowRequest } from "../src/providers/freeShow/FreeShowApi";
import { FreeShowProvider, freeShowServicesToInstances, networkInstanceToAuth } from "../src/providers/freeShow";
import { isContentFolder } from "../src/interfaces";

const announcements: FreeShowShow = {
  name: "Announcements",
  settings: { activeLayout: "L" },
  slides: { s1: { group: "Kids" }, s2: { group: "Theme" }, s3: { group: "Local video" } },
  layouts: {
    L: {
      slides: [
        { id: "s1", background: "m1", actions: { nextAfterMedia: true } },
        { id: "s2", background: "m2", nextTimer: 7, end: true },
        { id: "s3", background: "m3" }
      ]
    }
  },
  media: {
    m1: { path: "https://stream.mux.com/abc/capped-1080p.mp4" },
    m2: { path: "C:\\Media\\theme.jpg", name: "Theme" },
    m3: { path: "C:\\Media\\intro.mp4" }
  }
};

const responses: Record<string, unknown> = {
  get_projects: { p1: { name: "Sunday", shows: [{ id: "show1" }, { id: "D:\\Pics\\welcome.png", type: "image", name: "Welcome" }, { id: "sec", type: "section" }] }, p2: { name: "Old", archived: true } },
  get_project: { name: "Sunday", shows: [{ id: "show1" }, { id: "D:\\Pics\\welcome.png", type: "image", name: "Welcome" }, { id: "sec", type: "section" }] },
  get_shows: { show2: { name: "Zebra" }, show1: { name: "Announcements" } },
  get_show: announcements
};

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", chunk => (body += chunk));
  req.on("end", () => {
    const { action } = JSON.parse(body || "{}");
    if (!(action in responses)) return void res.writeHead(204).end();
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ action, data: responses[action] }));
  });
});
const ready = new Promise<number>(resolve => server.listen(0, "0.0.0.0", () => resolve((server.address() as AddressInfo).port)));
after(() => server.close());

const instanceAt = async () => ({ id: "x", name: "FreeShow", host: "127.0.0.1", ip: "127.0.0.1", port: await ready });

test("slideSeconds falls back to 5s when the layout has no timer", () => {
  assert.equal(slideSeconds({ id: "x" }, "image"), DEFAULT_SLIDE_SECONDS);
  assert.equal(slideSeconds({ id: "x", nextTimer: 12 }, "image"), 12);
  assert.equal(slideSeconds({ id: "x", actions: { nextAfterMedia: true } }, "video"), undefined);
});

test("freeShowMediaUrl passes online media, proxies local images, drops local video", () => {
  const instance = { ip: "10.0.0.5", port: 5506 };
  assert.equal(freeShowMediaUrl(instance, "https://x.com/a.mp4"), "https://x.com/a.mp4");
  assert.ok(freeShowMediaUrl(instance, "C:\\a b\\c.jpg")!.startsWith("http://10.0.0.5:5506/?action=get_thumbnail&data="));
  assert.equal(freeShowMediaUrl(instance, "C:\\a\\c.mp4"), null);
  assert.equal(freeShowMediaUrl(instance, "C:\\a\\c.pdf"), null);
});

test("showToFiles maps backgrounds and timers through the resolver", () => {
  const files = showToFiles(announcements, path => freeShowMediaUrl({ ip: "h", port: 1 }, path));
  assert.equal(files.length, 2);
  assert.equal(files[0].mediaType, "video");
  assert.equal(files[0].seconds, undefined);
  assert.equal(files[1].mediaType, "image");
  assert.equal(files[1].seconds, 7);
  assert.equal(files[1].thumbnail, undefined);
  assert.ok(files.every(file => file.loop === true));
});

test("freeShowRequest unwraps data and rejects non-FreeShow servers", async () => {
  const instance = await instanceAt();
  assert.deepEqual(await freeShowRequest(instance, "get_shows"), responses.get_shows);
  assert.equal(await freeShowRequest(instance, "next_slide"), null);
  await assert.rejects(freeShowRequest({ ip: "127.0.0.1", port: 1 }, "get_shows", {}, 500));
});

test("servicesToInstances groups a machine's services and prefers the address that answers", async () => {
  const lanIp = Object.values(os.networkInterfaces()).flat().find(net => net && net.family === "IPv4" && !net.internal)?.address;
  const port = await ready;
  const services = [
    { name: "freeshow-REMOTE-abc123", txt: { ip: "192.0.2.1", ips: `192.0.2.1,${lanIp || "192.0.2.2"},localhost` } },
    { name: "freeshow-STAGE-abc123", host: "127.0.0.1", txt: { ip: "192.0.2.1" } },
    { name: "freeshow-REMOTE-zzz999", txt: { ip: "169.254.1.1", ips: "localhost" } }
  ];
  const instances = await freeShowServicesToInstances(services, port);
  assert.equal(instances.length, 1);
  assert.equal(instances[0].id, "abc123");
  assert.equal(instances[0].port, port);
  assert.equal(instances[0].ip, lanIp || "192.0.2.1");
});

test("FreeShowProvider browses projects and shows from the machine", async () => {
  const provider = getProvider("freeshow")!;
  assert.equal(provider.authTypes[0], "network_discovery");
  const auth = networkInstanceToAuth(await instanceAt());

  const root = await provider.browse(null, auth);
  assert.deepEqual(root.map(item => item.path), ["/projects", "/shows"]);

  const projects = await provider.browse("/projects", auth);
  assert.equal(projects.length, 1);
  assert.ok(isContentFolder(projects[0]) && projects[0].isLeaf);
  assert.equal(projects[0].path, "/projects/p1");

  const shows = await provider.browse("/shows", auth);
  assert.deepEqual(shows.map(item => item.title), ["Announcements", "Zebra"]);
});

test("FreeShowProvider builds playlists for shows and projects", async () => {
  const provider = getProvider("freeshow")!;
  const auth = networkInstanceToAuth(await instanceAt());

  const showFiles = await provider.getPlaylist!("/shows/show1", auth);
  assert.equal(showFiles!.length, 2);

  const projectFiles = await provider.getPlaylist!("/projects/p1", auth);
  assert.deepEqual(projectFiles!.map(file => file.title), ["Kids", "Theme", "Welcome"]);
  assert.equal(new Set(projectFiles!.map(file => file.id)).size, 3);
  assert.equal(projectFiles![2].seconds, DEFAULT_SLIDE_SECONDS);

  const instructions = await provider.getInstructions!("/projects/p1", auth);
  assert.equal(instructions!.name, "Sunday");
});

test("discoverInstances uses the injected discoverer, empty otherwise", async () => {
  const provider = new FreeShowProvider();
  assert.deepEqual(await provider.discoverInstances(), []);
  provider.setDiscoverer(async () => [{ id: "a", name: "Living Room", host: "tv.local", ip: "10.0.0.8", port: 5506 }]);
  assert.equal((await provider.discoverInstances())[0].name, "Living Room");
});
