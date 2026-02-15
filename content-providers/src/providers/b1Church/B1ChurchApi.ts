import { ContentProviderAuthData, FeedVenueInterface, ContentItem, Plan, ContentFile, Instructions, VenueActionsResponseInterface } from "../../interfaces";
import { ArrangementKeyResponse, B1Ministry, B1PlanType, B1Plan } from "./B1ChurchTypes";

export const API_BASE = "https://api.churchapps.org";

export type ProxyMethod = "browse" | "getPresentations" | "getPlaylist" | "getInstructions";

export type ProxyResult<M extends ProxyMethod> =
  M extends "browse" ? ContentItem[] :
  M extends "getPresentations" ? Plan :
  M extends "getPlaylist" ? ContentFile[] :
  M extends "getInstructions" ? Instructions :
  never;
export const LESSONS_API_BASE = "https://api.lessons.church";
export const CONTENT_API_BASE = "https://contentapi.churchapps.org";

async function authFetch<T>(url: string, auth: ContentProviderAuthData | null | undefined): Promise<T | null> {
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (auth) {
      headers["Authorization"] = `Bearer ${auth.access_token}`;
    }
    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchMinistries(auth: ContentProviderAuthData | null | undefined): Promise<B1Ministry[]> {
  const result = await authFetch<B1Ministry[]>(`${API_BASE}/membership/groups/tag/ministry`, auth);
  return result || [];
}

export async function fetchPlanTypes(ministryId: string, auth: ContentProviderAuthData | null | undefined): Promise<B1PlanType[]> {
  const result = await authFetch<B1PlanType[]>(`${API_BASE}/doing/planTypes/ministryId/${ministryId}`, auth);
  return result || [];
}

export async function fetchPlans(planTypeId: string, auth: ContentProviderAuthData | null | undefined): Promise<B1Plan[]> {
  const result = await authFetch<B1Plan[]>(`${API_BASE}/doing/plans/types/${planTypeId}`, auth);
  return result || [];
}

export async function fetchVenueFeed(venueId: string): Promise<FeedVenueInterface | null> {
  try {
    const url = `${LESSONS_API_BASE}/venues/public/feed/${venueId}`;
    const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchVenuePlanItems(venueId: string): Promise<{ venueName?: string; items?: Record<string, unknown>[] } | null> {
  try {
    const url = `${LESSONS_API_BASE}/venues/public/planItems/${venueId}`;
    const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchVenueActions(venueId: string): Promise<VenueActionsResponseInterface | null> {
  try {
    const url = `${LESSONS_API_BASE}/venues/public/actions/${venueId}`;
    const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchArrangementKey(churchId: string, arrangementId: string): Promise<ArrangementKeyResponse | null> {
  try {
    const url = `${CONTENT_API_BASE}/arrangementKeys/presenter/${churchId}/${arrangementId}`;
    const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
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

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
