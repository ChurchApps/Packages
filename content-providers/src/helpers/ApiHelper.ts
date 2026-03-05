import { ContentProviderAuthData, ContentProviderConfig } from "../interfaces";

export class ApiHelper {
  createAuthHeaders(auth: ContentProviderAuthData | null | undefined): Record<string, string> | null {
    if (!auth) return null;
    return { Authorization: `Bearer ${auth.access_token}`, Accept: "application/json" };
  }

  async apiRequest<T>(config: ContentProviderConfig, _providerId: string, path: string, auth?: ContentProviderAuthData | null, method: "GET" | "POST" = "GET", body?: unknown): Promise<T | null> {
    try {
      const url = `${config.apiBase}${path}`;
      const headers: Record<string, string> = { Accept: "application/json" };
      if (auth) headers["Authorization"] = `Bearer ${auth.access_token}`;
      if (body) headers["Content-Type"] = "application/json";

      console.log(`[B1Church] apiRequest: ${method} ${url}`);
      const options: RequestInit = { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) };
      const response = await fetch(url, options);

      if (!response.ok) {
        console.warn(`[B1Church] apiRequest failed: ${method} ${url} → HTTP ${response.status} ${response.statusText}`);
        return null;
      }
      const data = await response.json();
      console.log(`[B1Church] apiRequest OK: ${method} ${url} → ${Array.isArray(data) ? data.length + " items" : typeof data}`);
      return data;
    } catch (err) {
      console.error(`[B1Church] apiRequest error: ${method} ${config.apiBase}${path}`, err);
      return null;
    }
  }
}
