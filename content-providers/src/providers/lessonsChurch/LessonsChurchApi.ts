export const API_BASE = "https://api.lessons.church";

export async function apiRequest<T>(path: string): Promise<T | null> {
  try {
    const url = `${API_BASE}${path}`;
    const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
