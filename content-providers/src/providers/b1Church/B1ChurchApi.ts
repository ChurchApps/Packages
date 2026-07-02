import { ContentProviderAuthData, FeedVenueInterface, ContentItem, Plan, ContentFile, Instructions, VenueActionsResponseInterface } from "../../interfaces";
import { B1Ministry, B1PlanType, B1Plan, B1PlanItem } from "./B1ChurchTypes";

export const API_BASE = "https://api.churchapps.org";
export const LESSONS_API_BASE = "https://api.lessons.church";

export type ProxyMethod = "browse" | "getPresentations" | "getPlaylist" | "getInstructions";

export type ProxyResult<M extends ProxyMethod> =
  M extends "browse" ? ContentItem[] :
  M extends "getPresentations" ? Plan :
  M extends "getPlaylist" ? ContentFile[] :
  M extends "getInstructions" ? Instructions :
  never;

async function authFetch<T>(url: string, auth?: ContentProviderAuthData | null): Promise<T | null> {
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (auth) headers["Authorization"] = `Bearer ${auth.access_token}`;
    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      console.warn(`[B1Church] authFetch failed: ${url} → HTTP ${response.status} ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error(`[B1Church] authFetch error: ${url}`, err);
    return null;
  }
}

export async function fetchMinistries(auth: ContentProviderAuthData | null | undefined): Promise<B1Ministry[]> {
  return (await authFetch<B1Ministry[]>(`${API_BASE}/membership/groups/tag/ministry`, auth)) || [];
}

export async function fetchPlanTypes(ministryId: string, auth: ContentProviderAuthData | null | undefined): Promise<B1PlanType[]> {
  return (await authFetch<B1PlanType[]>(`${API_BASE}/doing/planTypes/ministryId/${ministryId}`, auth)) || [];
}

export async function fetchPlans(planTypeId: string, auth: ContentProviderAuthData | null | undefined): Promise<B1Plan[]> {
  return (await authFetch<B1Plan[]>(`${API_BASE}/doing/plans/types/${planTypeId}`, auth)) || [];
}

export async function fetchCurrentPlanByType(planTypeId: string): Promise<B1Plan | null> {
  return authFetch<B1Plan>(`${API_BASE}/doing/plans/public/current/${planTypeId}`);
}

export async function fetchPlanItems(churchId: string, planId: string): Promise<B1PlanItem[]> {
  return (await authFetch<B1PlanItem[]>(`${API_BASE}/doing/planItems/presenter/${churchId}/${planId}`)) || [];
}

export async function fetchVenueFeed(venueId: string): Promise<FeedVenueInterface | null> {
  return authFetch<FeedVenueInterface>(`${LESSONS_API_BASE}/venues/public/feed/${venueId}`);
}

export async function fetchVenueActions(venueId: string): Promise<VenueActionsResponseInterface | null> {
  return authFetch<VenueActionsResponseInterface>(`${LESSONS_API_BASE}/venues/public/actions/${venueId}`);
}

export async function fetchVenueImages(venueIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (venueIds.length === 0) return map;
  const data = await authFetch<Array<{ venueId?: string; lessonImage?: string }>>(`${LESSONS_API_BASE}/venues/public/images?ids=${venueIds.join(",")}`);
  for (const row of data || []) {
    if (row.venueId && row.lessonImage) map.set(row.venueId, row.lessonImage);
  }
  return map;
}

export async function fetchFromProviderProxy<M extends ProxyMethod>(
  method: M,
  ministryId: string,
  providerId: string,
  path: string,
  authData?: ContentProviderAuthData | null,
  resolution?: number
): Promise<ProxyResult<M> | null> {
  try {
    const url = `${API_BASE}/doing/providerProxy/${method}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json"
    };
    if (authData) {
      headers["Authorization"] = `Bearer ${authData.access_token}`;
    }

    const body: Record<string, unknown> = { ministryId, providerId, path };
    if (resolution !== undefined) body.resolution = resolution;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.warn(`[B1Church] providerProxy failed: ${method} → HTTP ${response.status} ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error(`[B1Church] providerProxy error: ${method}`, err);
    return null;
  }
}
