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

Every provider is defined by a JSON manifest in `src/manifests/providers/`, listed in `src/manifests/index.json`.

- **Pure JSON:** Awana, CBN, SignPresenter and the plan-integration provider have no provider code. The generic `ManifestProvider` runs them.
- **JSON plus a built-in implementation:** APlay, B1.Church, Dropbox, GO! Curriculum, Google Drive, OneDrive, The Bible Project, High Voltage Kids, Jesus Film Project, Lessons.church, Life.Church and FreeShow. Their manifests hold identity, logos, hosts, auth settings and capabilities. `"implementation"` names the TypeScript class that supplies their logic, such as plan merging, cloud-drive paging, LAN discovery and licensing checks.

### JSON Manifest Providers

To add a provider that fits the existing building blocks, write a manifest and add it to the index. No code is needed. A manifest declares:

- **Implementation (optional):** the name of a built-in implementation, for logic JSON can't express, plus free-form `settings` for it to read. A manifest can only name implementations built into the package, so a downloaded manifest never brings code with it.
- **Identity:** `id`, `name`, `logos`, `capabilities`, and `hosts`. `hosts` lists every host the provider may call; requests to any other host are refused.
- **Auth:** `oauthBase`, `clientId`, `scopes`, plus `pkce` and/or `deviceFlow` (`json` or Keycloak-style `form` encoding). A client secret can only be a `"secret:<name>"` reference, resolved from `setProviderSecret` at runtime.
- **Environments:** named value sets read as `{env.*}` in URLs. Hosts switch with `provider.setEnvironment(name)`.
- **Tree:** nested groups. A group is either fixed `static` entries or a `request` + `items` list (filtered by `where`) mapped to folders. Its `children` are the next level; its `leaf` loads the files.
- **Leaf:** a `request`, `from` steps to flatten nested lists, `vars`, a `playlist` file mapping with a `where` filter, optional `downloads`, an instructions `title`, and a `fallback` leaf for when the first list is empty.
- **Options:** `cache` (per-token response cache) and `verifyPaths` (every path segment must exist in its parent's list).

Field values are expressions in a small sandboxed language: paths (`item.name`, `segments[1]`, `parents[0].image`), `+ == != && || ?? ! ?:`, and whitelisted functions (`list`, `trim`, `str`, `isMedia`, `mediaType`, `wpThumb`, `oneOf`, `beforeDaysFromNow`, `isoDate`). Nothing is evaluated as JavaScript. See `src/manifest/types.ts` for the full format.

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
