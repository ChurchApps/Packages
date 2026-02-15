import { ContentProviderAuthData, MediaLicenseResult } from "../../interfaces";

export const API_BASE = "https://api-prod.amazingkids.app";

export async function checkMediaLicense(mediaId: string, auth?: ContentProviderAuthData | null): Promise<MediaLicenseResult | null> {
  if (!auth) return null;

  try {
    const url = `${API_BASE}/prod/reports/media/license-check`;
    const response = await fetch(url, { method: "POST", headers: { "Authorization": `Bearer ${auth.access_token}`, "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ mediaIds: [mediaId] }) });

    if (!response.ok) return null;

    const data = await response.json();
    const licenseData = Array.isArray(data) ? data : data.data || [];
    const result = licenseData.find((item: Record<string, unknown>) => item.mediaId === mediaId);

    if (result?.isLicensed) {
      return { mediaId, status: "valid", message: "Media is licensed for playback", expiresAt: result.expiresAt as string | number | undefined };
    }
    return { mediaId, status: "not_licensed", message: "Media is not licensed" };
  } catch {
    return { mediaId, status: "unknown", message: "Unable to verify license status" };
  }
}
