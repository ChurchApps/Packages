# Creating Custom Content Providers

A content provider in `@churchapps/content-providers` (and apps like **FreePlay** and **B1Admin**) is **a single JSON manifest file** — no TypeScript, no code compilation, and no app update required.

Anyone can host a `.json` manifest over HTTPS and load it directly in FreePlay via **Settings → Providers → Add Provider**, or contribute it to `src/manifests/providers/` and `src/manifests/index.json` so every app receives it automatically on launch.

This guide is written as a complete, self-contained specification for both developers and AI coding agents.

---

## Critical Rules & Common Pitfalls (Read First)

Before writing a manifest, know these hard constraints enforced by `validateManifest`:

1. **No JavaScript statements or method calls.** Expressions use a sandboxed AST language (`src/manifest/expression.ts`).
   - Use **`==` and `!=`** (strict equality at runtime). **`===` and `!==` are syntax errors.**
   - Do **not** call methods like `items.map(...)` or `str.toLowerCase()`. Use built-in functions: `map(items, x => ...)`, `lower(s)`, `includes(arr, x)`, `len(arr)`, `split(s, ',')`.
   - Supported operators: `!`, unary `-`, `*`, `/`, `%`, `+`, `-`, `<`, `>`, `<=`, `>=`, `==`, `!=`, `&&`, `||`, `??`, `? :`, array spread `[...a, b]`, object spread `{ ...a, k: v }`, lambdas `x => ...` and `(a, b) => ...`.
2. **HTTPS only (except LAN).** `apiBase`, `auth.oauthBase`, `auth.authorizeUrl`, `auth.tokenUrl`, `auth.deviceFlow.tokenUrl`, `auth.formLogin.url`, and external dataset URLs must start with `https://` (or `{env.*}` resolving to `https://`). `apiBase` may be `""` when every request builds a full URL or uses LAN discovery.
3. **Strict host allowlist (`hosts`).** Every hostname the manifest fetches from (API, OAuth, or absolute `url` requests) MUST be listed in `hosts` (bare hostnames, no protocol, no path, no wildcards — e.g. `["api.example.com", "cdn.example.com"]`). Use `"lan"` in `hosts` to allow RFC1918/loopback `http://` addresses for local-network providers.
4. **Never embed secrets.** `auth.clientSecret` may ONLY be `"secret:<name>"` (resolved at runtime via `setProviderSecret`). Literal secrets are rejected by validation.
5. **Valid `id`.** Must match `/^[a-z0-9][a-z0-9-]*$/` (lowercase letters, digits, hyphens).
6. **Choose `routes` OR `tree`, never both.**
   - Use **`routes`** (recommended for most custom providers) when you want full control over paths, static/inline datasets, POST requests, pagination, custom auth headers, or variable depth.
   - Use **`tree`** for simple fixed-depth GET REST APIs (e.g. Courses → Units → Lessons).
7. **Self-contained for "Add Provider".** If users will paste a single `.json` URL into FreePlay's **Add Provider**, either inline static catalog data directly under `datasets` or reference datasets by relative path (`"data/catalog.json"`) or `https://` URL on the same host.

---

## Starter Templates

### 1. Static / Curated Media Catalog (Self-Contained Single File, No Auth)

The simplest possible provider — paste its HTTPS URL into FreePlay's **Add Provider** and it works immediately (including offline):

```json
{
  "engine": 1,
  "id": "my-church-media",
  "name": "My Church Media",
  "logos": {
    "light": "https://media.mychurch.org/logo-light.png",
    "dark": "https://media.mychurch.org/logo-dark.png"
  },
  "hosts": ["media.mychurch.org"],
  "requiresAuth": false,
  "capabilities": {
    "browse": true,
    "playlist": true,
    "instructions": false,
    "mediaLicensing": false
  },
  "apiBase": "https://media.mychurch.org",
  "datasets": {
    "catalog": [
      {
        "id": "kids-worship",
        "title": "Kids Worship",
        "thumbnail": "https://media.mychurch.org/thumbs/worship.jpg",
        "items": [
          {
            "id": "song-1",
            "title": "Joyful Song",
            "url": "https://media.mychurch.org/videos/joyful.mp4",
            "thumbnail": "https://media.mychurch.org/thumbs/joyful.jpg",
            "seconds": 215
          },
          {
            "id": "slide-1",
            "title": "Memory Verse",
            "url": "https://media.mychurch.org/slides/verse.jpg",
            "seconds": 10
          }
        ]
      }
    ]
  },
  "routes": [
    {
      "path": "/",
      "browse": "map(datasets.catalog, c => folder(c.id, c.title, '/' + c.id, c.thumbnail, true))"
    },
    {
      "path": "/:collectionId",
      "load": [
        { "let": { "col": "find(datasets.catalog, c => c.id == params.collectionId)" } }
      ],
      "browse": "col ? map(col.items, i => file(i.id, i.title, i.url, { thumbnail: i.thumbnail, seconds: i.seconds })) : []",
      "playlist": "col ? map(col.items, i => file(i.id, i.title, i.url, { thumbnail: i.thumbnail, seconds: i.seconds })) : null"
    }
  ]
}
```

### 2. Public REST API (`routes` with `browse`, `playlist`, and `instructions`)

```json
{
  "engine": 1,
  "id": "acme-lessons",
  "name": "Acme Lessons",
  "logos": {
    "light": "https://cdn.acme.org/logo-dark.png",
    "dark": "https://cdn.acme.org/logo-white.png"
  },
  "hosts": ["api.acme.org"],
  "requiresAuth": false,
  "capabilities": {
    "browse": true,
    "playlist": true,
    "instructions": true,
    "mediaLicensing": false
  },
  "apiBase": "https://api.acme.org/v1",
  "cache": { "ttlSeconds": 300 },
  "routes": [
    {
      "path": "/",
      "load": [{ "fetch": "/series", "as": "data" }],
      "browse": "map(list(data, 'series', 'items'), s => folder(s.id, s.title, '/' + s.id, s.imageUrl))"
    },
    {
      "path": "/:seriesId",
      "load": [{ "fetch": "/series/{params.seriesId}/lessons", "as": "data" }],
      "browse": "map(list(data, 'lessons', 'items'), l => folder(l.id, l.title, '/' + params.seriesId + '/' + l.id, l.thumbnail, true))"
    },
    {
      "path": "/:seriesId/:lessonId",
      "load": [
        { "fetch": "/lessons/{params.lessonId}", "as": "lesson" },
        {
          "let": {
            "files": "map(filter(list(lesson, 'files'), f => isPlaylistMedia(f.url, f.mime, f.name)), f => file(f.id, f.name, f.url, { thumbnail: f.thumbnail || lesson.thumbnail, seconds: f.duration, downloadUrl: f.downloadUrl }))"
          }
        }
      ],
      "browse": "files",
      "playlist": "len(files) ? files : null",
      "instructions": "lesson ? filesToInstructions(lesson.title || 'Lesson', files, 'section-' + lesson.id, lesson.title) : null"
    }
  ]
}
```

### 3. Authenticated Fixed-Depth API (`tree` + `device_flow` or `form_login`)

```json
{
  "engine": 1,
  "id": "church-curriculum",
  "name": "Church Curriculum",
  "logos": {
    "light": "https://curriculum.example.org/logo.png",
    "dark": "https://curriculum.example.org/logo-white.png"
  },
  "hosts": ["api.curriculum.example.org", "auth.curriculum.example.org"],
  "requiresAuth": true,
  "capabilities": {
    "browse": true,
    "playlist": true,
    "instructions": true,
    "mediaLicensing": false
  },
  "apiBase": "https://api.curriculum.example.org/v1",
  "auth": {
    "oauthBase": "https://auth.curriculum.example.org/oauth",
    "clientId": "my-public-client-id",
    "scopes": ["content:read"],
    "pkce": true,
    "deviceFlow": {
      "endpoint": "/device",
      "encoding": "json"
    }
  },
  "cache": { "ttlSeconds": 300 },
  "verifyPaths": true,
  "tree": [
    {
      "request": "/courses",
      "items": "list(response, 'courses')",
      "folder": { "id": "item.id", "title": "item.name", "thumbnail": "item.image" },
      "children": [
        {
          "request": "/courses/{segments[0]}/lessons",
          "items": "list(response, 'lessons')",
          "folder": { "id": "item.id", "title": "item.title", "thumbnail": "item.thumbnail || parent.thumbnail" },
          "leaf": {
            "request": "/lessons/{segments[1]}",
            "from": [{ "list": "list(response, 'media')", "as": "item" }],
            "title": "response.title || parent.title",
            "playlist": {
              "where": "item.url && isPlaylistMedia(item.url, item.type, item.name)",
              "file": {
                "id": "item.id",
                "title": "item.name",
                "url": "item.url",
                "mediaType": "mediaType(item.url, item.type)",
                "thumbnail": "item.thumbnail || parent.thumbnail",
                "seconds": "item.duration"
              }
            },
            "downloads": {
              "where": "item.url && !isPlaylistMedia(item.url, item.type, item.name)",
              "file": {
                "id": "item.id",
                "title": "item.name",
                "url": "item.url",
                "bytes": "item.size"
              }
            }
          }
        }
      ]
    }
  ]
}
```

---

## Top-Level Manifest Schema (`ProviderManifest`)

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `engine` | Yes | `number` | Must be `1` (`MANIFEST_ENGINE_VERSION`). |
| `id` | Yes | `string` | Unique lowercase slug (`/^[a-z0-9][a-z0-9-]*$/`). |
| `name` | Yes | `string` | Human-readable display name shown in UI. |
| `logos` | Yes | `{ light: string; dark: string }` | HTTPS URLs to PNG/SVG logos (empty string `""` falls back to default icon). `dark` is shown on dark backgrounds (FreePlay TV); `light` on light backgrounds. |
| `hosts` | Yes | `string[]` | Non-empty list of allowed hostnames (e.g. `["api.example.com"]`) or `["lan"]` for local-network providers. |
| `requiresAuth` | Yes | `boolean` | `true` if users must sign in / connect before browsing. |
| `authTypes` | No | `AuthType[]` | Explicit override from `["none", "oauth_pkce", "device_flow", "form_login", "network_discovery"]`. Inferred automatically from `auth` / `networkDiscovery` if omitted. |
| `capabilities` | Yes | `{ browse, playlist, instructions, mediaLicensing }` | All four booleans required. If `mediaLicensing: true`, `methods.checkMediaLicense` must be defined. |
| `apiBase` | Yes | `string` | HTTPS URL template (e.g. `"https://api.example.com/v1"` or `"{env.site}/api"`) or `""`. |
| `environments` | No | `Record<string, Record<string, string>>` | Named value maps readable as `env.*` (switchable via `provider.setEnvironment(name)`). |
| `defaultEnvironment` | If `environments` | `string` | Key in `environments`. |
| `auth` | If `requiresAuth` | `ManifestAuth` | OAuth PKCE, Device Flow, and/or Form Login configuration. |
| `networkDiscovery` | No | `NetworkDiscoveryConfig` | mDNS/LAN discovery config (adds `"network_discovery"` auth type). |
| `cache` | No | `{ ttlSeconds: number; max?: number }` | Caches GET responses per access token (used by `tree` and default GETs). |
| `verifyPaths` | No | `boolean` | For `tree`: verifies each path segment exists in its parent list. |
| `settings` | No | `Record<string, unknown>` | Static key-value config readable in expressions as `settings.*`. |
| `state` | No | `Record<string, unknown>` | Per-instance mutable state readable as `state.*` and updated via `setState` steps. |
| `datasets` | No | `Record<string, string \| object \| array>` | Static JSON data readable as `datasets.<name>`: inline object/array, relative path (`"data/x.json"`), or `https://` URL. |
| `functions` | No | `Record<string, ManifestFunction>` | Pure helper functions: lambda `"(x) => ..."` or structured `{ "params": ["x"], "let": { "a": "..." }, "return": "..." }`. |
| `procedures` | No | `Record<string, ManifestProcedure>` | Reusable async step lists invoked with `{ "call": "procName", "args": {...}, "as": "res" }`. Supports recursion. |
| `methods` | No | `Record<string, ManifestProcedure>` | Extra methods exposed on the provider instance (e.g. `getCurrentPlan`, `setPairingData`, `checkMediaLicense`). |
| `hooks` | No | `Record<string, string>` | Host-supplied callback setters (e.g. `{ "setCatalogLoader": "catalogLoader" }`). |
| `secrets` | No | `string[]` | Secret names readable via `secret("name")` or `secretUrl`. |
| `routes` | One of `routes`/`tree` | `ManifestRoute[]` | Ordered path patterns with `load`, `browse`, `playlist`, `instructions`. |
| `tree` | One of `routes`/`tree` | `ManifestGroup[]` | Fixed-depth folder/leaf hierarchy. |

---

## Authentication Modes

### 1. No Auth (`requiresAuth: false`)
Omit `auth`. `authTypes` defaults to `["none"]`.

### 2. OAuth 2.0 PKCE (`oauth_pkce`)
```json
"auth": {
  "oauthBase": "https://auth.example.com/oauth",
  "authorizeUrl": "https://app.example.com/oauth/authorize",
  "tokenUrl": "https://api.example.com/oauth/token",
  "tokenEncoding": "form",
  "authorizeParams": { "token_access_type": "offline" },
  "clientId": "public-client-id",
  "clientSecret": "secret:myprovider",
  "scopes": ["read"],
  "pkce": true,
  "supportsSecretExchange": false
}
```
- `authorizeUrl` defaults to `{oauthBase}/authorize`; `tokenUrl` defaults to `{oauthBase}/token`.
- `tokenEncoding`: `"form"` (default, `application/x-www-form-urlencoded`) or `"json"` (`application/json`).
- `authorizeParams`: extra query params on authorize URL; set a value to `null` to omit a default param (e.g. `"scope": null`).
- `clientSecret`: optional, MUST be `"secret:<name>"` if used.

### 3. Device Authorization Flow (`device_flow`)
Best for TV apps (FreePlay shows a QR code + short code):
```json
"auth": {
  "oauthBase": "https://auth.example.com/oauth",
  "clientId": "tv-client-id",
  "scopes": ["read"],
  "deviceFlow": {
    "endpoint": "/device/authorize",
    "encoding": "json",
    "tokenUrl": "https://auth.example.com/oauth/token"
  }
}
```
- `encoding`: `"json"` (default) or `"form"` (Keycloak/OAuth2 form-encoded device flow).

### 4. Form Login (`form_login`)
Username/email + password login:
```json
"auth": {
  "formLogin": {
    "path": "/auth/login",
    "encoding": "json",
    "usernameField": "email",
    "passwordField": "password",
    "extraFields": { "device": "tv" },
    "headers": { "X-Client": "freeplay" },
    "tokenExpr": "response.access_token || response.token",
    "refreshTokenExpr": "response.refresh_token",
    "expiresInExpr": "response.expires_in",
    "defaultExpiresIn": 86400
  }
}
```
- Provide exactly one of `path` (relative to `apiBase`) or `url` (absolute HTTPS URL template).
- `tokenExpr`, `refreshTokenExpr`, `expiresInExpr` are expressions reading `response`.

### 5. Local Network Discovery (`network_discovery`)
For local-network media servers (like FreeShow or ProPresenter):
```json
"hosts": ["lan"],
"apiBase": "",
"networkDiscovery": {
  "serviceType": "_myserver._tcp",
  "defaultPort": 8080,
  "groupBy": "name",
  "nameTemplate": "{name} ({ip}:{port})",
  "scope": "myserver",
  "probe": {
    "method": "GET",
    "path": "/api/status",
    "timeoutMs": 1500
  }
}
```
- Once connected, `auth` stores the selected instance; use `networkInstance(auth)` inside expressions to read `{ id, name, host, ip, port }`.

---

## Routes, Steps, and Requests

### Route Matching
Routes in `routes` are tried **top to bottom**; the first match wins:
- `"/"` matches root (`""` or `"/"`).
- `"/series/:seriesId"` binds `params.seriesId` to one path segment.
- `"/files/*rest"` binds `params.rest` to the remaining path (zero or more segments; `*name` must be the final segment).

Each route has:
- `load` (optional `ManifestStep[]`): runs before `browse`, `playlist`, or `instructions`.
- `browse`: expression or `{ "steps": [...], "return": "..." }` returning `ContentItem[]` (array of `folder(...)` and/or `file(...)`).
- `playlist`: returns `ContentFile[] | null`. Has `resolution` (`"720" | "1080" | undefined`) in scope.
- `instructions`: returns `Instructions | null`.

**Globals always in scope inside `routes`, `procedures`, and `methods`:**
`env`, `datasets`, `settings`, `state`, `auth`, `apiBase`, plus in routes: `path`, `segments`, `params`.

### Step Types (`ManifestStep`)
Every step supports an optional `"when": "<expr>"` guard.

| Step | Example | Behavior |
|------|---------|----------|
| `let` | `{ "let": { "a": "1 + 2", "b": "a * 3" } }` | Sequential local variable bindings. |
| `setState` | `{ "setState": { "pairing": "data" } }` | Updates keys declared in top-level `state`. |
| `fetch` | `{ "fetch": "/items/{params.id}", "as": "res" }` | HTTP request (string path or request object below). |
| `each` | `{ "each": "items", "as": "x", "index": "i", "steps": [...], "return": "...", "into": "out", "parallel": true }` | Maps over an array with async steps. |
| `call` | `{ "call": "loadFolder", "args": { "id": "params.id" }, "as": "res" }` | Calls a named entry in `procedures`. |
| `hook` | `{ "hook": "catalogLoader", "args": ["id", "auth"], "as": "res", "else": [...] }` | Calls a host-registered hook or runs `else` fallback. |
| `if` | `{ "if": "len(items) > 0", "then": [...], "else": [...] }` | Conditional branch. |
| `cache` | `{ "cache": { "key": "'lib:' + auth.access_token", "seconds": 300, "shared": false, "keepWhen": "value != null" }, "steps": [...], "return": "res", "as": "cached" }` | TTL memoization (`previous` holds stale value if any). |
| `fail` | `{ "fail": "'Not authorized'" }` | Throws an error with the evaluated message. |
| `return` | `{ "return": "null" }` | Early return from the current operation/procedure. |

### Request Object (`fetch`)
A `fetch` can be a simple GET path template string (`"/lessons/{params.id}"`) or an object:
```json
{
  "method": "POST",
  "path": "/search",
  "query": { "limit": "50" },
  "body": "{ folder: params.id }",
  "headers": { "X-Api-Version": "2" },
  "auth": "bearer",
  "raw": false,
  "timeoutMs": 10000,
  "page": {
    "items": "response.entries",
    "while": "response.has_more && response.cursor",
    "next": { "method": "POST", "path": "/search/continue", "body": "{ cursor: response.cursor }" },
    "max": 20
  }
}
```
- Exactly one of `path` (template relative to `apiBase`), `url` (expression evaluating to an absolute URL whose host is in `hosts`), or `secretUrl` (`{ "secret": "name", "key": "expr" }`).
- `auth`: `"bearer"` (requires `auth.access_token`, sends `Authorization: Bearer ...`), `"optional"` (sends header if token present, otherwise no header), or `"none"`. Default: `"bearer"` when `requiresAuth: true` and using `path`, `"none"` otherwise.
- `form`: `{ "field": "expr" }` sends `application/x-www-form-urlencoded`.
- `raw: true`: returns `{ ok, status, body }` instead of throwing / returning `null` on non-2xx.
- Note: Setting an `Authorization` header manually in `headers` is forbidden — use `auth`.

---

## Built-in Expression Functions (`src/manifest/transforms.ts`)

### Content & Plan Builders
| Function | Signature | Description |
|----------|-----------|-------------|
| `folder` | `folder(id, title, path, thumbnail?, isLeaf?)` or `folder(id, title, path, { thumbnail, isLeaf })` | Creates a `ContentFolder`. Set `isLeaf: true` on folders that play directly as a playlist/lesson! |
| `file` | `file(id, title, url, { mediaType?, thumbnail?, downloadUrl?, muxPlaybackId?, mediaId?, seconds?, loop?, loopVideo?, streamUrl?, providerData? }?)` | Creates a `ContentFile`. `mediaType` is auto-detected (`"video" \| "image" \| "audio"`) if omitted. |
| `download` | `download(title, url, { id?, fileType?, bytes? }?)` | Creates a `ContentDownload` (PDFs, ZIPs, slides for teachers). |
| `filesToInstructions` | `filesToInstructions(name, files, sectionId?, sectionLabel?)` | Wraps `ContentFile[]` into an `Instructions` tree. |
| `instructionItems` | `instructionItems(files)` | Builds `InstructionItem[]` actions for files. |
| `instructionsToPlaylist` | `instructionsToPlaylist(instructions)` | Flattens an `Instructions` tree into playable `ContentFile[]`. |
| `navigateToPath` | `navigateToPath(instructions, dotPath)` | Resolves dot-index path (e.g. `"0.1"`) in `Instructions`. |
| `findFirstThumbnail` | `findFirstThumbnail(items)` | Finds first thumbnail URL in an `InstructionItem[]` tree. |
| `orderPlanFiles` | `orderPlanFiles(instructions, customPlanItems?)` | Orders playlist files honoring custom plan ordering. |
| `normalizeItemType` | `normalizeItemType(type)` | Maps `lessonSection` → `section`, `lessonAction`/`lessonAddOn` → `action`. |
| `networkAuth` | `networkAuth(instance, scope?)` | Converts `NetworkInstance` to `ContentProviderAuthData`. |
| `networkInstance` | `networkInstance(auth)` | Extracts `NetworkInstance` from `auth`. |

### Media & Text Helpers
- `mediaType(url, hint?)` → `"video" | "image" | "audio"`
- `isMedia(url)` → `boolean`
- `isPlaylistMedia(url, fileType?, name?)` → `boolean` (excludes documents/archives)
- `muxStreamUrl(playbackId, quality?)`, `muxThumbnail(playbackId, width?, height?)`, `muxPlaybackId(url)`
- `wpThumb(thumb)` (extracts URL or `sizes.medium` from WordPress attachment objects)
- `str(v)`, `number(v)`, `trim(s)`, `trimEnd(s)`, `lower(s)`, `upper(s)`, `split(s, sep)`, `join(arr, sep)`
- `startsWith(s, prefix)`, `endsWith(s, suffix)`, `includes(arrOrStr, x)`, `indexOf(arrOrStr, x)`
- `replace(s, pattern, replacement, flags?)`, `test(s, pattern, flags?)`, `match(s, pattern, flags?)`, `search(s, pattern, flags?)`
- `stripMarkdown(s)`, `truncate(s, maxLen?, suffix?)`, `truncateLabel(s, maxLen?, suffix?)`, `slugify(s)`
- `encode(s)`, `decode(s)`, `urlParams(url, { k: v })`, `json(v)`, `parseJson(s)`

### Collections, Objects, Math & Dates
- `list(val, ...keys)` — returns `val` if array, else first array at `val[key]`, else `[]`
- `with(val, v => ...)` — binds an intermediate expression value cleanly
- `map`, `filter`, `compact`, `find`, `findIndex`, `some`, `every`, `flatMap`, `flat`, `reduce`
- `sortBy(list, x => key, mode?, desc?)` (`mode`: `"text"`, `"natural"`, `"number"`, `"raw"`)
- `unique(list)`, `groupBy(list, x => key)`, `groupConsecutive(list, x => key)`
- `len(v)`, `slice(v, start, end?)`, `concat(...lists)`, `oneOf(val, ...options)`
- `keys(o)`, `values(o)`, `entries(o)`, `fromEntries(pairs)`, `merge(...objs)`
- `isArray(v)`, `isString(v)`, `isNumber(v)`, `isObject(v)`
- `min(...nums)`, `max(...nums)`, `round(n)`, `floor(n)`
- `now()`, `timestamp(dateStr)`, `isoDate(dateStr)`, `localDateOffset(days?)`, `beforeDaysFromNow(dateStr, days)`

---

## Expected Return Shapes (App Contract)

Apps like FreePlay inspect these exact fields:

- **Folder (`ContentFolder`)**: `{ type: "folder", id, title, path, thumbnail?, isLeaf? }`
  - `path` MUST start with `"/"` and match one of your `routes` (or `tree` depth).
  - Set `isLeaf: true` on folders that open a playable lesson/playlist (FreePlay shows **Stream / Download** on leaf folders!).
- **File (`ContentFile`)**: `{ type: "file", id, title, mediaType: "video" | "image" | "audio", url, thumbnail?, downloadUrl?, seconds?, loop?, loopVideo? }`
- **Instructions (`Instructions`)**: `{ name, items: InstructionItem[], downloads?: ContentDownload[] }`

---

## Validating & Testing Your Manifest (Agent Checklist)

Before handing a manifest URL to a user or opening a PR, validate and exercise it locally:

```bash
npx tsx -e '
import { readFileSync } from "node:fs";
import { validateManifest, createProvider } from "@churchapps/content-providers";

const raw = JSON.parse(readFileSync("./my-provider.json", "utf8"));
const manifest = validateManifest(raw); // throws with exact line/field errors if anything is invalid
const provider = createProvider(manifest);

const root = await provider.browse("/");
console.log("Root items:", root);
if (root[0]?.type === "folder") {
  console.log("Child items:", await provider.browse(root[0].path));
  if (root[0].isLeaf && provider.getPlaylist) {
    console.log("Playlist:", await provider.getPlaylist(root[0].path));
  }
}
'
```

If you are working inside this repo (`ChurchApps/Packages/content-providers`):
1. Save your manifest to `src/manifests/providers/<id>.json` (and any static data to `src/manifests/providers/data/<id>.json`).
2. Add `{ "id": "<id>", "manifest": "providers/<id>.json" }` to `src/manifests/index.json`.
3. Run:
   ```bash
   yarn test
   yarn export:manifests
   ```
   `yarn export:manifests` validates every manifest in `index.json` and computes its SHA-256 hash into `dist/manifests/index.json`.

---

## Hosting a Custom Provider for FreePlay ("Add Provider")

To let anyone add your provider directly inside FreePlay (**Settings → Providers → Add Provider**):

1. Upload your `<id>.json` file (and any relative dataset files) to any **HTTPS** static host (S3 + CloudFront, Cloudflare R2/Pages, GitHub Pages, Netlify, Vercel, or your church's website).
2. Ensure it responds with HTTP `200`, `Content-Type: application/json`, and valid JSON (add `Access-Control-Allow-Origin: *` if web apps will also load it).
3. In FreePlay, open **Settings → Providers → Add Provider**, enter the full `https://.../my-provider.json` URL, and submit.
4. FreePlay downloads, validates, registers, and caches the manifest (and its datasets) locally so it persists across restarts and continues working offline.
