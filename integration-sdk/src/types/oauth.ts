
/** A recognised OAuth / API-key scope. */
export type B1KnownScope =
  | "people:read" | "people:write"
  | "groups:read" | "groups:write"
  | "donations:read" | "donations:write"
  | "attendance:read" | "attendance:write"
  | "forms:write"
  | "content:read" | "content:write"
  | "messaging:read" | "messaging:write"
  | "roles:read" | "roles:write"
  | "settings:read" | "settings:write"
  | "offline_access";

/** Scope strings — known scopes get autocomplete, custom strings still allowed. */
export type B1Scope = B1KnownScope | (string & {});

/** All scopes B1 recognises in its catalog (plus `offline_access`). */
export const B1_SCOPES: B1KnownScope[] = [
  "people:read",
  "people:write",
  "groups:read",
  "groups:write",
  "donations:read",
  "donations:write",
  "attendance:read",
  "attendance:write",
  "forms:write",
  "content:read",
  "content:write",
  "messaging:read",
  "messaging:write",
  "roles:read",
  "roles:write",
  "settings:read",
  "settings:write",
  "offline_access"
];

export type B1GrantType =
  | "authorization_code"
  | "refresh_token"
  | "urn:ietf:params:oauth:grant-type:device_code";

/** The token response from `POST /membership/oauth/token`. */
export interface B1TokenResponse {
  access_token: string;
  token_type: "Bearer";
  /** Lifetime in seconds. */
  expires_in: number;
  /** Unix timestamp (seconds) the token was created. Absent on the device grant. */
  created_at?: number;
  refresh_token: string;
  scope: string;
}

/** The response from `POST /membership/oauth/device/authorize` (RFC 8628). */
export interface B1DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  /** Lifetime in seconds. */
  expires_in: number;
  /** Recommended poll interval in seconds. */
  interval: number;
}

/** Outcome of a single device-token poll. */
export type B1DevicePollResult =
  | { status: "approved"; token: B1TokenResponse }
  | { status: "pending" }
  | { status: "expired" }
  | { status: "denied" };
