import axios from "axios";
import { ITextingProvider, TextingProviderConfig, TextingSendResult, ProviderCapabilities, AddSubscriberOptions, SubscriberResult, ListsResult } from "../../interfaces.js";

export class MutualMinistryProvider implements ITextingProvider {
  readonly name = "MutualMinistry";
  readonly capabilities: ProviderCapabilities = { addSubscriber: false, getLists: false };

  private getBaseUrl(): string {
    const url = process.env.STORE_API_URL;
    if (!url) throw new Error("STORE_API_URL environment variable is not configured");
    return url;
  }

  async sendMessage(config: TextingProviderConfig, to: string, message: string): Promise<TextingSendResult> {
    try {
      const url = `${this.getBaseUrl()}/sms/send`;
      const resp = await axios.post(url, {
        churchId: config.churchId,
        to,
        message,
        fromNumber: config.fromNumber
      }, { timeout: 10000 });

      return {
        success: resp.data?.success ?? false,
        providerMessageId: resp.data?.providerMessageId,
        error: resp.data?.error
      };
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message;
      return { success: false, error: msg };
    }
  }

  async sendBulk(config: TextingProviderConfig, recipients: string[], message: string): Promise<TextingSendResult[]> {
    try {
      const url = `${this.getBaseUrl()}/sms/sendBulk`;
      const resp = await axios.post(url, {
        churchId: config.churchId,
        recipients,
        message,
        fromNumber: config.fromNumber
      }, { timeout: 30000 });

      return resp.data?.results ?? recipients.map(() => ({ success: false, error: "Unexpected response" }));
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message;
      return recipients.map(() => ({ success: false, error: msg }));
    }
  }

  async addSubscriber(_config: TextingProviderConfig, _mobileNumber: string, _options?: AddSubscriberOptions): Promise<SubscriberResult> {
    return { success: false, error: "Mutual Ministry does not support adding subscribers via API" };
  }

  async getLists(_config: TextingProviderConfig): Promise<ListsResult> {
    return { success: false, error: "Mutual Ministry does not support listing via API" };
  }

  async validateCredentials(config: TextingProviderConfig): Promise<boolean> {
    try {
      const url = `${this.getBaseUrl()}/check/credits?churchId=${encodeURIComponent(config.churchId)}&creditType=texting`;
      const resp = await axios.get(url, { timeout: 5000 });
      return resp.status === 200;
    } catch {
      return false;
    }
  }
}
