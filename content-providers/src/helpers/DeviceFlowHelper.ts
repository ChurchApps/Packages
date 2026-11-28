import { ContentProviderConfig, DeviceAuthorizationResponse, DeviceFlowPollResult } from "../interfaces";
import { toAuthData } from "./TokenHelper";

export class DeviceFlowHelper {
  supportsDeviceFlow(config: ContentProviderConfig): boolean {
    return !!config.supportsDeviceFlow && !!config.deviceAuthEndpoint;
  }

  async initiateDeviceFlow(config: ContentProviderConfig): Promise<DeviceAuthorizationResponse | null> {
    if (!this.supportsDeviceFlow(config)) return null;

    try {
      const url = `${config.oauthBase}${config.deviceAuthEndpoint}`;
      const isForm = config.deviceFlowEncoding === "form";
      const fields: Record<string, string> = { client_id: config.clientId, scope: config.scopes.join(" ") };
      if (config.clientSecret) fields.client_secret = config.clientSecret;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": isForm ? "application/x-www-form-urlencoded" : "application/json" },
        body: isForm ? new URLSearchParams(fields).toString() : JSON.stringify(fields)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async pollDeviceFlowToken(config: ContentProviderConfig, deviceCode: string): Promise<DeviceFlowPollResult> {
    try {
      const url = config.tokenUrl || `${config.oauthBase}/token`;
      const isForm = config.deviceFlowEncoding === "form";
      const fields: Record<string, string> = {
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: deviceCode,
        client_id: config.clientId
      };
      if (config.clientSecret) fields.client_secret = config.clientSecret;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": isForm ? "application/x-www-form-urlencoded" : "application/json" },
        body: isForm ? new URLSearchParams(fields).toString() : JSON.stringify(fields)
      });

      if (response.ok) {
        const data = await response.json();
        return toAuthData(data, { scope: config.scopes.join(" ") });
      }

      const errorData = await response.json().catch(() => ({}));
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
