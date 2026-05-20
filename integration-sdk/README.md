# @churchapps/integration-sdk

Toolkit for building [B1.church](https://b1.church) integrations — verify inbound
webhooks, call the B1 Api with a typed REST client, and complete OAuth flows.

Requires **Node 18+** (uses the built-in `crypto` and global `fetch`). Zero runtime
dependencies; `express` is an optional peer (only the webhook middleware needs it).

```bash
npm install @churchapps/integration-sdk
```

## Webhooks

B1 signs every webhook delivery with an HMAC-SHA256 over the **raw request body**,
sent in the `X-B1-Signature` header. Verify *before* the body is JSON-parsed and
re-stringified — that would change byte order and break the signature.

### With Express

Capture the raw body with `express.json`'s `verify` hook, then mount the middleware:

```ts
import express from "express";
import { b1WebhookMiddleware } from "@churchapps/integration-sdk";

const app = express();
app.use(express.json({ verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));

app.post("/webhooks/b1", b1WebhookMiddleware({ secret: process.env.B1_WEBHOOK_SECRET! }), (req, res) => {
  const env = req.b1Webhook!;            // typed B1WebhookEnvelope
  switch (env.event) {
    case "donation.created":
      console.log("new gift", env.data.amount);   // data narrowed to DonationWebhookData
      break;
  }
  res.sendStatus(200);
});
```

`express.raw({ type: "application/json" })` is also accepted. A failed verification
responds `401` (override with `onInvalid`).

### Without a framework

```ts
import { WebhookVerifier } from "@churchapps/integration-sdk";

const ok = WebhookVerifier.verify(secret, rawBody, signatureHeader);
const envelope = WebhookVerifier.verifyAndParse(secret, rawBody, signatureHeader); // throws on mismatch
```

## REST client

Authenticates with a `cak_` API key (created in B1Admin → Settings → Developer).
The Api is one host with per-module path prefixes; use the module helpers or a full
path. Non-2xx responses throw `B1ApiError`.

```ts
import { B1RestClient, B1ApiError } from "@churchapps/integration-sdk";

const client = new B1RestClient({ apiKey: process.env.B1_API_KEY! });

try {
  const people = await client.membership<Person[]>("/people");
  await client.giving("/donations", { method: "POST", body: { amount: 50 } });
} catch (err) {
  if (err instanceof B1ApiError) console.error(err.status, err.body);
}
```

Module helpers: `membership`, `giving`, `attendance`, `content`, `messaging`,
`doing`, `reporting`. Pass `baseUrl` to target staging.

## OAuth

```ts
import { B1OAuthClient } from "@churchapps/integration-sdk";

const oauth = new B1OAuthClient({ clientId, clientSecret });

const token = await oauth.exchangeCode({ code, redirectUri });
const fresh = await oauth.refresh(token.refresh_token);

// Device flow (RFC 8628):
const device = await oauth.startDeviceFlow(["people:read"]);
console.log(`Visit ${device.verification_uri} and enter ${device.user_code}`);
const deviceToken = await oauth.awaitDeviceToken({
  deviceCode: device.device_code, interval: device.interval, expiresIn: device.expires_in
});
```

## Base URLs

`B1_BASE_URLS.prod` — `https://api.b1.church` (default) ·
`B1_BASE_URLS.staging` — `https://api.staging.b1.church`.

## License

MIT © ChurchApps
