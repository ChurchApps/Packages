import axios from "axios";
import { ITextingProvider, TextingProviderConfig, TextingSendResult, ProviderCapabilities, SubscriberResult, ListsResult } from "../../interfaces.js";

const DEFAULT_BASE_URL = "https://sms.nalosolutions.com/smsbackend";
const SUCCESS = "1701";

export class NaloProvider implements ITextingProvider {
  readonly name = "Nalo Solutions";
  readonly capabilities: ProviderCapabilities = { addSubscriber: false, getLists: false };

  // ponytail: local Ghana numbers (0XXXXXXXXX) become 233XXXXXXXXX; other formats pass through as digits.
  static normalizeNumber(phone: string) {
    const digits = phone.replace(/\D/g, "");
    return /^0\d{9}$/.test(digits) ? "233" + digits.substring(1) : digits;
  }

  private async send(config: TextingProviderConfig, recipients: string[], message: string): Promise<TextingSendResult> {
    try {
      const response = await axios.post(
        `${config.baseUrl || DEFAULT_BASE_URL}/Resl_Nalo/send-message/`,
        { key: config.apiKey, msisdn: recipients.map(NaloProvider.normalizeNumber).join(","), message, sender_id: config.fromNumber || "" },
        { headers: { "Content-Type": "application/json" } }
      );
      if (String(response.data?.status) === SUCCESS) return { success: true, providerMessageId: response.data?.job_id };
      return { success: false, error: this.errorText(response.data) };
    } catch (error: any) {
      return { success: false, error: this.errorText(error.response?.data) || error.message };
    }
  }

  private errorText(data: any): string {
    if (!data) return "";
    if (data.code) return `${data.code}: ${data.message || ""}`.trim();
    return typeof data === "string" ? data : JSON.stringify(data);
  }

  sendMessage(config: TextingProviderConfig, to: string, message: string): Promise<TextingSendResult> {
    return this.send(config, [to], message);
  }

  async sendBulk(config: TextingProviderConfig, recipients: string[], message: string): Promise<TextingSendResult[]> {
    const result = await this.send(config, recipients, message);
    return recipients.map(() => ({ ...result }));
  }

  // Nalo validates fields before auth and has no account endpoint, so a key can't be checked without sending.
  async validateCredentials(config: TextingProviderConfig): Promise<boolean> {
    return !!config.apiKey && !!config.fromNumber;
  }

  async addSubscriber(): Promise<SubscriberResult> {
    return { success: false, error: "Nalo Solutions does not support subscriber management" };
  }

  async getLists(): Promise<ListsResult> {
    return { success: false, error: "Nalo Solutions does not support lists" };
  }
}
