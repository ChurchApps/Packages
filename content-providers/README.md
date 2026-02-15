<img align="right" width="150" src="https://raw.githubusercontent.com/ChurchApps/B1Admin/main/public/images/logo.png">

# @churchapps/content-provider-helper

> **ContentProviderHelper** is a TypeScript library for integrating with third-party content providers like Planning Center, Lessons.church, and more. It provides a unified interface for browsing media libraries, handling OAuth authentication, and retrieving content for playback in church presentation software.

## Installation

```bash
npm install @churchapps/content-provider-helper
```

## Usage

### Browse Available Providers

```typescript
import { getAllProviders, getAvailableProviders } from '@churchapps/content-provider-helper';

// Get all registered providers
const providers = getAllProviders();

// Get info about available providers
const available = getAvailableProviders();
console.log(available); // [{ id: 'planningcenter', name: 'Planning Center', ... }]
```

### Use a Specific Provider

```typescript
import { getProvider } from '@churchapps/content-provider-helper';

const provider = getProvider('planningcenter');

// Browse content
const items = await provider.browse();

// Get presentations/playlist for a service
const plan = await provider.getPresentations(serviceId);
```

### Built-in Providers

- **B1ChurchProvider** - B1.Church content integration
- **PlanningCenterProvider** - Planning Center Services
- **LessonsChurchProvider** - Lessons.church curriculum
- **BibleProjectProvider** - Bible Project videos
- **APlayProvider** - A.Play media library
- **SignPresenterProvider** - Sign Presenter content

### Create a Custom Provider

```typescript
import { ContentProvider, registerProvider } from '@churchapps/content-provider-helper';

class MyProvider extends ContentProvider {
  // Implement required methods
}

registerProvider(new MyProvider());
```

### Utilities

```typescript
import { detectMediaType } from '@churchapps/content-provider-helper';

detectMediaType('https://example.com/video.mp4'); // 'video'
detectMediaType('https://example.com/image.png'); // 'image'
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
