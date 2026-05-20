import { B1ApiError } from "./B1ApiError";
import { B1_BASE_URLS, B1Module, B1RequestOptions, B1RestClientOptions } from "../types";

/**
 * A typed REST client for the B1 Api, authenticated with a `cak_` API key.
 *
 * The Api is a single host with per-module path prefixes — use `request()`
 * with a full `/membership/...` path, or the module helpers which prefix it
 * for you.
 *
 * ```ts
 * const client = new B1RestClient({ apiKey: "cak_..." });
 * const people = await client.membership<Person[]>("/people");
 * ```
 *
 * Non-2xx responses throw `B1ApiError` (carrying status + parsed body) so a
 * caller can distinguish 401/403/404/500.
 */
export class B1RestClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: B1RestClientOptions) {
    if (!options.apiKey) throw new Error("B1RestClient: apiKey is required");
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? B1_BASE_URLS.prod).replace(/\/+$/, "");
    const f = options.fetch ?? globalThis.fetch;
    if (!f) throw new Error("B1RestClient: no fetch available — pass options.fetch (Node 18+ has global fetch)");
    this.fetchImpl = f;
  }

  /** Issues a request against a full Api path (e.g. `/membership/people`). */
  async request<T = unknown>(path: string, options: B1RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const url = this.buildUrl(path, options.query);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
      ...options.headers
    };
    const hasBody = options.body !== undefined && options.body !== null;
    if (hasBody) headers["Content-Type"] = "application/json";

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        ...(hasBody ? { body: JSON.stringify(options.body) } : {})
      });
    } catch (err) {
      throw new B1ApiError({
        status: 0,
        statusText: err instanceof Error ? err.message : "network error",
        body: null,
        method,
        url
      });
    }

    const text = await response.text();
    const body = parseBody(text);

    if (!response.ok) {
      throw new B1ApiError({ status: response.status, statusText: response.statusText, body, method, url });
    }
    return body as T;
  }

  /** Request against the `/membership` module. */
  membership<T = unknown>(path: string, options?: B1RequestOptions): Promise<T> {
    return this.module<T>("membership", path, options);
  }

  /** Request against the `/giving` module. */
  giving<T = unknown>(path: string, options?: B1RequestOptions): Promise<T> {
    return this.module<T>("giving", path, options);
  }

  /** Request against the `/attendance` module. */
  attendance<T = unknown>(path: string, options?: B1RequestOptions): Promise<T> {
    return this.module<T>("attendance", path, options);
  }

  /** Request against the `/content` module. */
  content<T = unknown>(path: string, options?: B1RequestOptions): Promise<T> {
    return this.module<T>("content", path, options);
  }

  /** Request against the `/messaging` module. */
  messaging<T = unknown>(path: string, options?: B1RequestOptions): Promise<T> {
    return this.module<T>("messaging", path, options);
  }

  /** Request against the `/doing` module. */
  doing<T = unknown>(path: string, options?: B1RequestOptions): Promise<T> {
    return this.module<T>("doing", path, options);
  }

  /** Request against the `/reporting` module. */
  reporting<T = unknown>(path: string, options?: B1RequestOptions): Promise<T> {
    return this.module<T>("reporting", path, options);
  }

  private module<T>(module: B1Module, path: string, options?: B1RequestOptions): Promise<T> {
    const sub = path.startsWith("/") ? path : `/${path}`;
    return this.request<T>(`/${module}${sub}`, options);
  }

  private buildUrl(path: string, query?: B1RequestOptions["query"]): string {
    const p = path.startsWith("/") ? path : `/${path}`;
    let url = `${this.baseUrl}${p}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) params.append(key, String(value));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    return url;
  }
}

/** Parses a response body as JSON, falling back to the raw text / undefined. */
function parseBody(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
