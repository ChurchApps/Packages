import axios from "axios";
import { ITextingProvider, TextingProviderConfig, TextingSendResult } from "../../interfaces.js";

const BASE_URL = "https://api.textinchurch.com/API/1_0";

export class TextInChurchProvider implements ITextingProvider {
  readonly name = "TextInChurch";

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

      const response = await axios.post(`${BASE_URL}/message.php`, params, {
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
      const response = await axios.get(`${BASE_URL}/getMe.php`, {
        headers: this.getHeaders(config)
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private async lookupContactByPhone(config: TextingProviderConfig, phone: string): Promise<string | null> {
    try {
      const response = await axios.get(`${BASE_URL}/contact.php`, {
        headers: this.getHeaders(config),
        params: { primary_phone: phone }
      });
      const contacts = response.data;
      if (Array.isArray(contacts) && contacts.length > 0) {
        return contacts[0].contact_id?.toString() || null;
      }
      return null;
    } catch {
      return null;
    }
  }
}
