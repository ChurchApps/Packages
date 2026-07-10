import type { PlanInterface, PlanItemInterface, PlanItemContentInterface } from "./interfaces/index.js";
import type { ContentProviderInterface } from "./contentProviders/ContentProvider.js";
import { LessonsContentProvider } from "./contentProviders/LessonsContentProvider.js";

export class PlanHelper {
  private static providers: ContentProviderInterface[] = [new LessonsContentProvider()];

  static registerProvider(provider: ContentProviderInterface): void {
    if (!this.providers.find(p => p.providerId === provider.providerId)) {
      this.providers.push(provider);
    }
  }

  static replaceProvider(provider: ContentProviderInterface): void {
    const index = this.providers.findIndex(p => p.providerId === provider.providerId);
    if (index >= 0) {
      this.providers[index] = provider;
    } else {
      this.providers.push(provider);
    }
  }

  static async populate(
    plan: PlanInterface,
    planItems: PlanItemInterface[]
  ): Promise<PlanItemInterface[]> {
    const allItems = this.flattenItems(planItems);

    const itemsByProvider = new Map<ContentProviderInterface, PlanItemInterface[]>();

    for (const item of allItems) {
      for (const provider of this.providers) {
        if (provider.canHandle(plan, item)) {
          const existing = itemsByProvider.get(provider) || [];
          existing.push(item);
          itemsByProvider.set(provider, existing);
          break;
        }
      }
    }

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

    this.attachContent(planItems, contentMap);
    this.attachContent(planItems, contentMap);

    return planItems;
  }

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

  private static attachContent(
    items: PlanItemInterface[],
    contentMap: Map<string, PlanItemContentInterface>
  ): void {
    for (const item of items) {
      const content = contentMap.get(item.id!);
      if (content) {
        item.content = content;
      }
      if (item.children?.length) {
        this.attachContent(item.children, contentMap);
      }
    }
  }

  static getLessonsProvider(): LessonsContentProvider {
    return this.providers.find(p => p.providerId === "lessons") as LessonsContentProvider;
  }

  /** Format seconds as MM:SS string. */
  static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  }

  /** Calculate total duration of a section's children. */
  static getSectionDuration(section: PlanItemInterface): number {
    let totalSeconds = 0;
    section.children?.forEach((child) => {
      totalSeconds += child.seconds || 0;
    });
    return totalSeconds;
  }
}
