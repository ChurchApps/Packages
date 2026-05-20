/** Thrown by `B1RestClient` when the Api returns a non-2xx response. */
export class B1ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;
  readonly method: string;
  readonly url: string;

  constructor(opts: { status: number; statusText: string; body: unknown; method: string; url: string }) {
    super(`B1 Api ${opts.method} ${opts.url} failed: ${opts.status} ${opts.statusText}`);
    this.name = "B1ApiError";
    this.status = opts.status;
    this.statusText = opts.statusText;
    this.body = opts.body;
    this.method = opts.method;
    this.url = opts.url;
  }
}
