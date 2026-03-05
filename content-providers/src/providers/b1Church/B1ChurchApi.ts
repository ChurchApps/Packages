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
    console.log(`[B1Church] authFetch: ${url}`);
    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      console.warn(`[B1Church] authFetch failed: ${url} → HTTP ${response.status} ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    console.log(`[B1Church] authFetch OK: ${url} → ${Array.isArray(data) ? data.length + " items" : typeof data}`);
    return data;
  } catch (err) {
    console.error(`[B1Church] authFetch error: ${url}`, err);
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
    console.log(`[B1Church] fetchVenueFeed: ${url}`);
    const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    if (!response.ok) {
      console.warn(`[B1Church] fetchVenueFeed failed: HTTP ${response.status} ${response.statusText} for venueId=${venueId}`);
      return null;
    }
    const data = await response.json();
    console.log(`[B1Church] fetchVenueFeed OK: venueId=${venueId}, sections=${data?.sections?.length ?? "none"}`);
    return data;
  } catch (err) {
    console.error(`[B1Church] fetchVenueFeed error: venueId=${venueId}`, err);
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
    console.log(`[B1Church] fetchVenueActions: ${url}`);
    const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    if (!response.ok) {
      console.warn(`[B1Church] fetchVenueActions failed: HTTP ${response.status} ${response.statusText} for venueId=${venueId}`);
      return null;
    }
    const data = await response.json();
    console.log(`[B1Church] fetchVenueActions OK: venueId=${venueId}`);
    return data;
  } catch (err) {
    console.error(`[B1Church] fetchVenueActions error: venueId=${venueId}`, err);
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

    console.log(`[B1Church] providerProxy: ${method} providerId=${providerId} path=${path}`);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.warn(`[B1Church] providerProxy failed: ${method} → HTTP ${response.status} ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    console.log(`[B1Church] providerProxy OK: ${method} → ${Array.isArray(data) ? data.length + " items" : typeof data}`);
    return data;
  } catch (err) {
    console.error(`[B1Church] providerProxy error: ${method}`, err);
    return null;
  }
}
