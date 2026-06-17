import { test } from "node:test";
import assert from "node:assert/strict";

// Import from submodules rather than ../src/index: the index injects a tsup build-time define
// (__PACKAGE_VERSION__) that is absent under tsx. Importing providers/index still runs
// initializeProviders(), so the registry is populated. The build/tsc step verifies the index barrel.
import { getProvider, getAllProviders, getProviderConfig, getAvailableProviders } from "../src/providers/index";
import { parsePath, getSegment } from "../src/pathUtils";
import { navigateToPath } from "../src/instructionPathUtils";
import { detectMediaType, isMediaFile, createFolder, createFile } from "../src/utils";
// instructionsToPlaylist was relocated from FormatConverters into utils (a general content
// converter used by B1Church and the playground). Behavior must hold across the move.
import { instructionsToPlaylist } from "../src/utils";
import { getPlaylistWithMeta } from "../playground/formats";

const EXPECTED_IDS = "dropbox lessonschurch aplay jesusfilm signpresenter b1church bibleproject planningcenter cbn highvoltagekids lifechurch".split(" ");
const COMING_SOON_IDS = "awana freeshow gocurriculum iteachchurch ministrystuff".split(" ");
const DEVICE_FLOW_IDS = new Set(["signpresenter", "b1church", "cbn"]);

// --- Registry ---

test("registry holds exactly the 11 built-in providers", () => {
  const all = getAllProviders();
  assert.equal(all.length, EXPECTED_IDS.length);
  const ids = all.map(p => p.id).sort();
  assert.deepEqual(ids, [...EXPECTED_IDS].sort());
});

test("getProvider resolves every built-in id and returns null otherwise", () => {
  for (const id of EXPECTED_IDS) {
    const provider = getProvider(id);
    assert.ok(provider, `expected provider for ${id}`);
    assert.equal(provider.id, id);
  }
  assert.equal(getProvider("does-not-exist"), null);
});

test("getProviderConfig returns the provider config or null", () => {
  const config = getProviderConfig("signpresenter");
  assert.ok(config);
  assert.equal(config.id, "signpresenter");
  assert.equal(getProviderConfig("nope"), null);
});

test("getAvailableProviders lists implemented + coming-soon and filters by id", () => {
  const all = getAvailableProviders();
  const implemented = all.filter(p => p.implemented);
  assert.equal(implemented.length, EXPECTED_IDS.length);
  for (const id of COMING_SOON_IDS) {
    const info = all.find(p => p.id === id);
    assert.ok(info, `expected coming-soon entry for ${id}`);
    assert.equal(info.implemented, false);
  }
  const filtered = getAvailableProviders(["dropbox", "awana"]);
  assert.equal(filtered.length, 2);
});

// --- Provider contract (data-driven over all providers) ---

test("every provider satisfies the IProvider shape", () => {
  for (const provider of getAllProviders()) {
    assert.equal(typeof provider.id, "string");
    assert.equal(typeof provider.name, "string");
    assert.equal(provider.config.id, provider.id);
    assert.equal(typeof provider.requiresAuth, "boolean");
    assert.ok(Array.isArray(provider.authTypes));
    const caps = provider.capabilities;
    for (const key of ["browse", "playlist", "instructions", "mediaLicensing"]) {
      assert.equal(typeof (caps as Record<string, unknown>)[key], "boolean", `${provider.id}.capabilities.${key}`);
    }
    assert.equal(typeof provider.browse, "function");
    assert.equal(typeof provider.supportsDeviceFlow, "function");
    assert.equal(typeof provider.supportsDeviceFlow(), "boolean");
  }
});

test("supportsDeviceFlow matches the device-flow providers", () => {
  for (const provider of getAllProviders()) {
    assert.equal(provider.supportsDeviceFlow(), DEVICE_FLOW_IDS.has(provider.id), provider.id);
  }
});

// --- Auth surface that B1Admin's ContentProviderAuthManager drives generically ---

test("device-flow providers expose initiate/poll methods (B1Admin contract)", () => {
  for (const id of DEVICE_FLOW_IDS) {
    const provider = getProvider(id) as any;
    assert.equal(typeof provider.initiateDeviceFlow, "function", `${id}.initiateDeviceFlow`);
    assert.equal(typeof provider.pollDeviceFlowToken, "function", `${id}.pollDeviceFlowToken`);
  }
});

test("signpresenter exposes the full PKCE method set (B1Admin contract)", () => {
  const provider = getProvider("signpresenter") as any;
  for (const method of ["generateCodeVerifier", "buildAuthUrl", "exchangeCodeForTokens"]) {
    assert.equal(typeof provider[method], "function", `signpresenter.${method}`);
  }
});

test("dropbox exposes its RN-specific auth methods and no device flow (FreePlay contract)", () => {
  const provider = getProvider("dropbox") as any;
  assert.equal(typeof provider.buildAuthUrlFromChallenge, "function");
  assert.equal(typeof provider.exchangeCodeForTokens, "function");
  assert.equal(provider.supportsDeviceFlow(), false);
});

test("generateCodeVerifier returns a 64-char PKCE string", () => {
  const provider = getProvider("signpresenter") as any;
  const verifier: string = provider.generateCodeVerifier();
  assert.equal(verifier.length, 64);
  assert.match(verifier, /^[A-Za-z0-9\-._~]{64}$/);
});

// --- Offline browse (depth 0 is pure, no network) ---

test("depth-0 browse returns the provider root folder without network", async () => {
  const sign = await getProvider("signpresenter")!.browse(null);
  assert.equal(sign.length, 1);
  assert.equal(sign[0].type, "folder");
  assert.equal((sign[0] as any).path, "/playlists");

  const aplay = await getProvider("aplay")!.browse(null);
  assert.equal((aplay[0] as any).path, "/modules");
  assert.equal((aplay[0] as any).title, "Modules");

  const b1 = await getProvider("b1church")!.browse(null);
  assert.equal((b1[0] as any).path, "/ministries");
});

// --- pathUtils ---

test("parsePath splits segments and computes depth", () => {
  assert.deepEqual(parsePath("/a/b/c"), { segments: ["a", "b", "c"], depth: 3 });
  assert.deepEqual(parsePath("a/b"), { segments: ["a", "b"], depth: 2 });
  for (const empty of [null, undefined, "", "/"]) {
    assert.deepEqual(parsePath(empty as string), { segments: [], depth: 0 });
  }
});

test("getSegment returns the indexed segment or null", () => {
  assert.equal(getSegment("/a/b/c", 1), "b");
  assert.equal(getSegment("/a", 5), null);
});

// --- instructionPathUtils (used by B1Admin + B1App) ---

test("navigateToPath walks the dot-notation tree", () => {
  const tree = {
    name: "T",
    items: [
      { id: "a", label: "A", children: [{ id: "a0", label: "A0" }, { id: "a1", label: "A1", children: [{ id: "a1x", label: "A1X" }] }] },
      { id: "b", label: "B" }
    ]
  };
  assert.equal(navigateToPath(tree, "0")?.id, "a");
  assert.equal(navigateToPath(tree, "1")?.id, "b");
  assert.equal(navigateToPath(tree, "0.1")?.id, "a1");
  assert.equal(navigateToPath(tree, "0.1.0")?.id, "a1x");
  assert.equal(navigateToPath(tree, "9"), null);
  assert.equal(navigateToPath(tree, ""), null);
  assert.equal(navigateToPath(tree, "x"), null);
});

// --- utils ---

test("detectMediaType honours explicit type then extension", () => {
  assert.equal(detectMediaType("https://x/clip.mp4"), "video");
  assert.equal(detectMediaType("https://x/pic.jpg"), "image");
  assert.equal(detectMediaType("https://stream.mux.com/abc"), "video");
  assert.equal(detectMediaType("https://x/file", "video"), "video");
  assert.equal(detectMediaType("https://x/file", "image/png"), "image");
  assert.equal(detectMediaType("https://x/no-extension"), "image");
});

test("isMediaFile / createFolder / createFile build the expected shapes", () => {
  assert.equal(isMediaFile("a.mp4"), true);
  assert.equal(isMediaFile("a.txt"), false);

  const folder = createFolder("f1", "Folder", "/p", "thumb.jpg", true);
  assert.equal(folder.type, "folder");
  assert.equal(folder.id, "f1");
  assert.equal(folder.path, "/p");
  assert.equal(folder.isLeaf, true);

  const file = createFile("c1", "Clip", "https://x/clip.mp4");
  assert.equal(file.type, "file");
  assert.equal(file.mediaType, "video");
  assert.equal(file.url, "https://x/clip.mp4");
});

// --- instructionsToPlaylist (relocated function: behavior must be preserved) ---

test("instructionsToPlaylist flattens downloadable leaves into files", () => {
  const instructions = {
    name: "Plan",
    items: [
      {
        id: "sec",
        itemType: "section",
        label: "Section",
        children: [{ id: "f1", itemType: "file", label: "Clip One", downloadUrl: "https://x/v.mp4", seconds: 10 }]
      }
    ]
  };
  const files = instructionsToPlaylist(instructions);
  assert.equal(files.length, 1);
  assert.equal(files[0].type, "file");
  assert.equal(files[0].id, "f1");
  assert.equal(files[0].url, "https://x/v.mp4");
  assert.equal(files[0].mediaType, "video");
  assert.equal(files[0].seconds, 10);
});

// --- Playground shim fallback (regression: Jesus Film / High Voltage Kids return null from
//     getPlaylist at collection depth, so the playlist view must derive from instructions) ---

test("getPlaylistWithMeta derives a playlist from instructions when getPlaylist yields nothing", async () => {
  const stub = {
    capabilities: { browse: true, playlist: true, instructions: true, mediaLicensing: false },
    getPlaylist: async () => null,
    getInstructions: async () => ({ name: "S", items: [{ id: "f1", itemType: "file", label: "Clip", downloadUrl: "https://x/v.mp4", seconds: 5 }] })
  } as any;

  const { data, meta } = await getPlaylistWithMeta(stub, "/collection", null);
  assert.equal(data?.length, 1);
  assert.equal(data?.[0].url, "https://x/v.mp4");
  assert.equal(meta.isNative, false);
  assert.equal(meta.sourceFormat, "instructions");
});

test("getPlaylistWithMeta prefers the native playlist when getPlaylist returns files", async () => {
  const stub = {
    capabilities: { browse: true, playlist: true, instructions: true, mediaLicensing: false },
    getPlaylist: async () => [{ type: "file", id: "n1", title: "Native", mediaType: "video", url: "https://x/n.mp4" }],
    getInstructions: async () => { throw new Error("instructions fallback should not run when playlist is native"); }
  } as any;

  const { data, meta } = await getPlaylistWithMeta(stub, "/leaf", null);
  assert.equal(data?.[0].id, "n1");
  assert.equal(meta.isNative, true);
});
