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

### Built-in Providers

- **B1ChurchProvider** - B1.Church plans (merges plan items with lesson venues and external providers)
- **LessonsChurchProvider** - Lessons.church curriculum and add-ons
- **PlanningCenterProvider** - Planning Center Services (browse only)
- **BibleProjectProvider** - Bible Project videos
- **APlayProvider** - A.Play media library
- **DropboxProvider** - Media files from a Dropbox account
- **JesusFilmProvider** - Jesus Film Project (Arclight API)
- **HighVoltageKidsProvider** - High Voltage Kids curriculum (static catalog)
- **LifeChurchProvider** - Life.Church kids curriculum (static catalog)
- **FreeShowProvider** - FreeShow shows discovered on the local network (mocked announcements playlist)

### JSON Manifest Providers

Awana, CBN and SignPresenter have no provider code. Each one is a JSON manifest in `src/manifests/providers/`, run by the generic `ManifestProvider`. `src/manifests/index.json` lists the manifest providers and the "coming soon" entries.

To add a provider that fits the existing building blocks, write a manifest and add it to the index. No code is needed. A manifest declares:

- **Identity:** `id`, `name`, `logos`, `capabilities`, and `hosts`. `hosts` lists every host the provider may call; requests to any other host are refused.
- **Auth:** `oauthBase`, `clientId`, `scopes`, plus `pkce` and/or `deviceFlow` (`json` or Keycloak-style `form` encoding). A client secret can only be a `"secret:<name>"` reference, resolved from `setProviderSecret` at runtime.
- **Environments:** named value sets read as `{env.*}` in URLs. Hosts switch with `provider.setEnvironment(name)`.
- **Tree:** nested groups. A group is either fixed `static` entries or a `request` + `items` list mapped to folders. Its `children` are the next level; its `leaf` loads the files.
- **Leaf:** a `request`, `from` steps to flatten nested lists, `vars`, a `playlist` file mapping with a `where` filter, optional `downloads`, an instructions `title`, and a `fallback` leaf for when the first list is empty.
- **Options:** `cache` (per-token response cache) and `verifyPaths` (every path segment must exist in its parent's list).

Field values are expressions in a small sandboxed language: paths (`item.name`, `segments[1]`, `parents[0].image`), `+ == != && || ?? ! ?:`, and whitelisted functions (`list`, `trim`, `str`, `isMedia`, `mediaType`, `wpThumb`, `oneOf`). Nothing is evaluated as JavaScript. See `src/manifest/types.ts` for the full format.

Hosts can load more providers at runtime from a hosted index. Every file must pass the host's signature check; built-in code providers can't be replaced:

```typescript
import { loadProviderIndex } from "@churchapps/content-providers";

const { loaded, skipped } = await loadProviderIndex("https://example.org/providers/index.json", {
  verify: (body, url) => verifySignature(body, url) // e.g. Ed25519 against a key built into the app
});
```

### Create a Custom Provider

```typescript
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
