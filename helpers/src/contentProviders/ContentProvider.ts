import type { PlanInterface, PlanItemInterface, PlanItemContentInterface } from "../interfaces/index.js";

export interface ContentProviderInterface {
  // Unique identifier for this provider
  readonly providerId: string;

  // Check if this provider handles the given plan/planItem
  canHandle(plan: PlanInterface, planItem: PlanItemInterface): boolean;

  // Fetch content for multiple planItems (batch for efficiency)
  fetchContent(
    plan: PlanInterface,
    planItems: PlanItemInterface[]
  ): Promise<Map<string, PlanItemContentInterface>>;
}
