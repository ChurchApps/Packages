import { ContentProviderConfig, DeviceAuthorizationResponse, DeviceFlowPollResult } from "../interfaces";

export class DeviceFlowHelper {
  supportsDeviceFlow(config: ContentProviderConfig): boolean {
    return !!config.supportsDeviceFlow && !!config.deviceAuthEndpoint;
  }

  async initiateDeviceFlow(config: ContentProviderConfig): Promise<DeviceAuthorizationResponse | null> {
    if (!this.supportsDeviceFlow(config)) return null;

    try {
      const response = await fetch(`${config.oauthBase}${config.deviceAuthEndpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: config.clientId, scope: config.scopes.join(" ") }) });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async pollDeviceFlowToken(config: ContentProviderConfig, deviceCode: string): Promise<DeviceFlowPollResult> {
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

  calculatePollDelay(baseInterval: number = 5, slowDownCount: number = 0): number {
    return (baseInterval + slowDownCount * 5) * 1000;
  }
}
