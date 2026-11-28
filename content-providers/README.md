<img align="right" width="150" src="https://raw.githubusercontent.com/ChurchApps/B1Admin/main/public/images/logo.png">

# @churchapps/content-providers

> **ContentProviderHelper** is a TypeScript library for integrating with third-party content providers like Planning Center, Lessons.church, B1.Church, Dropbox, FreeShow, and more. All shared logic (auth flows, LAN/mDNS discovery, HTTP requests, pagination, caching, and content/plan transformations) is fixed shared code, while every provider is defined purely by a JSON config manifest that can be bundled or downloaded remotely at runtime.

## Installation

```bash
npm install @churchapps/content-providers
```

## Usage

### Browse Available Providers

```typescript
import { getAllProviders, getAvailableProviders } from '@churchapps/content-providers';

// Get all registered providers
const providers = getAllProviders();

// Get info about available providers
const available = getAvailableProviders();
console.log(available); // [{ id: 'planningcenter', name: 'Planning Center', ... }]
```

### Use a Specific Provider

```typescript
import { getProvider } from '@churchapps/content-providers';

const provider = getProvider('lessonschurch');

// Browse content
const items = await provider.browse();

// Get playlist or instructions for a leaf path
const playlist = await provider.getPlaylist?.('/lessons/p1/s1/l1/v1');
const instructions = await provider.getInstructions?.('/lessons/p1/s1/l1/v1');
```

### Adding a New Provider by Downloading a Config File

All 16 built-in providers (`aplay`, `awana`, `b1church`, `bibleproject`, `cbn`, `dropbox`, `freeshow`, `gocurriculum`, `googledrive`, `highvoltagekids`, `jesusfilm`, `lessonschurch`, `lifechurch`, `onedrive`, `planningcenter`, `signpresenter`) are pure JSON manifests in `src/manifests/providers/`, listed in `src/manifests/index.json`. Static catalogs ship beside them in `src/manifests/providers/data/` (or can be inlined inside a manifest).

Zero TypeScript code is needed to add or update a provider. Hosts can download a single provider config file or a full provider index at runtime:

```typescript
import { loadProviderFromUrl, loadProviderIndex, registerProviderFromConfig } from "@churchapps/content-providers";

// 1. Download and register a single provider config file over HTTPS
const provider = await loadProviderFromUrl("https://example.org/providers/my-provider.json", {
  verify: (body, url) => verifySignature(body, url) // e.g. Ed25519 against a key built into the app
});

// 2. Or load a whole remote index (adds new providers and updates bundled ones)
const { loaded, skipped } = await loadProviderIndex("https://example.org/providers/index.json", {
  verify: (body, url) => verifySignature(body, url)
});

// 3. Or register an already-parsed JSON config (or JSON string) directly
registerProviderFromConfig(manifestJson);
```

### Fixed Shared Subsystems

Every manifest runs on the same fixed shared code:

- **Auth (`OAuthHelper`, `DeviceFlowHelper`, `FormLoginHelper`, `TokenHelper`):**
  - `oauth_pkce`: form or JSON token exchange (`tokenEncoding`), custom `authorizeUrl`, `tokenUrl`, `authorizeParams`, optional `secret:<name>` client secret, optional `supportsSecretExchange`.
  - `device_flow`: JSON or Keycloak-style form encoding (`encoding: "json" | "form"`), custom `tokenUrl`, `plan_type_id` passthrough.
  - `form_login`: JSON or form credential login (`auth.formLogin`) with configurable fields and response token extraction.
  - `none`: public APIs and static catalogs.
- **Network Discovery (`NetworkDiscoveryHelper`):**
  - Declarative `networkDiscovery` (`serviceType`, `defaultPort`, `groupBy`, `nameTemplate`, `probe`).
  - Hosts register one mDNS scanner via `setMdnsScanner(serviceType => ...)` at startup and any LAN provider — including newly downloaded ones — discovers local servers automatically.
- **API & Runtime (`ManifestRuntime`):**
  - Strict host allowlist (`hosts`, plus `"lan"` for RFC1918/loopback addresses and host-supplied `secretUrl`).
  - GET/POST, URL templates with automatic segment encoding, query params, JSON/form bodies, `"bearer" | "optional" | "none"` auth, raw responses, timeouts, declarative pagination, per-call request deduplication, TTL/shared caching, per-instance `state` (`setState`), recursive `procedures`, host `hooks`, and inline or remote `datasets`.
- **Shared Transformations (`transforms.ts`, `PlanHelper`, `utils.ts`):**
  - Content builders (`folder`, `file`, `download`), media/Mux/WordPress helpers (`mediaType`, `isMedia`, `isPlaylistMedia`, `muxStreamUrl`, `muxThumbnail`, `muxPlaybackId`, `wpThumb`), instruction & plan helpers (`filesToInstructions`, `instructionsToPlaylist`, `navigateToPath`, `findFirstThumbnail`, `orderPlanFiles`, `normalizeItemType`), text/markdown helpers (`stripMarkdown`, `truncate`, `truncateLabel`, `slugify`), list/date helpers (`groupBy`, `groupConsecutive`, `compact`, `sortBy`, `localDateOffset`, `timestamp`, `beforeDaysFromNow`), and network auth conversion (`networkAuth`, `networkInstance`).
- **Readable Config Format:**
  - Simple fixed-depth APIs use `tree` (Awana, CBN, Planning Center, SignPresenter).
  - Complex/variable-depth APIs, cloud drives, LAN RPCs, and composite providers (B1.Church, Dropbox, FreeShow, GO! Curriculum, Google Drive, Jesus Film, Lessons.church, OneDrive, static catalogs) use `routes`, `procedures`, `methods`, and structured `functions` (`{ params, let, return }` or short lambdas).
  - Nothing downloaded is ever evaluated as JavaScript; every expression is parsed into an AST, statically validated at load time, and evaluated in a sandbox.

See `src/manifest/types.ts` for the full schema and `src/manifests/providers/` for all 16 provider configs.

## Get Involved

### 🤝 Help Support Us

The only reason this program is free is because of the generous support from users. If you want to support us to keep this free, please head over to [ChurchApps](https://churchapps.org/partner) or [sponsor us on GitHub](https://github.com/sponsors/ChurchApps/). Thank you so much!

### 🏘️ Join the Community

We have a great community for end-users on [Facebook](https://www.facebook.com/churchapps.org). It's a good way to ask questions, get tips and follow new updates. Come join us!

### ⚠️ Report an Issue

If you discover an issue or have a feature request, simply submit it to our [issues log](https://github.com/ChurchApps/ContentProviderHelper/issues). Don't be shy, that's how the program gets better.

### 💬 Join us on Slack

If you would like to contribute in any way, head over to our [Slack Channel](https://join.slack.com/t/livechurchsolutions/shared_invite/zt-i88etpo5-ZZhYsQwQLVclW12DKtVflg) and introduce yourself. We'd love to hear from you.

### 💻 Start Coding

If you'd like to contribute to the project:

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development playground: `npm run dev`
4. Build: `npm run build`

## License

MIT
