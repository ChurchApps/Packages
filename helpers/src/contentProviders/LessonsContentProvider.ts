import { ApiHelper } from "../ApiHelper.js";
import type { PlanInterface, PlanItemInterface, PlanItemContentInterface, ExternalVenueRefInterface } from "../interfaces/index.js";
import type { VenuePlanItemsResponseInterface, VenueActionResponseInterface, LessonTreeInterface, LessonActionTreeInterface } from "../interfaces/Lessons.js";
import type { ContentProviderInterface } from "./ContentProvider.js";

export class LessonsContentProvider implements ContentProviderInterface {
  readonly providerId = "lessons";

  private lessonsUrl: string;

  constructor(lessonsUrl: string = "https://lessons.church") {
    this.lessonsUrl = lessonsUrl;
  }

  canHandle(plan: PlanInterface, planItem: PlanItemInterface): boolean {
    // Handles: lessonAction, lessonAddOn, lessonSection, and items with relatedId when plan has lesson
    const lessonTypes = ["lessonAction", "lessonAddOn", "lessonSection"];
    const hasLessonPlan = plan?.contentType === "venue" || plan?.contentType === "externalVenue";

    if (lessonTypes.includes(planItem.itemType) && planItem.relatedId) return true;
    if (planItem.itemType === "item" && planItem.relatedId && hasLessonPlan) return true;

    return false;
  }

  async fetchContent(
    plan: PlanInterface,
    planItems: PlanItemInterface[]
  ): Promise<Map<string, PlanItemContentInterface>> {
    const result = new Map<string, PlanItemContentInterface>();

    // Group by type for efficient batching
    const actions = planItems.filter(p => p.itemType === "lessonAction" && p.relatedId);
    const addOns = planItems.filter(p => p.itemType === "lessonAddOn" && p.relatedId);
    const sections = planItems.filter(p =>
      (p.itemType === "lessonSection" || p.itemType === "item") && p.relatedId);

    const externalRef = this.getExternalRef(plan);

    // Build embed URLs for each item
    for (const item of actions) {
      result.set(item.id, {
        provider: this.providerId,
        embedUrl: externalRef
          ? `${this.lessonsUrl}/embed/external/${externalRef.externalProviderId}/action/${item.relatedId}`
          : `${this.lessonsUrl}/embed/action/${item.relatedId}`
      });
    }

    for (const item of addOns) {
      result.set(item.id, {
        provider: this.providerId,
        embedUrl: externalRef
          ? `${this.lessonsUrl}/embed/external/${externalRef.externalProviderId}/addon/${item.relatedId}`
          : `${this.lessonsUrl}/embed/addon/${item.relatedId}`
      });
    }

    for (const item of sections) {
      result.set(item.id, {
        provider: this.providerId,
        embedUrl: externalRef
          ? `${this.lessonsUrl}/embed/external/${externalRef.externalProviderId}/section/${item.relatedId}`
          : `${this.lessonsUrl}/embed/section/${item.relatedId}`
      });
    }

    return result;
  }

  // ============================================
  // Plan/Lesson Association Methods
  // ============================================

  hasAssociatedLesson(plan: PlanInterface): boolean {
    return (plan?.contentType === "venue" || plan?.contentType === "externalVenue") && !!plan?.contentId;
  }

  isExternalVenue(plan: PlanInterface): boolean {
    return plan?.contentType === "externalVenue";
  }

  getExternalRef(plan: PlanInterface): ExternalVenueRefInterface | null {
    if (!this.isExternalVenue(plan) || !plan?.contentId) return null;
    try {
      return JSON.parse(plan.contentId);
    } catch {
      return null;
    }
  }

  getVenueId(plan: PlanInterface): string | null {
    if (!this.hasAssociatedLesson(plan)) return null;
    if (this.isExternalVenue(plan)) {
      return this.getExternalRef(plan)?.venueId || null;
    }
    return plan.contentId || null;
  }

  // ============================================
  // API Fetch Methods
  // ============================================

  /**
   * Fetch venue plan items - the basic hierarchical structure
   * Returns: headers with children (sections), but sections don't have their actions
   * Use this for preview mode display
   */
  async fetchVenuePlanItems(plan: PlanInterface): Promise<VenuePlanItemsResponseInterface> {
    if (!this.hasAssociatedLesson(plan)) return { items: [] };
    const externalRef = this.getExternalRef(plan);
    if (externalRef) {
      return await ApiHelper.getAnonymous(
        `/externalProviders/${externalRef.externalProviderId}/venue/${externalRef.venueId}/planItems`,
        "LessonsApi"
      );
    }
    return await ApiHelper.getAnonymous(`/venues/public/planItems/${plan.contentId}`, "LessonsApi");
  }

  /**
   * Fetch venue actions - sections with their full action lists
   * Use this for action selection dialogs and full expansion
   */
  async fetchVenueActions(plan: PlanInterface): Promise<VenueActionResponseInterface> {
    if (!this.hasAssociatedLesson(plan)) return { sections: [] };
    const externalRef = this.getExternalRef(plan);
    if (externalRef) {
      return await ApiHelper.getAnonymous(
        `/externalProviders/${externalRef.externalProviderId}/venue/${externalRef.venueId}/actions`,
        "LessonsApi"
      );
    }
    return await ApiHelper.getAnonymous(`/venues/public/actions/${plan.contentId}`, "LessonsApi");
  }

  /**
   * Fetch the full lesson tree for browsing (programs -> studies -> lessons -> venues)
   */
  async fetchLessonTree(): Promise<LessonTreeInterface> {
    return await ApiHelper.getAnonymous("/lessons/public/tree", "LessonsApi");
  }

  /**
   * Fetch the action tree for action selection (includes actions in each venue section)
   */
  async fetchActionTree(): Promise<LessonActionTreeInterface> {
    return await ApiHelper.getAnonymous("/lessons/public/actionTree", "LessonsApi");
  }

  // ============================================
  // Display List Methods (for preview/display without full actions)
  // ============================================

  /**
   * Get the display list - hierarchical items suitable for preview
   * Structure: headers -> sections (no actions expanded)
   * This is the lightweight version for showing what a lesson contains
   */
  async getDisplayList(plan: PlanInterface): Promise<PlanItemInterface[]> {
    const response = await this.fetchVenuePlanItems(plan);
    return response?.items || [];
  }

  /**
   * Get display list with sections only (strip actions from children)
   * Use this when importing a lesson as editable plan items
   */
  async getSectionsOnlyList(plan: PlanInterface): Promise<PlanItemInterface[]> {
    const response = await this.fetchVenuePlanItems(plan);
    if (!response?.items) return [];

    return response.items.map(item => ({
      ...item,
      children: item.children?.map(section => ({
        ...section,
        children: undefined // Remove actions from sections
      }))
    }));
  }

  // ============================================
  // Expanded List Methods (with full actions)
  // ============================================

  /**
   * Get the fully expanded list - items with all actions populated in sections
   * Merges fetchVenuePlanItems with fetchVenueActions to get complete data
   */
  async getExpandedList(plan: PlanInterface): Promise<PlanItemInterface[]> {
    const [planItemsResponse, actionsResponse] = await Promise.all([
      this.fetchVenuePlanItems(plan),
      this.fetchVenueActions(plan)
    ]);

    if (!planItemsResponse?.items) return [];

    // Create a map of section ID -> actions
    const sectionActionsMap = new Map<string, PlanItemInterface[]>();
    if (actionsResponse?.sections) {
      for (const section of actionsResponse.sections) {
        if (section.id && section.actions) {
          sectionActionsMap.set(section.id, section.actions.map(action => ({
            itemType: "lessonAction",
            relatedId: action.id,
            label: action.name,
            description: action.actionType,
            seconds: action.seconds
          })));
        }
      }
    }

    // Recursively expand sections with their actions
    const expandItem = (item: PlanItemInterface): PlanItemInterface => {
      if (!item.children) return item;

      return {
        ...item,
        children: item.children.map(child => {
          // If this is a section (has relatedId), try to get its actions
          if (child.relatedId && sectionActionsMap.has(child.relatedId)) {
            return {
              ...child,
              children: sectionActionsMap.get(child.relatedId)
            };
          }
          // Otherwise recursively process
          return expandItem(child);
        })
      };
    };

    return planItemsResponse.items.map(expandItem);
  }

  // ============================================
  // Embed URL Helpers
  // ============================================

  /**
   * Get embed URL for an action
   */
  getActionEmbedUrl(actionId: string, externalProviderId?: string): string {
    if (externalProviderId) {
      return `${this.lessonsUrl}/embed/external/${externalProviderId}/action/${actionId}`;
    }
    return `${this.lessonsUrl}/embed/action/${actionId}`;
  }

  /**
   * Get embed URL for an add-on
   */
  getAddOnEmbedUrl(addOnId: string, externalProviderId?: string): string {
    if (externalProviderId) {
      return `${this.lessonsUrl}/embed/external/${externalProviderId}/addon/${addOnId}`;
    }
    return `${this.lessonsUrl}/embed/addon/${addOnId}`;
  }

  /**
   * Get embed URL for a section
   */
  getSectionEmbedUrl(sectionId: string, externalProviderId?: string): string {
    if (externalProviderId) {
      return `${this.lessonsUrl}/embed/external/${externalProviderId}/section/${sectionId}`;
    }
    return `${this.lessonsUrl}/embed/section/${sectionId}`;
  }

  /**
   * Get the external provider ID from a plan (if external)
   */
  getExternalProviderId(plan: PlanInterface): string | null {
    const externalRef = this.getExternalRef(plan);
    return externalRef?.externalProviderId || null;
  }
}
