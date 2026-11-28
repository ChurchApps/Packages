import { ContentProviderAuthData } from "../interfaces";
import { toAuthData } from "./TokenHelper";

export interface FormLoginConfig {
  /** Login endpoint path relative to apiBase. */
  path?: string;
  /** Full login URL template (must match provider's hosts allowlist). */
  url?: string;
  /** Request encoding ("json" by default, or "form" for application/x-www-form-urlencoded). */
  encoding?: "json" | "form";
  /** Field name for the user's email / username (default "email"). */
  usernameField?: string;
  /** Field name for the user's password (default "password"). */
  passwordField?: string;
  /** Additional static body fields to send alongside credentials. */
  extraFields?: Record<string, string>;
  /** Extra HTTP headers to send on the login request. */
  headers?: Record<string, string>;
  /** Expression reading `response` to extract the access token (defaults to standard access_token/token/jwt fields). */
  tokenExpr?: string;
  /** Expression reading `response` to extract the refresh token. */
  refreshTokenExpr?: string;
  /** Expression reading `response` to extract expires_in (in seconds). */
  expiresInExpr?: string;
  /** Fallback token lifetime in seconds when the response omits expires_in (default 86400). */
  defaultExpiresIn?: number;
}

export interface FormLoginResult {
  response: unknown;
  auth: ContentProviderAuthData | null;
}

export class FormLoginHelper {
  async login(
    url: string,
    email: string,
    password: string,
    config: FormLoginConfig,
    extract?: (expr: string, response: unknown) => unknown
  ): Promise<ContentProviderAuthData | null> {
    try {
      const encoding = config.encoding || "json";
      const fields: Record<string, string> = {
        ...(config.extraFields || {}),
        [config.usernameField || "email"]: email,
        [config.passwordField || "password"]: password
      };
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": encoding === "form" ? "application/x-www-form-urlencoded" : "application/json",
        ...(config.headers || {})
      };
      const body = encoding === "form" ? new URLSearchParams(fields).toString() : JSON.stringify(fields);
      const res = await fetch(url, { method: "POST", headers, body });
      if (!res.ok) return null;

      const data = await res.json().catch(() => null);
      if (!data || typeof data !== "object") return null;
      const obj = data as Record<string, unknown>;

      const accessToken = config.tokenExpr && extract
        ? extract(config.tokenExpr, data)
        : obj.access_token ?? obj.token ?? obj.jwt;
      if (typeof accessToken !== "string" || !accessToken) return null;

      const refreshToken = config.refreshTokenExpr && extract ? extract(config.refreshTokenExpr, data) : obj.refresh_token;
      const expiresIn = config.expiresInExpr && extract ? extract(config.expiresInExpr, data) : obj.expires_in;

      return toAuthData({
        access_token: accessToken,
        refresh_token: typeof refreshToken === "string" ? refreshToken : "",
        token_type: typeof obj.token_type === "string" ? obj.token_type : "Bearer",
        expires_in: typeof expiresIn === "number" && expiresIn > 0 ? expiresIn : (config.defaultExpiresIn ?? 86400),
        scope: typeof obj.scope === "string" ? obj.scope : ""
      });
    } catch {
      return null;
    }
  }
}
