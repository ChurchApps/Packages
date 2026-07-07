import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ProviderLogos, ProviderCapabilities, AuthType } from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { BaseProvider } from "../BaseProvider";
import { PCOServiceType, PCOPlan, PCOPlanItem } from "./PlanningCenterInterfaces";

const ONE_WEEK_MS = 604800000;

function formatDate(dateString: string): string {
  return new Date(dateString).toISOString().slice(0, 10);
}

/** Browses Planning Center service types → plans → items. */
export class PlanningCenterProvider extends BaseProvider {
  readonly id = "planningcenter";
  readonly name = "Planning Center";

  readonly logos: ProviderLogos = { light: "https://www.planningcenter.com/icons/icon-512x512.png", dark: "https://www.planningcenter.com/icons/icon-512x512.png" };

  readonly config: ContentProviderConfig = { id: "planningcenter", name: "Planning Center", apiBase: "https://api.planningcenteronline.com", oauthBase: "https://api.planningcenteronline.com/oauth", clientId: "", scopes: ["services"] };

  readonly requiresAuth = true;
  // No client-side auth flow: clientId is unset and no PKCE methods exist. Auth tokens must be supplied externally (server-side).
  readonly authTypes: AuthType[] = [];
  // Plan items come back without media URLs, so playlist/instructions are not actually supported yet.
  readonly capabilities: ProviderCapabilities = { browse: true, playlist: false, instructions: false, mediaLicensing: false };

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);

    if (depth === 0) {
      return [{ type: "folder" as const, id: "serviceTypes-root", title: "Service Types", path: "/serviceTypes" }];
    }

    if (segments[0] !== "serviceTypes") return [];

    if (depth === 1) return this.getServiceTypes(auth);
    if (depth === 2) return this.getPlans(segments[1], path!, auth);
    if (depth === 3) return this.getPlanItems(segments[1], segments[2], auth);

    return [];
  }

  private async getServiceTypes(auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const response = await this.apiRequest<{ data: PCOServiceType[] }>("/services/v2/service_types", auth);
    if (!response?.data) return [];

    return response.data.map((serviceType) => ({
      type: "folder" as const,
      id: serviceType.id,
      title: serviceType.attributes.name,
      path: `/serviceTypes/${serviceType.id}`
    }));
  }

  private async getPlans(serviceTypeId: string, currentPath: string, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const response = await this.apiRequest<{ data: PCOPlan[] }>(
      `/services/v2/service_types/${serviceTypeId}/plans?filter=future&order=sort_date`,
      auth
    );
    if (!response?.data) return [];

    const now = Date.now();
    const filteredPlans = response.data.filter((plan) => {
      if (plan.attributes.items_count === 0) return false;
      const planDate = new Date(plan.attributes.sort_date).getTime();
      return planDate < now + ONE_WEEK_MS;
    });

    return filteredPlans.map((plan) => ({
      type: "folder" as const,
      id: plan.id,
      title: plan.attributes.title || formatDate(plan.attributes.sort_date),
      isLeaf: true,
      path: `${currentPath}/${plan.id}`
    }));
  }

  private async getPlanItems(serviceTypeId: string, planId: string, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const response = await this.apiRequest<{ data: PCOPlanItem[] }>(
      `/services/v2/service_types/${serviceTypeId}/plans/${planId}/items?per_page=100`,
      auth
    );
    if (!response?.data) return [];

    return response.data.map((item) => ({ type: "file" as const, id: item.id, title: item.attributes.title || "", mediaType: "image" as const, url: "" }));
  }
}
