# @churchapps/apphelper-login

Login and authentication components for ChurchApps applications.

## Features

- **LoginPage** - Complete login page with tabs for login, register, and forgot password
- **Login** - Simple login form component  
- **Register** - User registration form
- **Forgot** - Password recovery form
- **LoginSetPassword** - Password reset component
- **SelectChurchSearch** - Church search functionality
- **SelectChurchRegister** - New church registration
- **SelectChurchModal** - Church selection modal

## Language Support

The components include built-in English fallback values for all labels, ensuring they work even without language files present.

### Internationalization (i18n)

The components support full internationalization through language files. When language files are available, they will be used automatically. If no language files are found, the components fall back to English labels.

#### Supported Languages
- English (en) - Built-in fallbacks
- German (de)
- Spanish (es) 
- French (fr)
- Hindi (hi)
- Italian (it)
- Korean (ko)
- Norwegian (no)
- Portuguese (pt)
- Russian (ru)
- Tagalog (tl)
- Chinese (zh)

#### Using with Language Files

```javascript
import { Locale } from '@churchapps/apphelper-login';

// Initialize with language backends
await Locale.init([
  '/locales/{{lng}}.json',
  'https://api.example.com/translations/{{lng}}.json'
]);
```

#### Using Without Language Files

The components work automatically without any setup - they use English fallbacks:

```javascript
import { LoginPage } from '@churchapps/apphelper-login';

// No language initialization needed - fallbacks are automatic
<LoginPage {...props} />
```

## Installation

```bash
npm install @churchapps/apphelper-login
```

## Dependencies

- `@churchapps/helpers` - Core utilities and interfaces
- `@churchapps/apphelper` - UI components (InputBox, ErrorMessages, etc.)
- React 19+
- Material-UI 7+
- i18next (for internationalization)

## Usage

```javascript
import { LoginPage, Login, Register } from '@churchapps/apphelper-login';

// Full login page
<LoginPage
  context={userContext}
  appName="My App"
  appUrl={window.location.href}
  handleRedirect={(url) => navigate(url)}
/>

// Simple login form
<Login
  context={userContext}
  appName="My App"
  onSuccess={() => console.log('Success')}
/>
```

## Playground

A development playground is available for testing components:

```bash
npm run test:login
```

This will start a browser-based playground where you can interact with all components.