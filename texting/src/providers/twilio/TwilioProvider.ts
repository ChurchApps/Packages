import axios from "axios";
import { ITextingProvider, TextingProviderConfig, TextingSendResult, ProviderCapabilities, SubscriberResult, ListsResult } from "../../interfaces.js";

const DEFAULT_BASE_URL = "https://api.twilio.com/2010-04-01";

// The church brings its own account: apiKey is the Account SID, apiSecret the Auth Token, fromNumber a number or Messaging Service SID.
export class TwilioProvider implements ITextingProvider {
  readonly name = "Twilio";
  readonly capabilities: ProviderCapabilities = { addSubscriber: false, getLists: false };

  // E.164: a bare 10-digit number is taken as US (+1); anything else keeps its own country code.
  static normalizeNumber(phone: string) {
    const digits = phone.replace(/\D/g, "");
    return !phone.trim().startsWith("+") && digits.length === 10 ? "+1" + digits : "+" + digits;
  }

  private baseUrl(config: TextingProviderConfig) {
    return config.baseUrl || DEFAULT_BASE_URL;
  }

  private auth(config: TextingProviderConfig) {
    return { username: config.apiKey, password: config.apiSecret };
  }

  private errorText(data: any): string {
    if (!data) return "";
    if (data.code) return `${data.code}: ${data.message || ""}`.trim();
    return typeof data === "string" ? data : JSON.stringify(data);
  }

  async sendMessage(config: TextingProviderConfig, to: string, message: string): Promise<TextingSendResult> {
    const body = new URLSearchParams({ To: TwilioProvider.normalizeNumber(to), Body: message });
    const from = config.fromNumber || "";
    if (from.startsWith("MG")) body.append("MessagingServiceSid", from);
    else body.append("From", from);
    try {
      const response = await axios.post(`${this.baseUrl(config)}/Accounts/${config.apiKey}/Messages.json`, body, {
        auth: this.auth(config),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      return { success: true, providerMessageId: response.data?.sid };
    } catch (error: any) {
      return { success: false, error: this.errorText(error.response?.data) || error.message };
    }
  }

  // Twilio has no bulk endpoint, so each recipient is its own request.
  async sendBulk(config: TextingProviderConfig, recipients: string[], message: string): Promise<TextingSendResult[]> {
    const results: TextingSendResult[] = [];
    for (const to of recipients) results.push(await this.sendMessage(config, to, message));
    return results;
  }

  async validateCredentials(config: TextingProviderConfig): Promise<boolean> {
    if (!config.apiKey || !config.apiSecret || !config.fromNumber) return false;
    try {
      const response = await axios.get(`${this.baseUrl(config)}/Accounts/${config.apiKey}.json`, { auth: this.auth(config) });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async addSubscriber(): Promise<SubscriberResult> {
    return { success: false, error: "Twilio does not support subscriber management" };
  }

  async getLists(): Promise<ListsResult> {
    return { success: false, error: "Twilio does not support lists" };
  }
}
