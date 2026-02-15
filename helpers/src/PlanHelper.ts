import type { PlanInterface, PlanItemInterface, PlanItemContentInterface } from "./interfaces/index.js";
import type { ContentProviderInterface } from "./contentProviders/ContentProvider.js";
import { LessonsContentProvider } from "./contentProviders/LessonsContentProvider.js";

export class PlanHelper {
  private static providers: ContentProviderInterface[] = [new LessonsContentProvider()];

  // Register additional content providers
  static registerProvider(provider: ContentProviderInterface): void {
    // Avoid duplicates
    if (!this.providers.find(p => p.providerId === provider.providerId)) {
      this.providers.push(provider);
    }
  }

  // Replace a provider (useful for configuring with different URLs)
  static replaceProvider(provider: ContentProviderInterface): void {
    const index = this.providers.findIndex(p => p.providerId === provider.providerId);
    if (index >= 0) {
      this.providers[index] = provider;
    } else {
      this.providers.push(provider);
    }
  }

  // Main method: populate planItems with their content
  static async populate(
    plan: PlanInterface,
    planItems: PlanItemInterface[]
  ): Promise<PlanItemInterface[]> {
    // Flatten hierarchy to get all items
    const allItems = this.flattenItems(planItems);

    // Group items by provider
    const itemsByProvider = new Map<ContentProviderInterface, PlanItemInterface[]>();

    for (const item of allItems) {
      for (const provider of this.providers) {
        if (provider.canHandle(plan, item)) {
          const existing = itemsByProvider.get(provider) || [];
          existing.push(item);
          itemsByProvider.set(provider, existing);
          break; // First matching provider wins
        }
      }
    }

    // Fetch content from each provider in parallel
    const fetchPromises: Promise<void>[] = [];
    const contentMap = new Map<string, PlanItemContentInterface>();

    for (const [provider, items] of itemsByProvider) {
      fetchPromises.push(
        provider.fetchContent(plan, items).then(providerContent => {
          for (const [itemId, content] of providerContent) {
            contentMap.set(itemId, content);
          }
        })
      );
    }

    await Promise.all(fetchPromises);

    // Attach content to items (mutates in place for efficiency)
    this.attachContent(planItems, contentMap);

    return planItems;
  }

  // Flatten nested planItems for processing
  private static flattenItems(items: PlanItemInterface[]): PlanItemInterface[] {
    const result: PlanItemInterface[] = [];

    const collect = (itemList: PlanItemInterface[]) => {
      for (const item of itemList) {
        result.push(item);
        if (item.children?.length) {
          collect(item.children);
        }
      }
    };

    collect(items);
    return result;
  }

  // Attach content to items recursively
  private static attachContent(
    items: PlanItemInterface[],
    contentMap: Map<string, PlanItemContentInterface>
  ): void {
    for (const item of items) {
      const content = contentMap.get(item.id);
      if (content) {
        item.content = content;
      }
      if (item.children?.length) {
        this.attachContent(item.children, contentMap);
      }
    }
  }

  // Convenience: Get the lessons provider for direct lesson operations
  static getLessonsProvider(): LessonsContentProvider {
    return this.providers.find(p => p.providerId === "lessons") as LessonsContentProvider;
  }

  // ============================================
  // Time Formatting Utilities
  // ============================================

  /**
   * Format seconds as MM:SS string
   * @param seconds - Number of seconds to format
   * @returns Formatted time string (e.g., "3:45")
   */
  static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  }

  /**
   * Calculate total duration of a section's children
   * @param section - PlanItem with children
   * @returns Total seconds from all children
   */
  static getSectionDuration(section: PlanItemInterface): number {
    let totalSeconds = 0;
    section.children?.forEach((child) => {
      totalSeconds += child.seconds || 0;
    });
    return totalSeconds;
  }
}
