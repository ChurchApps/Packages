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
}

export interface ITextingProvider {
  readonly name: string;
  sendMessage(config: TextingProviderConfig, to: string, message: string): Promise<TextingSendResult>;
  sendBulk(config: TextingProviderConfig, recipients: string[], message: string): Promise<TextingSendResult[]>;
  validateCredentials(config: TextingProviderConfig): Promise<boolean>;
}

export interface ProviderInfo {
  id: string;
  name: string;
  requiresSecret: boolean;
  settingsUrl: string;
  helpText: string;
}
