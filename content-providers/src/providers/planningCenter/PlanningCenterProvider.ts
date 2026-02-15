import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ProviderLogos, ProviderCapabilities, IProvider, AuthType } from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { ApiHelper } from "../../helpers";
import { PCOServiceType, PCOPlan, PCOPlanItem } from "./PlanningCenterInterfaces";
import { formatDate } from "./PlanningCenterConverters";

/**
 * PlanningCenter Provider
 *
 * Path structure:
 *   /serviceTypes                            -> list service types
 *   /serviceTypes/{serviceTypeId}            -> list plans
 *   /serviceTypes/{serviceTypeId}/{planId}   -> plan items (leaf)
 */
export class PlanningCenterProvider implements IProvider {
  private readonly apiHelper = new ApiHelper();

  private async apiRequest<T>(path: string, auth?: ContentProviderAuthData | null): Promise<T | null> {
    return this.apiHelper.apiRequest<T>(this.config, this.id, path, auth);
  }

  readonly id = "planningcenter";
  readonly name = "Planning Center";

  readonly logos: ProviderLogos = { light: "https://www.planningcenter.com/icons/icon-512x512.png", dark: "https://www.planningcenter.com/icons/icon-512x512.png" };

  readonly config: ContentProviderConfig = { id: "planningcenter", name: "Planning Center", apiBase: "https://api.planningcenteronline.com", oauthBase: "https://api.planningcenteronline.com/oauth", clientId: "", scopes: ["services"], endpoints: { serviceTypes: "/services/v2/service_types", plans: (serviceTypeId: string) => `/services/v2/service_types/${serviceTypeId}/plans`, planItems: (serviceTypeId: string, planId: string) => `/services/v2/service_types/${serviceTypeId}/plans/${planId}/items`, song: (itemId: string) => `/services/v2/songs/${itemId}`, arrangement: (songId: string, arrangementId: string) => `/services/v2/songs/${songId}/arrangements/${arrangementId}`, arrangementSections: (songId: string, arrangementId: string) => `/services/v2/songs/${songId}/arrangements/${arrangementId}/sections`, media: (mediaId: string) => `/services/v2/media/${mediaId}`, mediaAttachments: (mediaId: string) => `/services/v2/media/${mediaId}/attachments` } };

  private readonly ONE_WEEK_MS = 604800000;

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["oauth_pkce"];
  readonly capabilities: ProviderCapabilities = { browse: true, presentations: true, playlist: true, instructions: true, mediaLicensing: false };

  async browse(path?: string | null, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);

    if (depth === 0) {
      return [{ type: "folder" as const, id: "serviceTypes-root", title: "Service Types", path: "/serviceTypes" }];
    }

    const root = segments[0];
    if (root !== "serviceTypes") return [];

    if (depth === 1) return this.getServiceTypes(auth);
    if (depth === 2) return this.getPlans(segments[1], path!, auth);
    if (depth === 3) return this.getPlanItems(segments[1], segments[2], auth);

    return [];
  }

  private async getServiceTypes(auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const response = await this.apiRequest<{ data: PCOServiceType[] }>(
      this.config.endpoints.serviceTypes as string,
      auth
    );

    if (!response?.data) return [];

    return response.data.map((serviceType) => ({
      type: "folder" as const,
      id: serviceType.id,
      title: serviceType.attributes.name,
      path: `/serviceTypes/${serviceType.id}`
    }));
  }

  private async getPlans(serviceTypeId: string, currentPath: string, auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const pathFn = this.config.endpoints.plans as (id: string) => string;
    const response = await this.apiRequest<{ data: PCOPlan[] }>(
      `${pathFn(serviceTypeId)}?filter=future&order=sort_date`,
      auth
    );

    if (!response?.data) return [];

    const now = Date.now();
    const filteredPlans = response.data.filter((plan) => {
      if (plan.attributes.items_count === 0) return false;
      const planDate = new Date(plan.attributes.sort_date).getTime();
      return planDate < now + this.ONE_WEEK_MS;
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
    const pathFn = this.config.endpoints.planItems as (stId: string, pId: string) => string;
    const response = await this.apiRequest<{ data: PCOPlanItem[] }>(
      `${pathFn(serviceTypeId, planId)}?per_page=100`,
      auth
    );

    if (!response?.data) return [];

    return response.data.map((item) => ({ type: "file" as const, id: item.id, title: item.attributes.title || "", mediaType: "image" as const, url: "" }));
  }

  // async getPresentations(path: string, auth?: ContentProviderAuthData | null): Promise<Plan | null> {
  //   const { segments, depth } = parsePath(path);

  //   if (depth < 3 || segments[0] !== "serviceTypes") return null;

  //   const serviceTypeId = segments[1];
  //   const planId = segments[2];

  //   const pathFn = this.config.endpoints.planItems as (stId: string, pId: string) => string;
  //   const response = await this.apiRequest<{ data: PCOPlanItem[] }>(
  //     `${pathFn(serviceTypeId, planId)}?per_page=100`,
  //     auth
  //   );

  //   if (!response?.data) return null;

  //   const plans = await this.getPlans(serviceTypeId, `/serviceTypes/${serviceTypeId}`, auth);
  //   const plan = plans.find(p => p.id === planId);
  //   const planTitle = plan?.title || "Plan";

  //   const sections: PlanSection[] = [];
  //   const allFiles: ContentFile[] = [];
  //   let currentSection: PlanSection | null = null;

  //   for (const item of response.data) {
  //     const itemType = item.attributes.item_type;

  //     if (itemType === "header") {
  //       if (currentSection && currentSection.presentations.length > 0) sections.push(currentSection);
  //       currentSection = { id: item.id, name: item.attributes.title || "Section", presentations: [] };
  //       continue;
  //     }

  //     if (!currentSection) {
  //       currentSection = { id: `default-${planId}`, name: "Service", presentations: [] };
  //     }

  //     const presentation = await convertToPresentation(this.config, item, auth);
  //     if (presentation) {
  //       currentSection.presentations.push(presentation);
  //       allFiles.push(...presentation.files);
  //     }
  //   }

  //   if (currentSection && currentSection.presentations.length > 0) {
  //     sections.push(currentSection);
  //   }

  //   return { id: planId, name: planTitle as string, sections, allFiles };
  // }

  // async getPlaylist(path: string, auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
  //   const plan = await this.getPresentations(path, auth);
  //   if (!plan) return null;
  //   return plan.allFiles.length > 0 ? plan.allFiles : null;
  // }

  // async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
  //   const plan = await this.getPresentations(path, auth);
  //   if (!plan) return null;

  //   return buildInstructionsFromPlan(plan);
  // }

  supportsDeviceFlow(): boolean {
    return false;
  }
}
