import { ContentProviderConfig, DeviceAuthorizationResponse, DeviceFlowPollResult } from "../interfaces";
import { toAuthData } from "./TokenHelper";

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
        const auth = toAuthData(data, { scope: config.scopes.join(" ") });
        return data.plan_type_id ? { ...auth, planTypeId: data.plan_type_id as string } : auth;
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
