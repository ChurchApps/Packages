import { ProviderCapabilities, ProviderLogos } from "../interfaces";

/** Highest manifest engine version this build understands. Manifests needing a newer engine are skipped. */
export const MANIFEST_ENGINE_VERSION = 1;

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
  /** Every API and auth host this provider may call. Requests to any other host are refused. */
  hosts: string[];
  requiresAuth: boolean;
  capabilities: ProviderCapabilities;
  /** Named sets of values readable as env.*, e.g. separate dev and prod hosts. */
  environments?: Record<string, Record<string, string>>;
  defaultEnvironment?: string;
  /** Template, e.g. "https://api.example.com" or "{env.site}/wp-json/content/v1". */
  apiBase: string;
  auth?: ManifestAuth;
  /** Cache successful API responses per access token. */
  cache?: { ttlSeconds: number; max?: number };
  /** Check every path segment against its parent's list, so a stale or hand-made path can't reach other content. */
  verifyPaths?: boolean;
  /** The groups listed at the root path. */
  tree: ManifestGroup[];
}

export interface ManifestAuth {
  /** Template. Authorize is {oauthBase}/authorize and token is {oauthBase}/token. */
  oauthBase: string;
  clientId: string;
  /** Only a reference such as "secret:awana", resolved at runtime from setProviderSecret. Never the secret itself. */
  clientSecret?: string;
  scopes: string[];
  pkce?: boolean;
  deviceFlow?: {
    /** Appended to oauthBase. */
    endpoint: string;
    /** "json" (default) posts a JSON body; "form" posts form fields and includes the client secret (Keycloak). */
    encoding?: "json" | "form";
  };
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
  /** Path of the provider's manifest, relative to the index. */
  manifest?: string;
  /** Listed as "coming soon" with no implementation. */
  comingSoon?: boolean;
  name?: string;
  logos?: ProviderLogos;
}
