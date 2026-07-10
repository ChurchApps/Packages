import axios from "axios";
import { ITextingProvider, TextingProviderConfig, TextingSendResult, ProviderCapabilities, AddSubscriberOptions, SubscriberResult, ListsResult } from "../../interfaces.js";

export class MinistryStuffProvider implements ITextingProvider {
  readonly name = "MinistryStuff";
  readonly capabilities: ProviderCapabilities = { addSubscriber: false, getLists: false };

  private getBaseUrl(config: TextingProviderConfig): string {
    const url = config.baseUrl || process.env.MINISTRYSTUFF_API_URL;
    if (!url) throw new Error("MINISTRYSTUFF_API_URL environment variable is not configured and no baseUrl provided");
    return url;
  }

  // apiSecret carries the server-to-server key, injected by the Api; churches never see it
  private getHeaders(config: TextingProviderConfig) {
    return { "X-Service-Key": config.apiSecret || "" };
  }

  private extractError(error: any): string {
    if (error.response?.data?.reason === "insufficient_credits") return "insufficient_credits";
    return error.response?.data?.error?.message
      || error.response?.data?.error
      || error.response?.data?.message
      || error.message;
  }

  async sendMessage(config: TextingProviderConfig, to: string, message: string): Promise<TextingSendResult> {
    try {
      const url = `${this.getBaseUrl(config)}/sms/send`;
      const resp = await axios.post(url, {
        churchId: config.churchId,
        to,
        message
      }, { timeout: 10000, headers: this.getHeaders(config) });

      if (resp.data?.reason === "insufficient_credits") return { success: false, error: "insufficient_credits" };
      return {
        success: resp.data?.success ?? false,
        providerMessageId: resp.data?.providerMessageId,
        error: resp.data?.error
      };
    } catch (error: any) {
      return { success: false, error: this.extractError(error) };
    }
  }

  async sendBulk(config: TextingProviderConfig, recipients: string[], message: string): Promise<TextingSendResult[]> {
    try {
      const url = `${this.getBaseUrl(config)}/sms/sendBulk`;
      const resp = await axios.post(url, {
        churchId: config.churchId,
        recipients,
        message
      }, { timeout: 30000, headers: this.getHeaders(config) });

      if (resp.data?.reason === "insufficient_credits") return recipients.map(() => ({ success: false, error: "insufficient_credits" }));
      return resp.data?.results ?? recipients.map(() => ({ success: false, error: "Unexpected response" }));
    } catch (error: any) {
      const msg = this.extractError(error);
      return recipients.map(() => ({ success: false, error: msg }));
    }
  }

  async addSubscriber(_config: TextingProviderConfig, _mobileNumber: string, _options?: AddSubscriberOptions): Promise<SubscriberResult> {
    return { success: false, error: "MinistryStuff does not support adding subscribers via API" };
  }

  async getLists(_config: TextingProviderConfig): Promise<ListsResult> {
    return { success: false, error: "MinistryStuff does not support listing via API" };
  }

  async validateCredentials(config: TextingProviderConfig): Promise<boolean> {
    try {
      const url = `${this.getBaseUrl(config)}/check/credits?churchId=${encodeURIComponent(config.churchId)}&creditType=texting`;
      const resp = await axios.get(url, { timeout: 5000, headers: this.getHeaders(config) });
      return resp.status === 200 && resp.data?.hasCredits === true;
    } catch {
      return false;
    }
  }
}
