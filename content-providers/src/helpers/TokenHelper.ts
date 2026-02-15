import { ContentProviderAuthData, ContentProviderConfig } from "../interfaces";

export class TokenHelper {
  isAuthValid(auth: ContentProviderAuthData | null | undefined): boolean {
    if (!auth) return false;
    return !this.isTokenExpired(auth);
  }

  isTokenExpired(auth: ContentProviderAuthData): boolean {
    if (!auth.created_at || !auth.expires_in) return true;
    const expiresAt = (auth.created_at + auth.expires_in) * 1000;
    return Date.now() > expiresAt - 5 * 60 * 1000; // 5-minute buffer
  }

  async refreshToken(config: ContentProviderConfig, auth: ContentProviderAuthData): Promise<ContentProviderAuthData | null> {
    if (!auth.refresh_token) return null;

    try {
      const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: auth.refresh_token,
        client_id: config.clientId
      });

      const response = await fetch(`${config.oauthBase}/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
      if (!response.ok) return null;

      const data = await response.json();
      return { access_token: data.access_token, refresh_token: data.refresh_token || auth.refresh_token, token_type: data.token_type || "Bearer", created_at: Math.floor(Date.now() / 1000), expires_in: data.expires_in, scope: data.scope || auth.scope };
    } catch {
      return null;
    }
  }
}
