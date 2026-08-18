import axios from "axios";
import { ITextingProvider, TextingProviderConfig, TextingSendResult, ProviderCapabilities, AddSubscriberOptions, SubscriberResult, ListsResult } from "../../interfaces.js";

const DEFAULT_BASE_URL = "https://api.textinchurch.com/API/1_0";

export class TextInChurchProvider implements ITextingProvider {
  readonly name = "TextInChurch";
  readonly capabilities: ProviderCapabilities = { addSubscriber: true, getLists: false };

  private getBaseUrl(config: TextingProviderConfig) {
    return config.baseUrl || DEFAULT_BASE_URL;
  }

  private getHeaders(config: TextingProviderConfig) {
    return {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    };
  }

  async sendMessage(config: TextingProviderConfig, to: string, message: string): Promise<TextingSendResult> {
    try {
      // Look up the contact by phone number
      const contactId = await this.lookupContactByPhone(config, to);
      if (!contactId) {
        return { success: false, error: `No TextInChurch contact found for phone: ${to}` };
      }

      const params = new URLSearchParams();
      params.append("contact_id", contactId);
      params.append("msg_type", "sms");
      params.append("msg_content", message);

      const response = await axios.post(`${this.getBaseUrl(config)}/message.php`, params, {
        headers: this.getHeaders(config)
      });

      return {
        success: true,
        providerMessageId: response.data?.hash || response.data?.message_id
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.error || error.message
      };
    }
  }

  async sendBulk(config: TextingProviderConfig, recipients: string[], message: string): Promise<TextingSendResult[]> {
    const results: TextingSendResult[] = [];
    for (const to of recipients) {
      const result = await this.sendMessage(config, to, message);
      results.push(result);
    }
    return results;
  }

  async validateCredentials(config: TextingProviderConfig): Promise<boolean> {
    try {
      const response = await axios.get(`${this.getBaseUrl(config)}/getMe.php`, {
        headers: this.getHeaders(config)
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async addSubscriber(config: TextingProviderConfig, mobileNumber: string, options?: AddSubscriberOptions): Promise<SubscriberResult> {
    try {
      const existing = await this.lookupContactByPhone(config, mobileNumber);
      if (existing) return { success: true, data: { contact_id: existing } };

      const meResponse = await axios.get(`${this.getBaseUrl(config)}/getMe.php`, { headers: this.getHeaders(config) });
      const me = Array.isArray(meResponse.data) ? meResponse.data[0] : meResponse.data;
      const accountId = me?.account_id;
      if (!accountId) return { success: false, error: "Could not determine TextInChurch account_id" };

      const params = new URLSearchParams();
      params.append("contact_first_name", options?.firstName || "Unknown");
      params.append("contact_last_name", options?.lastName || "Unknown");
      params.append("primary_phone", this.normalizePhone(mobileNumber));
      params.append("primary_country", "US");
      params.append("account_id", accountId.toString());

      const response = await axios.post(`${this.getBaseUrl(config)}/contact.php`, params, { headers: this.getHeaders(config) });
      return { success: true, data: { contact_id: response.data?.contact_id?.toString() } };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || error.response?.data?.error || error.message };
    }
  }

  async getLists(_config: TextingProviderConfig): Promise<ListsResult> {
    return { success: false, error: "TextInChurch does not support listing via API" };
  }

  // TIC expects "numbers only excluding country code" (e.g. 5557453298).
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  }

  // Errors propagate so an auth/network failure surfaces as the send error instead of "no contact found".
  private async lookupContactByPhone(config: TextingProviderConfig, phone: string): Promise<string | null> {
    const response = await axios.get(`${this.getBaseUrl(config)}/contact.php`, {
      headers: this.getHeaders(config),
      params: { primary_phone: this.normalizePhone(phone) }
    });
    const contacts = response.data;
    if (Array.isArray(contacts) && contacts.length > 0) return contacts[0].contact_id?.toString() || null;
    return null;
  }
}
