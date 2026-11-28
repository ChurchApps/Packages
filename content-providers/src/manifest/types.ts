import { AuthType, ProviderCapabilities, ProviderLogos } from "../interfaces";
import { FormLoginConfig } from "../helpers/FormLoginHelper";
import { NetworkDiscoveryConfig } from "../helpers/NetworkDiscoveryHelper";

/** Highest manifest engine version this build understands. Manifests needing a newer engine are skipped. */
export const MANIFEST_ENGINE_VERSION = 1;

/** A manifest helper function: either a lambda string "(x) => ..." or a structured block with named `let` bindings. */
export type ManifestFunction =
  | string
  | {
    params?: string[];
    let?: Record<string, string>;
    return: string;
  };

/** A dataset declared by a manifest: a relative path beside the manifest, an HTTPS URL, or inline JSON data. */
export type ManifestDataset = string | Record<string, unknown> | unknown[];

/**
 * Field values are expressions (see expression.ts) unless noted. `request` and URL fields are templates:
 * literal text with {expression} parts. Expressions can read:
 *   segments  the path split on "/"            parent   the item the current path segment selected
 *   parents   every selected item, by depth    item     the item being mapped (or the `as` name in `from`)
 *   response  the JSON from this group's/leaf's request          env  the current environment's values
 *   index     per-`as` positions while flattening                vars  are in scope by name
 */
export interface ProviderManifest {
  engine: number;
  id: string;
  name: string;
  logos: ProviderLogos;
  /** Every API and auth host this provider may call. Requests the engine makes to any other host are refused. */
  hosts: string[];
  requiresAuth: boolean;
  /** Sign-in types. Defaults to what `auth` / `networkDiscovery` declare, or ["none"]. */
  authTypes?: AuthType[];
  /** Free-form values the manifest's expressions read, so constants and lookup tables stay in data. */
  settings?: Record<string, unknown>;
  /** Initial per-instance state readable as `state.*` and updated with `setState` steps (e.g. pairing data). */
  state?: Record<string, unknown>;
  capabilities: ProviderCapabilities;
  /** Named sets of values readable as env.*, e.g. separate dev and prod hosts. */
  environments?: Record<string, Record<string, string>>;
  defaultEnvironment?: string;
  /** Template, e.g. "https://api.example.com" or "{env.site}/wp-json/content/v1". Empty for providers with no fixed API. */
  apiBase: string;
  auth?: ManifestAuth;
  /** LAN / mDNS discovery configuration for local-network providers (e.g. FreeShow). */
  networkDiscovery?: NetworkDiscoveryConfig;
  /** Cache successful API responses per access token. */
  cache?: { ttlSeconds: number; max?: number };
  /** Check every path segment against its parent's list, so a stale or hand-made path can't reach other content. */
  verifyPaths?: boolean;
  /** The groups listed at the root path. A manifest defines its content with `tree` or `routes`. */
  tree?: ManifestGroup[];
  /** Path patterns, tried in order, each with the steps that browse, play or instruct at that path. */
  routes?: ManifestRoute[];
  /** Named functions written as lambdas or `{ params, let, return }` blocks. Callable from any expression. */
  functions?: Record<string, ManifestFunction>;
  /** Named step lists that can fetch and call each other (recursion included), run with a `call` step. */
  procedures?: Record<string, ManifestProcedure>;
  /** Extra provider methods, e.g. getCurrentPlan, setPairingData or checkMediaLicense. Called with (...params, auth). */
  methods?: Record<string, ManifestProcedure>;
  /** Setter methods a host calls to plug in its own functions, e.g. { "setCatalogLoader": "catalogLoader" }. Steps call them with `hook`. */
  hooks?: Record<string, string>;
  /** Static JSON files (relative path or HTTPS URL) or inline JSON data, readable as datasets.<name>. */
  datasets?: Record<string, ManifestDataset>;
  /** Names of host secrets (setProviderSecret) that expressions may read with secret(name). */
  secrets?: string[];
}

/** A path pattern such as "/catalog/:course/*rest" and what to do there. */
export interface ManifestRoute {
  /** Literal segments, ":name" for one segment, "*name" for the rest of the path (any depth, including none). */
  path: string;
  /** Steps shared by this route's operations, run before them. */
  load?: ManifestStep[];
  browse?: ManifestOperation;
  playlist?: ManifestOperation;
  instructions?: ManifestOperation;
}

/** An expression, or steps ending in a `return` expression. */
export type ManifestOperation = string | { steps?: ManifestStep[]; return?: string };

export interface ManifestProcedure {
  params?: string[];
  steps?: ManifestStep[];
  return?: string;
}

/** One step. Every step can have a `when` guard; most bind their result with `as`. */
export type ManifestStep =
  | { when?: string; let: Record<string, string> }
  | { when?: string; setState: Record<string, string> }
  | { when?: string; fetch: ManifestRequest; as: string }
  | { when?: string; each: string; as: string; index?: string; steps?: ManifestStep[]; return?: string; into: string; parallel?: boolean }
  | { when?: string; call: string; args?: Record<string, string>; as: string }
  | { when?: string; hook: string; args?: string[]; as: string; else?: ManifestStep[] }
  | { when?: string; if: string; then?: ManifestStep[]; else?: ManifestStep[] }
  | { when?: string; cache: { key: string; seconds: number; shared?: boolean; keepWhen?: string }; steps?: ManifestStep[]; return?: string; as: string }
  | { when?: string; fail: string }
  | { when?: string; return: string };

/** A GET path template, or a full request description. */
export type ManifestRequest = string | {
  method?: "GET" | "POST";
  /** Template relative to apiBase. */
  path?: string;
  /** Expression for an absolute URL (its host must be listed in `hosts`). */
  url?: string;
  /** A URL the host supplied as a secret: a JSON object of URLs, picked by `key`. Trusted, so not host-checked. */
  secretUrl?: { secret: string; key: string };
  query?: Record<string, string>;
  /** Expression for a JSON body. */
  body?: string;
  /** Form fields (application/x-www-form-urlencoded). */
  form?: Record<string, string>;
  headers?: Record<string, string>;
  /** "bearer" requires & sends the token; "optional" sends the token if present; "none" sends nothing. Defaults to bearer for apiBase paths, none otherwise. */
  auth?: "bearer" | "optional" | "none";
  /** Return { ok, status, body } instead of the body (null on failure), to read error responses. */
  raw?: boolean;
  timeoutMs?: number;
  /** Follow pages: collect `items` from each response and keep requesting `next` while `while` holds. */
  page?: { items: string; while: string; next: ManifestRequest; max?: number };
};

export interface ManifestAuth {
  /** Template. Authorize is {oauthBase}/authorize and token is {oauthBase}/token unless overridden below. */
  oauthBase?: string;
  /** Template for the consent page, when it isn't {oauthBase}/authorize. */
  authorizeUrl?: string;
  /** Template for the token endpoint, when it isn't {oauthBase}/token. */
  tokenUrl?: string;
  /** Body encoding for OAuth token exchange & refresh ("form" by default; "json" for JSON token endpoints). */
  tokenEncoding?: "form" | "json";
  /** Extra authorize parameters; null drops a default one (e.g. scope). */
  authorizeParams?: Record<string, string | null>;
  clientId?: string;
  /** Only a reference such as "secret:awana", resolved at runtime from setProviderSecret. Never the secret itself. */
  clientSecret?: string;
  scopes?: string[];
  pkce?: boolean;
  /** Expose exchangeCodeForTokensWithSecret and refreshTokenWithSecret methods on the provider. */
  supportsSecretExchange?: boolean;
  deviceFlow?: {
    /** Appended to oauthBase. */
    endpoint: string;
    /** "json" (default) posts a JSON body; "form" posts form fields and includes the client secret (Keycloak). */
    encoding?: "json" | "form";
    /** Optional override for the device token polling URL. */
    tokenUrl?: string;
  };
  /** Credential login configuration for form_login providers. */
  formLogin?: FormLoginConfig;
}

/** One set of children under a path: either fixed entries or a list read from the API. */
export interface ManifestGroup {
  /** Include this group only when the expression is truthy. */
  when?: string;
  /** Fixed entries. Literal values, not expressions. */
  static?: { id: string; title: string; segment?: string }[];
  /** Thumbnail expression for static entries. */
  thumbnail?: string;
  /** GET path template, relative to apiBase. */
  request?: string;
  /** The list to map. Defaults to "response". Anything that isn't an array counts as empty. */
  items?: string;
  /** Keep only items where this expression (reading `item`) is truthy. */
  where?: string;
  /** How each listed item becomes a folder. `segment` (the path part) defaults to `id`. */
  folder?: { id: string; title: string; thumbnail?: string; segment?: string };
  /** Groups listed when one of this group's folders is opened. */
  children?: ManifestGroup[];
  /** Set when this group's folders hold files rather than more folders. */
  leaf?: ManifestLeaf;
}

export interface ManifestFileMapping {
  id: string;
  title: string;
  url: string;
  mediaType?: string;
  thumbnail?: string;
  downloadUrl?: string;
  muxPlaybackId?: string;
  mediaId?: string;
  seconds?: string;
  loop?: string;
  loopVideo?: string;
  streamUrl?: string;
  providerData?: Record<string, string>;
}

export interface ManifestLeaf {
  /** GET path template, relative to apiBase. */
  request: string;
  /** Lists to walk, outermost first; each step names its item. Defaults to [{ "list": "response", "as": "item" }]. */
  from?: { list: string; as: string }[];
  /** Named values computed for every item, in order. */
  vars?: Record<string, string>;
  /** Files for the playlist. Items where `where` is falsy are skipped. */
  playlist: { where?: string; file: ManifestFileMapping };
  /** Files the teacher downloads (zips, documents), shown with instructions but never played. */
  downloads?: { where?: string; file: { id?: string; title: string; url: string; fileType?: string; bytes?: string } };
  /** Instructions title. */
  title?: string;
  /** Wrap the instruction actions in a section, and optionally that section in a header. Values are id expressions. */
  instructions?: { section?: string; header?: string };
  /** Used when this leaf's first list comes back empty (or the request fails). */
  fallback?: ManifestLeaf;
}

/** The index of providers a host can load: one entry per provider. */
export interface ProviderIndex {
  engine: number;
  providers: ProviderIndexEntry[];
}

export interface ProviderIndexEntry {
  id: string;
  /** Path or HTTPS URL of the provider's manifest. */
  manifest?: string;
  /** Listed as "coming soon" with no implementation. */
  comingSoon?: boolean;
  name?: string;
  logos?: ProviderLogos;
}
