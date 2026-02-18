export interface TextingSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface TextingProviderConfig {
  churchId: string;
  apiKey: string;
  apiSecret: string;
  fromNumber?: string;
  /** Override the provider's default API base URL (useful for proxying in browser environments). */
  baseUrl?: string;
}

export interface SubscriberResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface TextingList {
  id: number;
  name: string;
}

export interface ListsResult {
  success: boolean;
  lists?: TextingList[];
  error?: string;
}

export interface AddSubscriberOptions {
  lists?: string;
  firstName?: string;
  lastName?: string;
}

/** Declares which optional features a provider supports. */
export interface ProviderCapabilities {
  addSubscriber: boolean;
  getLists: boolean;
}

export interface ITextingProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  sendMessage(config: TextingProviderConfig, to: string, message: string): Promise<TextingSendResult>;
  sendBulk(config: TextingProviderConfig, recipients: string[], message: string): Promise<TextingSendResult[]>;
  validateCredentials(config: TextingProviderConfig): Promise<boolean>;
  addSubscriber(config: TextingProviderConfig, mobileNumber: string, options?: AddSubscriberOptions): Promise<SubscriberResult>;
  getLists(config: TextingProviderConfig): Promise<ListsResult>;
}

export interface ProviderInfo {
  id: string;
  name: string;
  requiresApiKey: boolean;
  requiresSecret: boolean;
  settingsUrl: string;
  helpText: string;
}
