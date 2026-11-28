<img align="right" width="150" src="https://raw.githubusercontent.com/ChurchApps/B1Admin/main/public/images/logo.png">

# @churchapps/content-providers

> **ContentProviderHelper** is a TypeScript library for integrating with third-party content providers like Planning Center, Lessons.church, and more. It provides a unified interface for browsing media libraries, handling OAuth authentication, and retrieving content for playback in church presentation software.

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

const provider = getProvider('planningcenter');

// Browse content
const items = await provider.browse();

// Get presentations/playlist for a service
const plan = await provider.getPresentations(serviceId);
```

### Providers

Every provider is defined by a JSON manifest in `src/manifests/providers/`, listed in `src/manifests/index.json`. Static catalogs (Bible Project, High Voltage Kids, Life.Church) ship beside them in `src/manifests/providers/data/`.

- **Pure JSON (15):** APlay, Awana, CBN, Dropbox, FreeShow, GO! Curriculum, Google Drive, Jesus Film Project, Lessons.church, Life.Church, OneDrive, SignPresenter, The Bible Project, High Voltage Kids and the plan-integration provider. The generic `ManifestProvider` runs them.
- **JSON plus a built-in implementation (1):** B1.Church. Its manifest holds identity, logos, hosts, auth settings and capabilities, and `"implementation": "b1church"` names the TypeScript class that merges plans with lesson and external content.

### JSON Manifest Providers

To add a provider, write a manifest and add it to the index. A manifest declares:

- **Identity:** `id`, `name`, `logos`, `capabilities`, and `hosts`. `hosts` lists every host the provider may call; requests to any other host are refused. `"lan"` allows local-network addresses (for apps on the same network, like FreeShow).
- **Auth:** `oauthBase`, `clientId`, `scopes`, plus `pkce` and/or `deviceFlow` (`json` or Keycloak-style `form` encoding). `authorizeUrl`, `tokenUrl` and `authorizeParams` cover providers with non-standard OAuth (Google, Dropbox). A client secret can only be a `"secret:<name>"` reference, resolved from `setProviderSecret` at runtime. `authTypes` overrides the derived sign-in types (e.g. `network_discovery`).
- **Environments:** named value sets read as `{env.*}` in URLs. Hosts switch with `provider.setEnvironment(name)`.
- **Content:** either a `tree` or `routes`.
  - A **tree** is nested groups: fixed `static` entries, or a `request` + `items` list mapped to folders, with `children` for the next level and a `leaf` that loads files. Good for simple fixed-depth APIs (Awana, CBN, SignPresenter).
  - **Routes** match path patterns (`/catalog/:id`, `/*folders` for any depth) and give each of `browse`, `playlist` and `instructions` an expression or a list of steps. Steps are `let`, `fetch` (GET/POST, query, JSON or form body, paging, raw error responses), `each` (optionally in parallel), `call` (named `procedures`, recursion allowed), `if`, `cache` (per-token or shared, with "keep while" freshness), `hook`, `fail` and `return`.
- **Functions:** named lambdas in the expression language, shared by every route, method and other function.
- **Methods:** extra provider methods such as `getCurrentPlan`, `checkMediaLicense`, `getCatalog` or `discoverInstances`, written as steps.
- **Hooks:** setter methods a host app calls to plug in its own functions (e.g. FreePlay's `setDiscoverer` for mDNS, `setCatalogLoader` for the GO! relay). Steps call them with `hook`, with an `else` fallback.
- **Datasets and secrets:** static JSON files beside the manifest (`datasets.catalog`), and declared host secrets readable with `secret(name)` or used as a trusted `secretUrl`.
- **Settings:** free-form values the manifest's expressions read (IDs, constants, lookup tables).

Expressions are a small sandboxed language: paths (`item.name`, `segments[1]`), literals, `[...]` and `{ ... }` with spread, lambdas (`x => x.id`), arithmetic and comparisons, `&& || ?? ?:`, and whitelisted functions for lists (`map`, `filter`, `find`, `sortBy`, `groupConsecutive`, ...), objects, strings and regexes (`replace`, `match`, `test`), URLs, media types and instructions. Nothing is evaluated as JavaScript, and nothing in an expression can make a request or reach host code. Validation parses every expression and checks every name when a manifest loads. See `src/manifest/types.ts` for the full format and `src/manifests/providers/` for examples from simple (CBN) to involved (Lessons.church, GO! Curriculum).

Hosts can load more providers, or updated manifests for existing ones, at runtime from a hosted index. Every file must pass the host's signature check:

```typescript
import { loadProviderIndex } from "@churchapps/content-providers";

const { loaded, skipped } = await loadProviderIndex("https://example.org/providers/index.json", {
  verify: (body, url) => verifySignature(body, url) // e.g. Ed25519 against a key built into the app
});
```

### Create a Custom Provider

```typescript
// Prefer a JSON manifest (see above). For logic JSON can't express, extend ConfiguredProvider so identity and auth
// settings still come from a manifest, and add the class to src/providers/implementations.ts.
import { BaseProvider, registerProvider } from '@churchapps/content-providers';

class MyProvider extends BaseProvider {
  // Declare id/name/logos/config/requiresAuth/authTypes/capabilities and implement browse().
  // Every declared authType/capability must be backed by its IProvider methods (enforced by
  // tests/contentProviders.test.ts):
  //   oauth_pkce   -> generateCodeVerifier / buildAuthUrl / buildAuthUrlFromChallenge / exchangeCodeForTokens
  //                   (OAuthHelper implements the standard flow; delegate to it like APlayProvider)
  //   device_flow  -> initiateDeviceFlow / pollDeviceFlowToken (see DeviceFlowHelper)
  //   form_login   -> performLogin
  //   network_discovery -> discoverInstances
  //   playlist / instructions / mediaLicensing -> getPlaylist / getInstructions / checkMediaLicense
  // The protected apiRequest() helper performs authenticated JSON fetches against config.apiBase.
}

registerProvider(new MyProvider());
```

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
