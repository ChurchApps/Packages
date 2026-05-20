// REST client types — module names, base URLs, request/option shapes.

/** The B1 Api modules, each addressed by a `/<module>` path prefix. */
export type B1Module =
  | "membership"
  | "giving"
  | "attendance"
  | "content"
  | "messaging"
  | "doing"
  | "reporting";

/** Known B1 Api base URLs. */
export const B1_BASE_URLS = {
  prod: "https://api.b1.church",
  staging: "https://api.staging.b1.church"
} as const;

export interface B1RestClientOptions {
  /** A raw `cak_<prefix>.<secret>` API key, sent verbatim as a bearer token. */
  apiKey: string;
  /** Base URL — defaults to production. */
  baseUrl?: string;
  /** Override `fetch` (for tests or non-global-fetch runtimes). */
  fetch?: typeof fetch;
}

export type B1QueryValue = string | number | boolean | undefined | null;

export interface B1RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, B1QueryValue>;
  headers?: Record<string, string>;
}
