# AppHelper Playground

Local Vite playground for testing exported components from `@churchapps/apphelper`. Copy `dotenv.sample` to `.env` and fill in the required values, then run from this directory.

## Setup

```bash
npm install
cp dotenv.sample .env
npm run dev
```

The playground runs at http://localhost:3001 by default.

## Testing KingdomFunding (Accept Blue) Integration

KF tokenization is hosted in an iframe served from `tokenization.sandbox.accept.blue` (sandbox) or `tokenization.accept.blue` (production). The playground uses sandbox values below.

### Test Cards (Sandbox)

- **Success**: 4111 1111 1111 1111
- **Decline**: 4000 0000 0000 0002

Any valid future expiry and any 3-digit CVV will work for successful test cards.

### Test Bank Account (ACH)

ACH is currently hidden in the UI (`KF_ACH_ENABLED = false`) pending hosted ACH tokenization support from the gateway. The values below are kept for reference once that flag flips.

- **Routing Number**: 490000018
- **Account Number**: 24413815
- **Account Type**: checking

### Notes

- These sandbox values are public test credentials and safe to commit.
- Real cards or bank numbers should never be entered against the sandbox gateway.
- The reCAPTCHA widget may block headless preview browsers — use a real browser for end-to-end runs.

## Testing Stripe Integration

### Test Cards

- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Requires Authentication**: 4000 0025 0000 3155

### Test Bank Account

- **Routing**: 110000000
- **Account**: 000123456789
