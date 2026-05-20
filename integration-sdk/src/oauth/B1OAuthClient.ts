import {
  B1_BASE_URLS,
  B1DeviceAuthResponse,
  B1DevicePollResult,
  B1Scope,
  B1TokenResponse
} from "../types";

/** Thrown when a B1 OAuth endpoint returns an `error` response. */
export class B1OAuthError extends Error {
  readonly error: string;
  readonly errorDescription?: string;
  readonly status: number;

  constructor(error: string, errorDescription: string | undefined, status: number) {
    super(errorDescription ? `${error}: ${errorDescription}` : error);
    this.name = "B1OAuthError";
    this.error = error;
    this.errorDescription = errorDescription;
    this.status = status;
  }
}

export interface B1OAuthClientOptions {
  clientId: string;
  /** Required for confidential clients (authorization_code grant). */
  clientSecret?: string;
  /** Base URL — defaults to production. */
  baseUrl?: string;
  /** Override `fetch` (for tests or non-global-fetch runtimes). */
  fetch?: typeof fetch;
}

export interface AwaitDeviceTokenOptions {
  deviceCode: string;
  /** Poll interval in seconds (from `B1DeviceAuthResponse.interval`). */
  interval: number;
  /** Overall timeout in seconds (from `B1DeviceAuthResponse.expires_in`). */
  expiresIn: number;
  /** Optional abort signal to cancel polling. */
  signal?: AbortSignal;
}

/**
 * Helper for B1's OAuth flows — authorization-code, refresh-token, and the
 * RFC 8628 device flow — against `/membership/oauth/*`.
 */
export class B1OAuthClient {
  private readonly clientId: string;
  private readonly clientSecret?: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: B1OAuthClientOptions) {
    if (!options.clientId) throw new Error("B1OAuthClient: clientId is required");
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.baseUrl = (options.baseUrl ?? B1_BASE_URLS.prod).replace(/\/+$/, "");
    const f = options.fetch ?? globalThis.fetch;
    if (!f) throw new Error("B1OAuthClient: no fetch available — pass options.fetch");
    this.fetchImpl = f;
  }

  /**
   * Requests an authorization code. B1's `/authorize` endpoint is an
   * authenticated POST, so this needs the *user's* access token (a JWT).
   */
  async getAuthorizationCode(params: {
    userAccessToken: string;
    redirectUri: string;
    scope: B1Scope[] | string;
    state?: string;
  }): Promise<{ code: string; state: string | null }> {
    return this.post(
      "/authorize",
      {
        client_id: this.clientId,
        redirect_uri: params.redirectUri,
        response_type: "code",
        scope: scopeString(params.scope),
        state: params.state
      },
      { Authorization: `Bearer ${params.userAccessToken}` }
    );
  }

  /** Exchanges an authorization code for tokens. */
  async exchangeCode(params: { code: string; redirectUri?: string }): Promise<B1TokenResponse> {
    return this.post("/token", {
      grant_type: "authorization_code",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri
    });
  }

  /** Exchanges a refresh token for a fresh access token. */
  async refresh(refreshToken: string): Promise<B1TokenResponse> {
    return this.post("/token", {
      grant_type: "refresh_token",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken
    });
  }

  /** Starts the device flow — returns a user code + verification URI. */
  async startDeviceFlow(scope?: B1Scope[] | string): Promise<B1DeviceAuthResponse> {
    return this.post("/device/authorize", {
      client_id: this.clientId,
      scope: scope ? scopeString(scope) : undefined
    });
  }

  /** Polls once for a device-flow token. Never throws on a pending/expired/denied state. */
  async pollDeviceToken(deviceCode: string): Promise<B1DevicePollResult> {
    const res = await this.rawPost("/token", {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: this.clientId,
      device_code: deviceCode
    });
    if (res.ok) return { status: "approved", token: res.body as B1TokenResponse };

    const error = typeof res.body === "object" && res.body ? (res.body as any).error : undefined;
    if (error === "authorization_pending") return { status: "pending" };
    if (error === "expired_token") return { status: "expired" };
    if (error === "access_denied") return { status: "denied" };
    throw new B1OAuthError(error ?? "invalid_grant", (res.body as any)?.error_description, res.status);
  }

  /** Polls until the device flow is approved, denied, or expires. */
  async awaitDeviceToken(options: AwaitDeviceTokenOptions): Promise<B1TokenResponse> {
    const deadline = Date.now() + options.expiresIn * 1000;
    let intervalMs = Math.max(1, options.interval) * 1000;

    while (Date.now() < deadline) {
      if (options.signal?.aborted) throw new B1OAuthError("access_denied", "polling aborted", 0);
      await delay(intervalMs, options.signal);

      const result = await this.pollDeviceToken(options.deviceCode);
      if (result.status === "approved") return result.token;
      if (result.status === "denied") throw new B1OAuthError("access_denied", "user denied the request", 400);
      if (result.status === "expired") throw new B1OAuthError("expired_token", "device code expired", 400);
      // pending — RFC 8628 "slow_down" backoff is conservative; nudge the interval up.
      intervalMs += 1000;
    }
    throw new B1OAuthError("expired_token", "device code expired", 400);
  }

  /** Looks up a pending device authorization by its user code (for an approval UI). */
  async getPendingDevice(userCode: string): Promise<unknown> {
    const url = `${this.baseUrl}/membership/oauth/device/pending/${encodeURIComponent(userCode)}`;
    const res = await this.fetchImpl(url, { headers: { Accept: "application/json" } });
    const body = await readJson(res);
    if (!res.ok) throw new B1OAuthError((body as any)?.error ?? "not_found", (body as any)?.error_description, res.status);
    return body;
  }

  private async post<T>(path: string, body: Record<string, unknown>, extraHeaders?: Record<string, string>): Promise<T> {
    const res = await this.rawPost(path, body, extraHeaders);
    if (!res.ok) {
      const b = res.body as any;
      throw new B1OAuthError(b?.error ?? "oauth_error", b?.error_description, res.status);
    }
    return res.body as T;
  }

  private async rawPost(
    path: string,
    body: Record<string, unknown>,
    extraHeaders?: Record<string, string>
  ): Promise<{ ok: boolean; status: number; body: unknown }> {
    const url = `${this.baseUrl}/membership/oauth${path}`;
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined && v !== null) clean[k] = v;
    }
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...extraHeaders },
      body: JSON.stringify(clean)
    });
    return { ok: res.ok, status: res.status, body: await readJson(res) };
  }
}

function scopeString(scope: B1Scope[] | string): string {
  return Array.isArray(scope) ? scope.join(" ") : scope;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new B1OAuthError("access_denied", "polling aborted", 0));
    }, { once: true });
  });
}
