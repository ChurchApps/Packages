export interface ContentProviderAuthData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  created_at: number;
  expires_in: number;
  scope: string;
}

/** A single endpoint value - either a static string or a function that generates a path */
export type EndpointValue = string | ((...args: string[]) => string);

/** Configuration for provider API endpoints */
export type EndpointsConfig = Record<string, EndpointValue>;

export interface ContentProviderConfig {
  id: string;
  name: string;
  apiBase: string;
  oauthBase: string;
  clientId: string;
  scopes: string[];
  supportsDeviceFlow?: boolean;
  deviceAuthEndpoint?: string;
  endpoints: EndpointsConfig;
}

export interface DeviceAuthorizationResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval?: number;
}

export interface DeviceFlowState {
  status: "loading" | "awaiting_user" | "polling" | "success" | "error" | "expired";
  deviceAuth?: DeviceAuthorizationResponse;
  error?: string;
  pollCount?: number;
}

export type AuthType = "none" | "oauth_pkce" | "device_flow" | "form_login";

export interface ProviderLogos {
  light: string;
  dark: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  logos: ProviderLogos;
  implemented: boolean;
  requiresAuth: boolean;
  authTypes: AuthType[];
  capabilities: ProviderCapabilities;
}

export interface ContentFolder {
  type: "folder";
  id: string;
  title: string;
  thumbnail?: string;
  isLeaf?: boolean;
  path: string;
}

export interface ContentFile {
  type: "file";
  id: string;
  title: string;
  mediaType: "video" | "image";
  thumbnail?: string;
  url: string;
  downloadUrl?: string;
  muxPlaybackId?: string;
  decryptionKey?: string;
  mediaId?: string;
  pingbackUrl?: string;
  seconds?: number;
  loop?: boolean;
  loopVideo?: boolean;
  streamUrl?: string;
  /** Provider-specific metadata that varies by provider implementation */
  providerData?: Record<string, unknown>;
}

export type ContentItem = ContentFolder | ContentFile;

export function isContentFolder(item: ContentItem): item is ContentFolder {
  return item.type === "folder";
}

export function isContentFile(item: ContentItem): item is ContentFile {
  return item.type === "file";
}

export type DeviceFlowPollResult =
  | ContentProviderAuthData
  | { error: string; shouldSlowDown?: boolean }
  | null;

export interface PlanPresentation {
  id: string;
  name: string;
  actionType: "play" | "other";
  files: ContentFile[];
  providerData?: Record<string, unknown>;
}

export interface PlanSection {
  id: string;
  name: string;
  presentations: PlanPresentation[];
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  sections: PlanSection[];
  allFiles: ContentFile[];
}

export interface FeedFileInterface {
  id?: string;
  name?: string;
  url?: string;
  streamUrl?: string;
  seconds?: number;
  fileType?: string;
  thumbnail?: string;
}

export interface FeedActionInterface {
  id?: string;
  actionType?: string;
  content?: string;
  files?: FeedFileInterface[];
}

export interface FeedSectionInterface {
  id?: string;
  name?: string;
  actions?: FeedActionInterface[];
}

export interface FeedVenueInterface {
  id?: string;
  lessonId?: string;
  name?: string;
  lessonName?: string;
  lessonDescription?: string;
  lessonImage?: string;
  sections?: FeedSectionInterface[];
}

export interface InstructionItem {
  id?: string;
  itemType?: string;
  relatedId?: string;
  label?: string;
  actionType?: string;
  content?: string;
  seconds?: number;
  children?: InstructionItem[];
  downloadUrl?: string;
  thumbnail?: string;
}

export interface Instructions {
  name?: string;
  items: InstructionItem[];
}

export interface VenueActionInterface {
  id?: string;
  name?: string;
  actionType?: string;
  seconds?: number;
}

export interface VenueSectionActionsInterface {
  id?: string;
  name?: string;
  actions?: VenueActionInterface[];
}

export interface VenueActionsResponseInterface {
  venueName?: string;
  sections?: VenueSectionActionsInterface[];
}

export interface ProviderCapabilities {
  browse: boolean;
  presentations: boolean;
  playlist: boolean;
  instructions: boolean;
  mediaLicensing: boolean;
}

export type MediaLicenseStatus = "valid" | "expired" | "not_licensed" | "unknown";

export interface MediaLicenseResult {
  mediaId: string;
  status: MediaLicenseStatus;
  message?: string;
  expiresAt?: string | number;
}

/**
 * Core provider interface - all providers should implement this
 */
export interface IProvider {
  // Identity (required)
  readonly id: string;
  readonly name: string;
  readonly logos: ProviderLogos;
  readonly config: ContentProviderConfig;

  // Metadata (required)
  readonly requiresAuth: boolean;
  readonly capabilities: ProviderCapabilities;
  readonly authTypes: AuthType[];

  // Core methods (required)
  browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]>;
  // getPresentations(path: string, auth?: ContentProviderAuthData | null): Promise<Plan | null>;

  // Auth methods (required)
  supportsDeviceFlow(): boolean;

  // Auth methods (optional - only needed for providers that require auth)
  generateCodeVerifier?(): string;
  buildAuthUrl?(codeVerifier: string, redirectUri: string, state?: string): Promise<{ url: string; challengeMethod: string }>;
  exchangeCodeForTokens?(code: string, codeVerifier: string, redirectUri: string): Promise<ContentProviderAuthData | null>;
  initiateDeviceFlow?(): Promise<DeviceAuthorizationResponse | null>;
  pollDeviceFlowToken?(deviceCode: string): Promise<DeviceFlowPollResult>;

  // Optional methods - providers can implement these if they have custom logic
  getPlaylist?(path: string, auth?: ContentProviderAuthData | null, resolution?: number): Promise<ContentFile[] | null>;
  getInstructions?(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null>;
  checkMediaLicense?(mediaId: string, auth?: ContentProviderAuthData | null): Promise<MediaLicenseResult | null>;
}
