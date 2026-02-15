import { ContentProviderAuthData, ContentProviderConfig, DeviceAuthorizationResponse, DeviceFlowPollResult } from "../../interfaces";

async function generateCodeChallenge(verifier: string): Promise<string> {
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

export async function buildB1AuthUrl(config: ContentProviderConfig, appBase: string, redirectUri: string, codeVerifier: string, state?: string): Promise<{ url: string; challengeMethod: string }> {
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const oauthParams = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scopes.join(" "),
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: state || ""
  });
  const url = `${appBase}/oauth?${oauthParams.toString()}`;
  return { url, challengeMethod: "S256" };
}

export async function exchangeCodeForTokensWithPKCE(config: ContentProviderConfig, code: string, redirectUri: string, codeVerifier: string): Promise<ContentProviderAuthData | null> {
  try {
    const params = { grant_type: "authorization_code", code, client_id: config.clientId, code_verifier: codeVerifier, redirect_uri: redirectUri };

    const tokenUrl = `${config.oauthBase}/token`;
    const response = await fetch(tokenUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return { access_token: data.access_token, refresh_token: data.refresh_token, token_type: data.token_type || "Bearer", created_at: Math.floor(Date.now() / 1000), expires_in: data.expires_in, scope: data.scope || config.scopes.join(" ") };
  } catch {
    return null;
  }
}

export async function exchangeCodeForTokensWithSecret(config: ContentProviderConfig, code: string, redirectUri: string, clientSecret: string): Promise<ContentProviderAuthData | null> {
  try {
    const params = { grant_type: "authorization_code", code, client_id: config.clientId, client_secret: clientSecret, redirect_uri: redirectUri };

    const tokenUrl = `${config.oauthBase}/token`;
    const response = await fetch(tokenUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return { access_token: data.access_token, refresh_token: data.refresh_token, token_type: data.token_type || "Bearer", created_at: Math.floor(Date.now() / 1000), expires_in: data.expires_in, scope: data.scope || config.scopes.join(" ") };
  } catch {
    return null;
  }
}

export async function refreshTokenWithSecret(config: ContentProviderConfig, auth: ContentProviderAuthData, clientSecret: string): Promise<ContentProviderAuthData | null> {
  if (!auth.refresh_token) return null;

  try {
    const params = { grant_type: "refresh_token", refresh_token: auth.refresh_token, client_id: config.clientId, client_secret: clientSecret };
    const response = await fetch(`${config.oauthBase}/token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) });
    if (!response.ok) return null;

    const data = await response.json();
    return { access_token: data.access_token, refresh_token: data.refresh_token || auth.refresh_token, token_type: data.token_type || "Bearer", created_at: Math.floor(Date.now() / 1000), expires_in: data.expires_in, scope: data.scope || auth.scope };
  } catch {
    return null;
  }
}

export async function initiateDeviceFlow(config: ContentProviderConfig): Promise<DeviceAuthorizationResponse | null> {
  if (!config.supportsDeviceFlow || !config.deviceAuthEndpoint) return null;

  try {
    const response = await fetch(`${config.oauthBase}${config.deviceAuthEndpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: config.clientId, scope: config.scopes.join(" ") }) });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

export async function pollDeviceFlowToken(config: ContentProviderConfig, deviceCode: string): Promise<DeviceFlowPollResult> {
  try {
    const response = await fetch(`${config.oauthBase}/token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: deviceCode, client_id: config.clientId }) });

    if (response.ok) {
      const data = await response.json();
      return { access_token: data.access_token, refresh_token: data.refresh_token, token_type: data.token_type || "Bearer", created_at: Math.floor(Date.now() / 1000), expires_in: data.expires_in, scope: data.scope || config.scopes.join(" ") };
    }

    const errorData = await response.json();
    switch (errorData.error) {
      case "authorization_pending": return { error: "authorization_pending" };
      case "slow_down": return { error: "slow_down", shouldSlowDown: true };
      case "expired_token": return null;
      case "access_denied": return null;
      default: return null;
    }
  } catch {
    return { error: "network_error" };
  }
}
