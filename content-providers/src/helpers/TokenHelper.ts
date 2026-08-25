import { ContentProviderAuthData, ContentProviderConfig } from "../interfaces";

/** Map a raw OAuth token response to ContentProviderAuthData, stamping created_at. */
export function toAuthData(data: Record<string, unknown>, fallbacks?: { refreshToken?: string; scope?: string; planTypeId?: string }): ContentProviderAuthData & { planTypeId?: string } {
  const planTypeId = (data.plan_type_id as string) || fallbacks?.planTypeId;
  return {
    access_token: data.access_token as string,
    refresh_token: (data.refresh_token as string) || fallbacks?.refreshToken || "",
    token_type: (data.token_type as string) || "Bearer",
    created_at: Math.floor(Date.now() / 1000),
    expires_in: data.expires_in as number,
    scope: (data.scope as string) || fallbacks?.scope || "",
    ...(planTypeId ? { planTypeId } : {})
  };
}

export function authIsExpired(auth: ContentProviderAuthData | null | undefined, nowMs: number = Date.now()): boolean {
  if (!auth?.created_at || !auth.expires_in) return true;
  const lifetimeMs = auth.expires_in * 1000;
  const expiresAt = (auth.created_at + auth.expires_in) * 1000;
  const bufferMs = Math.min(5 * 60 * 1000, Math.floor(lifetimeMs / 10));
  return nowMs > expiresAt - bufferMs;
}

export class TokenHelper {
  private static inflight = new Map<string, Promise<ContentProviderAuthData | null>>();

  isAuthValid(auth: ContentProviderAuthData | null | undefined): boolean {
    return !authIsExpired(auth);
  }

  isTokenExpired(auth: ContentProviderAuthData): boolean {
    return authIsExpired(auth);
  }

  async refreshToken(config: ContentProviderConfig, auth: ContentProviderAuthData): Promise<ContentProviderAuthData | null> {
    if (!auth.refresh_token) return null;
    const key = `${config.oauthBase}|${config.clientId}|${auth.refresh_token}`;
    const existing = TokenHelper.inflight.get(key);
    if (existing) return existing;
    const pending = this.doRefresh(config, auth).finally(() => { TokenHelper.inflight.delete(key); });
    TokenHelper.inflight.set(key, pending);
    return pending;
  }

  private async doRefresh(config: ContentProviderConfig, auth: ContentProviderAuthData): Promise<ContentProviderAuthData | null> {
    try {
      const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: auth.refresh_token,
        client_id: config.clientId
      });
      if (config.clientSecret) params.set("client_secret", config.clientSecret);

      const response = await fetch(`${config.oauthBase}/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
      if (!response.ok) {
        console.warn(`[TokenHelper] Token refresh failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      const planTypeId = (auth as ContentProviderAuthData & { planTypeId?: string }).planTypeId;
      return toAuthData(data, { refreshToken: auth.refresh_token, scope: auth.scope, planTypeId });
    } catch {
      return null;
    }
  }
}
