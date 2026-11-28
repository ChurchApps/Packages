import { ContentProviderAuthData, ContentProviderConfig } from "../interfaces";
import { toAuthData } from "./TokenHelper";

export function generateCodeVerifier(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const length = 64;
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(array[i] % chars.length);
  }
  return result;
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);

  let binary = "";
  for (let i = 0; i < hashArray.length; i++) {
    binary += String.fromCharCode(hashArray[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodeTokenBody(fields: Record<string, string>, encoding: "form" | "json"): { headers: Record<string, string>; body: string } {
  if (encoding === "json") {
    return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) };
  }
  return { headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fields).toString() };
}

export class OAuthHelper {
  generateCodeVerifier(): string {
    return generateCodeVerifier();
  }

  async generateCodeChallenge(verifier: string): Promise<string> {
    return generateCodeChallenge(verifier);
  }

  async buildAuthUrl(config: ContentProviderConfig, codeVerifier: string, redirectUri: string, state?: string): Promise<{ url: string; challengeMethod: string }> {
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    return { url: this.buildAuthUrlFromChallenge(config, codeChallenge, redirectUri, state || ""), challengeMethod: "S256" };
  }

  buildAuthUrlFromChallenge(config: ContentProviderConfig, codeChallenge: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: config.scopes.join(" "),
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state
    });
    for (const [key, value] of Object.entries(config.authorizeParams || {})) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const base = config.authorizeUrl || `${config.oauthBase}/authorize`;
    return `${base}?${params.toString()}`;
  }

  async exchangeCodeForTokens(config: ContentProviderConfig, _providerId: string, code: string, codeVerifier: string, redirectUri: string): Promise<ContentProviderAuthData | null> {
    const fields: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      code_verifier: codeVerifier
    };
    if (config.clientSecret) fields.client_secret = config.clientSecret;
    return this.postToken(config, fields);
  }

  async exchangeCodeForTokensWithSecret(config: ContentProviderConfig, code: string, redirectUri: string, clientSecret: string): Promise<ContentProviderAuthData | null> {
    const fields: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: clientSecret
    };
    return this.postToken(config, fields);
  }

  private async postToken(config: ContentProviderConfig, fields: Record<string, string>): Promise<ContentProviderAuthData | null> {
    try {
      const tokenUrl = config.tokenUrl || `${config.oauthBase}/token`;
      const { headers, body } = encodeTokenBody(fields, config.tokenEncoding || "form");
      const response = await fetch(tokenUrl, { method: "POST", headers, body });

      if (!response.ok) return null;

      const data = await response.json();
      return toAuthData(data, { scope: config.scopes.join(" ") });
    } catch {
      return null;
    }
  }
}
