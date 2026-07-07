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
- **SignPresenterProvider** - Sign Presenter playlists
- **DropboxProvider** - Media files from a Dropbox account
- **JesusFilmProvider** - Jesus Film Project (Arclight API)
- **CbnProvider** - CBN Superbook curriculum
- **HighVoltageKidsProvider** - High Voltage Kids curriculum (static catalog)
- **LifeChurchProvider** - Life.Church kids curriculum (static catalog)

### Create a Custom Provider

```typescript
import { BaseProvider, registerProvider } from '@churchapps/content-providers';

class MyProvider extends BaseProvider {
  // Declare id/name/logos/config/requiresAuth/authTypes/capabilities and implement browse().
  // Every declared authType/capability must be backed by its IProvider methods (enforced by
  // tests/contentProviders.test.ts):
  //   oauth_pkce   -> generateCodeVerifier / buildAuthUrl / buildAuthUrlFromChallenge / exchangeCodeForTokens
  //                   (OAuthHelper implements the standard flow; delegate to it like SignPresenterProvider)
  //   device_flow  -> initiateDeviceFlow / pollDeviceFlowToken (see DeviceFlowHelper)
  //   form_login   -> performLogin
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
