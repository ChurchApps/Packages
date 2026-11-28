import { ContentProviderAuthData, NetworkInstance } from "../../interfaces";

// FreeShow's browsing, playlists and slide mapping live in its JSON manifest. These helpers run on the host:
// they turn a machine found on the network into a saved sign-in and back.

export function networkInstanceToAuth(instance: NetworkInstance): ContentProviderAuthData {
  return {
    access_token: instance.id,
    refresh_token: JSON.stringify(instance),
    token_type: "network",
    created_at: Math.floor(Date.now() / 1000),
    expires_in: 10 * 365 * 24 * 3600,
    scope: "freeshow"
  };
}

export function authToNetworkInstance(auth?: ContentProviderAuthData | null): NetworkInstance | null {
  if (!auth?.refresh_token) return null;
  try {
    const parsed = JSON.parse(auth.refresh_token) as NetworkInstance;
    if (parsed?.id && parsed?.name) return parsed;
  } catch {
    return null;
  }
  return null;
}
