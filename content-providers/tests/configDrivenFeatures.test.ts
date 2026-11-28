import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  ManifestProvider,
  fetchProviderConfig,
  loadProviderFromUrl,
  registerProviderFromConfig,
  unregisterProvider,
  getProvider,
  TokenHelper,
  DeviceFlowHelper,
  setProviderSecret,
  setMdnsScanner
} from "../src/index";
import awanaManifest from "../src/manifests/providers/awana.json";
import { ContentProviderAuthData } from "../src/interfaces";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  setMdnsScanner(null);
  setProviderSecret("awana", "");
  unregisterProvider("remote-single");
  unregisterProvider("remote-inline-ds");
  unregisterProvider("custom-lan");
  unregisterProvider("form-auth-provider");
});

test("loadProviderFromUrl downloads, verifies, resolves datasets, and registers a single provider config", async () => {
  const remoteManifest = {
    engine: 1,
    id: "remote-single",
    name: "Remote Single",
    logos: { light: "https://cdn.example.com/logo.png", dark: "https://cdn.example.com/logo.png" },
    hosts: ["cdn.example.com"],
    requiresAuth: false,
    capabilities: { browse: true, playlist: true, instructions: false, mediaLicensing: false },
    apiBase: "https://cdn.example.com",
    datasets: { catalog: "data/catalog.json" },
    routes: [
      { path: "/", browse: "map(datasets.catalog.items, i => folder(i.id, i.title, '/' + i.id, undefined, true))" },
      { path: "/:id", playlist: "with(find(datasets.catalog.items, i => i.id == params.id), it => it ? [file(it.id, it.title, it.url)] : null)" }
    ]
  };
  const remoteDataset = { items: [{ id: "ep1", title: "Episode 1", url: "https://cdn.example.com/ep1.mp4" }] };

  const files: Record<string, unknown> = {
    "https://cdn.example.com/providers/remote-single.json": remoteManifest,
    "https://cdn.example.com/providers/data/catalog.json": remoteDataset
  };
  const verified: string[] = [];
  const mockFetch = (async (url: string) => {
    const body = files[String(url)];
    return body ? new Response(JSON.stringify(body)) : new Response("", { status: 404 });
  }) as typeof fetch;

  const provider = await loadProviderFromUrl("https://cdn.example.com/providers/remote-single.json", {
    fetch: mockFetch,
    verify: (_body, url) => { verified.push(url); return true; }
  });

  assert.equal(getProvider("remote-single"), provider);
  assert.deepEqual(verified, [
    "https://cdn.example.com/providers/remote-single.json",
    "https://cdn.example.com/providers/data/catalog.json"
  ]);
  const root = await provider.browse("/");
  assert.deepEqual(root.map(i => [i.id, i.title]), [["ep1", "Episode 1"]]);
  const playlist = await provider.getPlaylist!("/ep1");
  assert.equal(playlist?.[0].mediaType, "video");
  assert.equal(playlist?.[0].url, "https://cdn.example.com/ep1.mp4");

  assert.equal(unregisterProvider("remote-single"), true);
  assert.equal(getProvider("remote-single"), null);
});

test("registerProviderFromConfig accepts a JSON string with inline datasets (self-contained single file)", async () => {
  const selfContainedJson = JSON.stringify({
    engine: 1,
    id: "remote-inline-ds",
    name: "Inline Catalog",
    logos: { light: "", dark: "" },
    hosts: ["media.example.com"],
    requiresAuth: false,
    capabilities: { browse: true, playlist: true, instructions: false, mediaLicensing: false },
    apiBase: "https://media.example.com",
    datasets: {
      videos: [{ id: "v1", title: "Welcome", url: "https://media.example.com/welcome.mp4" }]
    },
    routes: [
      { path: "/", browse: "map(datasets.videos, v => file(v.id, v.title, v.url))" }
    ]
  });

  const provider = registerProviderFromConfig(selfContainedJson);
  assert.equal(getProvider("remote-inline-ds"), provider);
  const items = await provider.browse("/");
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Welcome");
});

test("form_login providers work purely from JSON config", async () => {
  const calls: { url: string; headers: Record<string, string>; body: string }[] = [];
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), headers: (init?.headers as Record<string, string>) || {}, body: String(init?.body || "") });
    const payload = JSON.parse(String(init?.body || "{}"));
    if (payload.username === "user@church.org" && payload.pass === "secret") {
      return new Response(JSON.stringify({ data: { jwt: "tok-123", refresh: "rt-123", ttl: 7200 } }));
    }
    return new Response("{}", { status: 401 });
  }) as typeof fetch;

  const provider = registerProviderFromConfig({
    engine: 1,
    id: "form-auth-provider",
    name: "Form Auth",
    logos: { light: "", dark: "" },
    hosts: ["api.example.com"],
    requiresAuth: true,
    capabilities: { browse: true, playlist: false, instructions: false, mediaLicensing: false },
    apiBase: "https://api.example.com",
    auth: {
      formLogin: {
        path: "/auth/login",
        usernameField: "username",
        passwordField: "pass",
        tokenExpr: "response.data.jwt",
        refreshTokenExpr: "response.data.refresh",
        expiresInExpr: "response.data.ttl"
      }
    },
    routes: [{ path: "/", browse: "[]" }]
  }) as any;

  assert.deepEqual(provider.authTypes, ["form_login"]);
  const auth = await provider.performLogin("user@church.org", "secret");
  assert.equal(auth?.access_token, "tok-123");
  assert.equal(auth?.refresh_token, "rt-123");
  assert.equal(auth?.expires_in, 7200);
  assert.equal(calls[0].url, "https://api.example.com/auth/login");

  assert.equal(await provider.performLogin("bad@church.org", "wrong"), null);
});

test("arbitrary LAN provider downloaded as JSON automatically uses global mDNS scanner", async () => {
  const scanned: string[] = [];
  setMdnsScanner(async (serviceType) => {
    scanned.push(serviceType);
    return [{ name: "propresenter-main", txt: { ip: "192.168.1.42" } }];
  });

  const provider = registerProviderFromConfig({
    engine: 1,
    id: "custom-lan",
    name: "Custom Presenter",
    logos: { light: "", dark: "" },
    hosts: ["lan"],
    requiresAuth: true,
    capabilities: { browse: true, playlist: false, instructions: false, mediaLicensing: false },
    apiBase: "",
    networkDiscovery: {
      serviceType: "_propresenter._tcp",
      defaultPort: 1025,
      groupBy: "name",
      nameTemplate: "{name} @ {ip}:{port}"
    },
    routes: [{ path: "/", browse: "[]" }]
  }) as any;

  assert.deepEqual(provider.authTypes, ["network_discovery"]);
  const instances = await provider.discoverInstances();
  assert.deepEqual(scanned, ["_propresenter._tcp"]);
  assert.deepEqual(instances, [{ id: "propresenter-main", name: "Custom Presenter @ 192.168.1.42:1025", host: "192.168.1.42", ip: "192.168.1.42", port: 1025 }]);
  const netAuth = provider.toAuth(instances[0]);
  assert.equal(netAuth.scope, "custom-lan");
  assert.deepEqual(provider.selectedInstance(netAuth), instances[0]);
});

test("TokenHelper.refreshToken honors custom tokenUrl (Dropbox) and JSON tokenEncoding (B1.Church)", async () => {
  const calls: { url: string; contentType: string; body: string }[] = [];
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    const headers = (init?.headers as Record<string, string>) || {};
    calls.push({ url: String(url), contentType: headers["Content-Type"], body: String(init?.body || "") });
    return new Response(JSON.stringify({ access_token: "fresh", expires_in: 3600 }));
  }) as typeof fetch;

  const helper = new TokenHelper();
  const baseAuth: ContentProviderAuthData = { access_token: "old", refresh_token: "rt-1", token_type: "Bearer", created_at: 0, expires_in: 60, scope: "" };

  const dropbox = getProvider("dropbox")!;
  await helper.refreshToken(dropbox.config, baseAuth);
  assert.equal(calls[0].url, "https://api.dropboxapi.com/oauth2/token");
  assert.equal(calls[0].contentType, "application/x-www-form-urlencoded");

  const b1 = getProvider("b1church")!;
  await helper.refreshToken(b1.config, { ...baseAuth, refresh_token: "rt-2" });
  assert.equal(calls[1].url, "https://api.churchapps.org/membership/oauth/token");
  assert.equal(calls[1].contentType, "application/json");
  assert.equal(JSON.parse(calls[1].body).grant_type, "refresh_token");
});

test("DeviceFlowHelper works directly with provider.config for form-encoded providers like Awana", async () => {
  setProviderSecret("awana", "awana-sec");
  const calls: { url: string; contentType: string; body: string }[] = [];
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    const headers = (init?.headers as Record<string, string>) || {};
    calls.push({ url: String(url), contentType: headers["Content-Type"], body: String(init?.body || "") });
    return new Response(JSON.stringify({ device_code: "dc", user_code: "1234", verification_uri: "https://sso/d", expires_in: 600 }));
  }) as typeof fetch;

  const awana = new ManifestProvider(awanaManifest);
  const res = await new DeviceFlowHelper().initiateDeviceFlow(awana.config);
  assert.equal(res?.user_code, "1234");
  assert.equal(calls[0].contentType, "application/x-www-form-urlencoded");
  assert.equal(new URLSearchParams(calls[0].body).get("client_secret"), "awana-sec");
});

test("fetchProviderConfig returns manifest, datasets, and live provider for offline persistence", async () => {
  const remoteManifest = {
    engine: 1,
    id: "remote-single",
    name: "Remote Single",
    logos: { light: "", dark: "" },
    hosts: ["cdn.example.com"],
    requiresAuth: false,
    capabilities: { browse: true, playlist: false, instructions: false, mediaLicensing: false },
    apiBase: "https://cdn.example.com",
    datasets: { catalog: "data/catalog.json" },
    routes: [{ path: "/", browse: "map(datasets.catalog, i => file(i.id, i.title, i.url))" }]
  };
  const files: Record<string, unknown> = {
    "https://cdn.example.com/custom.json": remoteManifest,
    "https://cdn.example.com/data/catalog.json": [{ id: "v1", title: "Clip", url: "https://cdn.example.com/v1.mp4" }]
  };
  const mockFetch = (async (url: unknown) => {
    const body = files[String(url)];
    return body ? new Response(JSON.stringify(body)) : new Response("", { status: 404 });
  }) as typeof fetch;

  const fetched = await fetchProviderConfig("https://cdn.example.com/custom.json", { allowUnverified: true, fetch: mockFetch });
  assert.equal(fetched.manifest.id, "remote-single");
  assert.deepEqual(fetched.datasets, { catalog: [{ id: "v1", title: "Clip", url: "https://cdn.example.com/v1.mp4" }] });
  assert.equal(getProvider("remote-single"), fetched.provider);
  assert.equal((await fetched.provider.browse("/")).length, 1);
});

test("structured manifest functions with sequential let bindings validate and run cleanly", () => {
  const provider = new ManifestProvider({
    engine: 1,
    id: "struct-fn-test",
    name: "Struct Fn",
    logos: { light: "", dark: "" },
    hosts: ["api.example.com"],
    requiresAuth: false,
    capabilities: { browse: true, playlist: false, instructions: false, mediaLicensing: false },
    apiBase: "https://api.example.com",
    functions: {
      compute: {
        params: ["x", "y"],
        let: {
          sum: "x + y",
          doubled: "sum * 2"
        },
        return: "doubled + 1"
      }
    },
    routes: [{ path: "/", browse: "[]" }]
  });

  assert.equal(provider.callFunction("compute", 3, 4), 15);
});
