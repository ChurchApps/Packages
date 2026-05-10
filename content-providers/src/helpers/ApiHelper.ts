import { ContentProviderAuthData, ContentProviderConfig } from "../interfaces";

export class ApiHelper {
  createAuthHeaders(auth: ContentProviderAuthData | null | undefined): Record<string, string> | null {
    if (!auth) return null;
    return { Authorization: `Bearer ${auth.access_token}`, Accept: "application/json" };
  }

  async apiRequest<T>(config: ContentProviderConfig, providerId: string, path: string, auth?: ContentProviderAuthData | null, method: "GET" | "POST" = "GET", body?: unknown): Promise<T | null> {
    const url = `${config.apiBase}${path}`;
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (auth) headers["Authorization"] = `Bearer ${auth.access_token}`;
      if (body) headers["Content-Type"] = "application/json";

      const options: RequestInit = { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) };
      const response = await fetch(url, options);

      if (!response.ok) {
        console.warn(`[${providerId}] apiRequest failed: ${method} ${url} → HTTP ${response.status} ${response.statusText}`);
        return null;
      }
      return await response.json();
    } catch (err) {
      console.error(`[${providerId}] apiRequest error: ${method} ${url}`, err);
      return null;
    }
  }
}
