import axios from "axios";
import { ITextingProvider, TextingProviderConfig, TextingSendResult, ProviderCapabilities, AddSubscriberOptions, SubscriberResult, ListsResult } from "../../interfaces.js";

const DEFAULT_BASE_URL = "https://api.getclearstream.com/v1";

export class ClearstreamProvider implements ITextingProvider {
  readonly name = "Clearstream";
  readonly capabilities: ProviderCapabilities = { addSubscriber: true, getLists: true };

  private getBaseUrl(config: TextingProviderConfig) {
    return config.baseUrl || DEFAULT_BASE_URL;
  }

  private getHeaders(config: TextingProviderConfig) {
    return {
      "X-Api-Key": config.apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
  }

  private buildMessageBody(subscribers: string, message: string, fromNumber?: string) {
    const body: Record<string, unknown> = { subscribers, message_body: message };
    if (fromNumber) body.message_header = fromNumber;
    else body.use_default_header = true;
    return body;
  }

  async sendMessage(config: TextingProviderConfig, to: string, message: string): Promise<TextingSendResult> {
    try {
      const response = await axios.post(
        `${this.getBaseUrl(config)}/messages`,
        this.buildMessageBody(to, message, config.fromNumber),
        { headers: this.getHeaders(config) }
      );

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
      const response = await axios.post(
        `${this.getBaseUrl(config)}/messages`,
        this.buildMessageBody(recipients.join(","), message, config.fromNumber),
        { headers: this.getHeaders(config) }
      );

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

  async addSubscriber(config: TextingProviderConfig, mobileNumber: string, options?: AddSubscriberOptions): Promise<SubscriberResult> {
    try {
      const body: Record<string, unknown> = { mobile_number: mobileNumber, double_optin: false };
      if (options?.lists) body.lists = options.lists;
      if (options?.firstName) body.first = options.firstName;
      if (options?.lastName) body.last = options.lastName;

      const response = await axios.post(`${this.getBaseUrl(config)}/subscribers`, body, {
        headers: this.getHeaders(config)
      });
      return { success: true, data: response.data?.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error?.message || error.response?.data?.message || error.message };
    }
  }

  async getLists(config: TextingProviderConfig): Promise<ListsResult> {
    try {
      const response = await axios.get(`${this.getBaseUrl(config)}/lists`, {
        headers: this.getHeaders(config),
        params: { limit: 100 }
      });
      const lists = (response.data?.data || []).map((l: any) => ({ id: l.id, name: l.name }));
      return { success: true, lists };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  async validateCredentials(config: TextingProviderConfig): Promise<boolean> {
    try {
      const response = await axios.get(`${this.getBaseUrl(config)}/subscribers`, {
        headers: this.getHeaders(config),
        params: { limit: 1 }
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
