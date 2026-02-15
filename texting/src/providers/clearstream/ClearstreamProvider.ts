import axios from "axios";
import { ITextingProvider, TextingProviderConfig, TextingSendResult } from "../../interfaces.js";

const BASE_URL = "https://api.getclearstream.com/v1";

export class ClearstreamProvider implements ITextingProvider {
  readonly name = "Clearstream";

  private getHeaders(config: TextingProviderConfig) {
    return {
      "X-Api-Key": config.apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    };
  }

  async sendMessage(config: TextingProviderConfig, to: string, message: string): Promise<TextingSendResult> {
    try {
      const params = new URLSearchParams();
      params.append("subscribers", to);
      params.append("message_body", message);
      if (config.fromNumber) params.append("message_header", config.fromNumber);
      else params.append("use_default_header", "true");

      const response = await axios.post(`${BASE_URL}/messages`, params, {
        headers: this.getHeaders(config)
      });

      return {
        success: true,
        providerMessageId: response.data?.data?.id?.toString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.response?.data?.message || error.message
      };
    }
  }

  async sendBulk(config: TextingProviderConfig, recipients: string[], message: string): Promise<TextingSendResult[]> {
    // Clearstream supports multiple subscribers in a single request
    try {
      const params = new URLSearchParams();
      params.append("subscribers", recipients.join(","));
      params.append("message_body", message);
      if (config.fromNumber) params.append("message_header", config.fromNumber);
      else params.append("use_default_header", "true");

      const response = await axios.post(`${BASE_URL}/messages`, params, {
        headers: this.getHeaders(config)
      });

      const sent = response.data?.data?.sent_count || recipients.length;
      return recipients.map((_, i) => ({
        success: i < sent,
        providerMessageId: response.data?.data?.id?.toString()
      }));
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      return recipients.map(() => ({ success: false, error: errMsg }));
    }
  }

  async validateCredentials(config: TextingProviderConfig): Promise<boolean> {
    try {
      const response = await axios.get(`${BASE_URL}/subscribers`, {
        headers: this.getHeaders(config),
        params: { limit: 1 }
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
