import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, Plan, PlanPresentation, Instructions, ProviderCapabilities, DeviceAuthorizationResponse, DeviceFlowPollResult, AuthType, InstructionItem, CurrentPlan } from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { navigateToPath } from "../../instructionPathUtils";
import { DeviceFlowHelper } from "../../helpers";
import { generateCodeVerifier } from "../../helpers/OAuthHelper";
import { BaseProvider } from "../BaseProvider";
import { instructionsToPlaylist } from "../../utils";
import { B1Plan, B1PlanItem } from "./B1ChurchTypes";
import * as B1ChurchAuth from "./B1ChurchAuth";
import { fetchMinistries, fetchPlanTypes, fetchPlans, fetchVenueFeed, fetchVenueActions, fetchVenueImages, fetchFromProviderProxy, fetchCurrentPlanByType, fetchPlanItems, API_BASE } from "./B1ChurchApi";
import { ministryToFolder, planTypeToFolder, planToFolder, planItemToInstruction, getFilesFromVenueFeed, getFileFromProviderFileItem, buildSectionActionsMap } from "./B1ChurchConverters";
import { getOrderedFiles } from "./planCustomization";

function findFirstThumbnail(items: InstructionItem[] | undefined): string | undefined {
  if (!items) return undefined;
  for (const item of items) {
    if (item.thumbnail) return item.thumbnail;
    const child = findFirstThumbnail(item.children);
    if (child) return child;
  }
  return undefined;
}

function isLessonsChurchContent(plan: B1Plan): boolean {
  return !plan.providerId || plan.providerId === "lessonschurch";
}

function isExternalProviderItem(item: B1PlanItem): boolean {
  // An item is external if it has a non-b1church providerId and a providerPath
  if (!item.providerId || item.providerId === "b1church") return false;
  // If providerPath is set, it needs proxy expansion regardless of itemType
  if (item.providerPath) return true;
  // Otherwise check for provider-prefixed itemType (legacy support)
  const itemType = item.itemType || "";
  return itemType.startsWith("provider");
}

export class B1ChurchProvider extends BaseProvider {
  private readonly deviceFlowHelper = new DeviceFlowHelper();

  // Unified cache for external provider data to avoid duplicate calls across methods
  private readonly externalContentCache = {
    plans: new Map<string, Plan | null>(),
    instructions: new Map<string, Instructions | null>(),
    playlists: new Map<string, ContentFile[] | null>()
  };

  readonly id = "b1church";
  readonly name = "B1.Church";

  readonly logos: ProviderLogos = { light: "https://b1.church/b1-church-logo.png", dark: "https://b1.church/b1-church-logo.png" };

  readonly config: ContentProviderConfig = { id: "b1church", name: "B1.Church", apiBase: `${API_BASE}/doing`, oauthBase: `${API_BASE}/membership/oauth`, clientId: "nsowldn58dk", scopes: ["plans"], supportsDeviceFlow: true, deviceAuthEndpoint: "/device/authorize" };

  private appBase = "https://admin.b1.church";

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["oauth_pkce", "device_flow"];
  readonly capabilities: ProviderCapabilities = { browse: true, playlist: true, instructions: true, mediaLicensing: false };

  generateCodeVerifier(): string {
    return generateCodeVerifier();
  }

  async buildAuthUrl(codeVerifier: string, redirectUri: string, state?: string): Promise<{ url: string; challengeMethod: string }> {
    return B1ChurchAuth.buildB1AuthUrl(this.config, this.appBase, redirectUri, codeVerifier, state);
  }

  buildAuthUrlFromChallenge(codeChallenge: string, redirectUri: string, state: string): string {
    return B1ChurchAuth.buildB1AuthUrlFromChallenge(this.config, this.appBase, redirectUri, codeChallenge, state);
  }

  async exchangeCodeForTokens(code: string, codeVerifier: string, redirectUri: string): Promise<ContentProviderAuthData | null> {
    return B1ChurchAuth.exchangeCodeForTokensWithPKCE(this.config, code, redirectUri, codeVerifier);
  }

  async exchangeCodeForTokensWithSecret(code: string, redirectUri: string, clientSecret: string): Promise<ContentProviderAuthData | null> {
    return B1ChurchAuth.exchangeCodeForTokensWithSecret(this.config, code, redirectUri, clientSecret);
  }

  async refreshTokenWithSecret(authData: ContentProviderAuthData, clientSecret: string): Promise<ContentProviderAuthData | null> {
    return B1ChurchAuth.refreshTokenWithSecret(this.config, authData, clientSecret);
  }

  async initiateDeviceFlow(): Promise<DeviceAuthorizationResponse | null> {
    return this.deviceFlowHelper.initiateDeviceFlow(this.config);
  }

  async pollDeviceFlowToken(deviceCode: string): Promise<DeviceFlowPollResult> {
    return this.deviceFlowHelper.pollDeviceFlowToken(this.config, deviceCode);
  }

  async browse(path?: string | null, authData?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);

    if (depth === 0) {
      return [
        {
          type: "folder" as const,
          id: "ministries-root",
          title: "Ministries",
          path: "/ministries"
        }
      ];
    }

    const root = segments[0];
    if (root !== "ministries") return [];

    // /ministries -> list all ministries
    if (depth === 1) {
      const ministries = await fetchMinistries(authData);
      return ministries.map(m => {
        const folder = ministryToFolder(m);
        return { ...folder, path: `/ministries/${m.id}` };
      });
    }

    // /ministries/{ministryId} -> list plan types
    if (depth === 2) {
      const ministryId = segments[1];
      const planTypes = await fetchPlanTypes(ministryId, authData);
      return planTypes.map(pt => {
        const folder = planTypeToFolder(pt);
        return { ...folder, path: `/ministries/${ministryId}/${pt.id}` };
      });
    }

    // /ministries/{ministryId}/{planTypeId} -> list plans (today and upcoming)
    if (depth === 3) {
      const ministryId = segments[1];
      const planTypeId = segments[2];
      const allPlans = await fetchPlans(planTypeId, authData);

      // Filter to plans with serviceDate >= start of yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const plans = allPlans.filter(p => new Date(p.serviceDate).getTime() >= yesterday.getTime());

      // Sort ascending so the nearest upcoming plan appears first
      plans.sort((a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime());

      const imageMap = await this.fetchPlanImages(plans, ministryId, authData);

      return plans.map(p => {
        const folder = planToFolder(p, imageMap.get(p.id));
        return {
          ...folder,
          isLeaf: true,
          path: `/ministries/${ministryId}/${planTypeId}/${p.id}`
        };
      });
    }

    return [];
  }

  private async fetchPlanImages(plans: B1Plan[], ministryId: string, authData?: ContentProviderAuthData | null): Promise<Map<string, string>> {
    const imageMap = new Map<string, string>();

    // Lessons.church plans: one batch call for all venue IDs
    const lessonsChurchPlans = plans.filter(p => p.contentId && (!p.providerId || p.providerId === "lessonschurch"));
    const venueIds = lessonsChurchPlans.map(p => p.contentId!);
    if (venueIds.length > 0) {
      const lcImages = await fetchVenueImages(venueIds);
      lcImages.forEach((img, venueId) => {
        const plan = lessonsChurchPlans.find(p => p.contentId === venueId);
        if (plan) imageMap.set(plan.id, img);
      });
    }

    // Other providers: browse parent path to get folder thumbnails
    const externalPlans = plans.filter(p => p.providerId && p.providerId !== "lessonschurch" && p.providerId !== "b1church" && p.providerPlanId);
    if (externalPlans.length > 0) {
      // Group by providerId + parent path to minimize proxy calls
      const groupKey = (p: B1Plan) => `${p.providerId}::${p.providerPlanId!.split("/").slice(0, -1).join("/")}`;
      const groups = new Map<string, B1Plan[]>();
      for (const p of externalPlans) {
        const key = groupKey(p);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(p);
      }

      await Promise.all(Array.from(groups.entries()).map(async ([key, groupPlans]) => {
        const [providerId, parentPath] = [key.split("::")[0], key.split("::").slice(1).join("::")];
        const items = await fetchFromProviderProxy("browse", ministryId, providerId, parentPath, authData);
        if (Array.isArray(items)) {
          for (const plan of groupPlans) {
            const leafId = plan.providerPlanId!.split("/").pop();
            const match = items.find((item: any) => item.id === leafId || item.id === plan.contentId);
            if (match?.thumbnail) imageMap.set(plan.id, match.thumbnail);
          }
        }
      }));
    }

    return imageMap;
  }

  private planTypeId: string | null = null;

  setPairingData(data: unknown) {
    if (data && typeof data === "object" && "planTypeId" in data) {
      const planTypeId = (data as { planTypeId: unknown }).planTypeId;
      this.planTypeId = typeof planTypeId === "string" ? planTypeId : null;
    } else {
      this.planTypeId = null;
    }
  }

  async getCurrentPlan(authData?: ContentProviderAuthData | null): Promise<CurrentPlan | null> {
    if (!this.planTypeId) return null;
    const plan = await fetchCurrentPlanByType(this.planTypeId);
    if (!plan?.providerId || !plan.providerPlanId || !plan.ministryId) return null;

    const items = plan.churchId && plan.id ? await fetchPlanItems(plan.churchId, plan.id) : [];

    // External provider content (Dropbox, etc.) is resolved server-side via the proxy, which
    // holds the church's provider token — the TV client has none, so route through it with our auth.
    const instructions = await fetchFromProviderProxy("getInstructions", plan.ministryId, plan.providerId, plan.providerPlanId, authData);
    if (!instructions) return null;

    const files = getOrderedFiles(instructions, items);
    const thumbnail = findFirstThumbnail(instructions.items);

    return {
      id: plan.id,
      title: plan.name || "",
      serviceDate: plan.serviceDate,
      thumbnail,
      files
    };
  }

  async getInstructions(path: string, authData?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const { segments, depth } = parsePath(path);

    if (depth < 4 || segments[0] !== "ministries") return null;

    const ministryId = segments[1];
    const planId = segments[3];
    const planTypeId = segments[2];

    // Need to fetch plan details to get churchId and contentId
    const plans = await fetchPlans(planTypeId, authData);
    const planFolder = plans.find(p => p.id === planId);
    if (!planFolder) return null;

    const churchId = planFolder.churchId;
    const venueId = isLessonsChurchContent(planFolder) ? planFolder.contentId : undefined;
    const planTitle = planFolder.name || "Plan";

    if (!churchId) {
      console.warn("[B1Church getInstructions] planFolder missing churchId:", planFolder.id);
      return null;
    }

    const planItems = await this.apiRequest<B1PlanItem[]>(`/planFeed/presenter/${churchId}/${planId}`, authData);

    // If no planItems but plan has associated provider content, fetch from that provider
    if ((!planItems || planItems.length === 0) && planFolder.providerId && planFolder.providerPlanId) {
      const externalInstructions = await fetchFromProviderProxy(
        "getInstructions",
        ministryId,
        planFolder.providerId,
        planFolder.providerPlanId,
        authData
      );
      if (externalInstructions) {
        return { name: planTitle, items: externalInstructions.items };
      }
    }

    if (!planItems || !Array.isArray(planItems)) return null;

    // Fetch venue actions and feed to expand section items and get thumbnail
    let sectionActionsMap = new Map<string, import("../../interfaces").InstructionItem[]>();
    let lessonImage: string | undefined;
    if (venueId) {
      const [venueActions, venueFeed] = await Promise.all([
        fetchVenueActions(venueId),
        fetchVenueFeed(venueId)
      ]);
      lessonImage = venueFeed?.lessonImage;
      sectionActionsMap = buildSectionActionsMap(venueActions, lessonImage);
    }

    // Process items, handling external providers
    const processedItems = await this.processInstructionItems(planItems, ministryId, authData, sectionActionsMap, lessonImage);
    return { name: planTitle, items: processedItems };
  }

  private async processInstructionItems(
    items: B1PlanItem[],
    ministryId: string,
    authData?: ContentProviderAuthData | null,
    sectionActionsMap?: Map<string, import("../../interfaces").InstructionItem[]>,
    thumbnail?: string
  ): Promise<import("../../interfaces").InstructionItem[]> {
    const result: import("../../interfaces").InstructionItem[] = [];

    for (const item of items) {
      // Convert the item first
      const instructionItem = planItemToInstruction(item, thumbnail);

      // Check if this is a section that can be expanded from the local sectionActionsMap
      const itemType = item.itemType;
      const isSectionType = itemType === "section" || itemType === "lessonSection" || itemType === "providerSection";
      const canExpandLocally = isSectionType && sectionActionsMap && item.relatedId && sectionActionsMap.has(item.relatedId);

      // Check if children contain sections that can be expanded locally
      const hasLocallyExpandableChildren = item.children && item.children.length > 0 && sectionActionsMap && sectionActionsMap.size > 0 &&
        item.children.some(child => {
          const childType = child.itemType;
          return (childType === "section" || childType === "lessonSection" || childType === "providerSection") &&
                 child.relatedId && sectionActionsMap.has(child.relatedId);
        });

      if (canExpandLocally && item.relatedId) {
        // Expand section items with actions from sectionActionsMap
        const sectionActions = sectionActionsMap!.get(item.relatedId);
        if (sectionActions) {
          instructionItem.children = sectionActions;
        }
      } else if ((itemType === "providerFile" || itemType === "providerPresentation") && item.link) {
        // providerFile/providerPresentation items with a link are already complete - use the link as embedUrl
        // The embedUrl is already set by planItemToInstruction, no children needed
      } else if (hasLocallyExpandableChildren) {
        // Recurse into children that can be expanded locally (don't fetch from external)
        instructionItem.children = await this.processInstructionItems(item.children!, ministryId, authData, sectionActionsMap, thumbnail);
      } else if (isExternalProviderItem(item) && item.providerId && item.providerPath) {
        // Fetch expanded instructions from external provider
        const externalInstructions = await fetchFromProviderProxy(
          "getInstructions",
          ministryId,
          item.providerId,
          item.providerPath,
          authData
        );
        if (externalInstructions) {
          // If providerContentPath is set, find and use only that specific item's children
          if (item.providerContentPath) {
            const matchingItem = this.findItemByPath(externalInstructions, item.providerContentPath);
            if (matchingItem?.children) {
              instructionItem.children = matchingItem.children;
            }
          } else {
            // Use all items from external provider as children
            instructionItem.children = externalInstructions.items;
          }
        }
      } else if (item.children && item.children.length > 0) {
        // Recursively process children for internal items
        instructionItem.children = await this.processInstructionItems(item.children, ministryId, authData, sectionActionsMap, thumbnail);
      }

      result.push(instructionItem);
    }

    return result;
  }

  private findItemByPath(instructions: Instructions | null, path?: string): InstructionItem | null {
    if (!path || !instructions) return null;
    return navigateToPath(instructions, path);
  }

  private findPresentationByPath(plan: Plan, instructions: Instructions | null, path?: string): PlanPresentation | null {
    if (!path || !instructions) return null;
    const item = navigateToPath(instructions, path);
    if (!item?.relatedId && !item?.id) return null;
    const presentationId = item.relatedId || item.id;
    for (const section of plan.sections) {
      for (const presentation of section.presentations) {
        if (presentation.id === presentationId) return presentation;
      }
    }
    return null;
  }

  async getPlaylist(path: string, authData?: ContentProviderAuthData | null, resolution?: number): Promise<ContentFile[] | null> {
    const { segments, depth } = parsePath(path);

    if (depth < 4 || segments[0] !== "ministries") {
      console.warn(`[B1Church] getPlaylist: invalid path depth=${depth} segments=${JSON.stringify(segments)}`);
      return null;
    }

    const ministryId = segments[1];
    const planId = segments[3];
    const planTypeId = segments[2];

    // Need to fetch plan details to get churchId and contentId
    const plans = await fetchPlans(planTypeId, authData);
    const planFolder = plans.find(p => p.id === planId);
    if (!planFolder) {
      console.warn(`[B1Church] getPlaylist: plan ${planId} not found in ${plans.length} plans`);
      return null;
    }

    const churchId = planFolder.churchId;
    const venueId = isLessonsChurchContent(planFolder) ? planFolder.contentId : undefined;

    if (!churchId) {
      console.warn("[B1Church] getPlaylist: planFolder missing churchId:", planFolder.id);
      return null;
    }

    const planItems = await this.apiRequest<B1PlanItem[]>(`/planFeed/presenter/${churchId}/${planId}`, authData);

    // If no planItems but plan has associated provider content, fetch from that provider
    if ((!planItems || planItems.length === 0) && planFolder.providerId && planFolder.providerPlanId) {
      const externalFiles = await fetchFromProviderProxy(
        "getPlaylist",
        ministryId,
        planFolder.providerId,
        planFolder.providerPlanId,
        authData,
        resolution
      );
      return externalFiles || null;
    }

    if (!planItems || !Array.isArray(planItems)) {
      console.warn(`[B1Church] getPlaylist: no planItems and no external provider fallback for plan ${planId}`);
      return null;
    }

    const venueFeed = venueId ? await fetchVenueFeed(venueId) : null;
    const files: ContentFile[] = [];

    for (const sectionItem of planItems) {
      // Provider items can sit at the top level of the service order (no section wrapper)
      for (const child of sectionItem.children?.length ? sectionItem.children : [sectionItem]) {
        const childItemType = child.itemType;

        // Check if this is a section that can be expanded from the local venue feed
        const isSectionType = childItemType === "section" || childItemType === "lessonSection" || childItemType === "providerSection";
        const canExpandLocally = isSectionType && venueFeed && child.relatedId;

        // Prefer local venue feed resolution when possible (matches processInstructionItems behavior)
        if (canExpandLocally) {
          const itemFiles = getFilesFromVenueFeed(venueFeed, childItemType!, child.relatedId);
          files.push(...itemFiles);
        } else if (isExternalProviderItem(child) && child.providerId && child.providerPath) {
          // External provider resolution (cached, uses providerContentPath)
          const cacheKey = `${child.providerId}:${child.providerPath}`;

          if (child.providerContentPath) {
            // Fetch presentations and instructions for path-based lookup (with caching)
            let externalPlan = this.externalContentCache.plans.get(cacheKey);
            if (externalPlan === undefined) {
              externalPlan = await fetchFromProviderProxy(
                "getPresentations",
                ministryId,
                child.providerId,
                child.providerPath,
                authData
              );
              this.externalContentCache.plans.set(cacheKey, externalPlan);
            }

            let externalInstructions = this.externalContentCache.instructions.get(cacheKey);
            if (externalInstructions === undefined) {
              externalInstructions = await fetchFromProviderProxy(
                "getInstructions",
                ministryId,
                child.providerId,
                child.providerPath,
                authData
              );
              this.externalContentCache.instructions.set(cacheKey, externalInstructions);
            }

            if (externalPlan) {
              const matchingPresentation = this.findPresentationByPath(externalPlan, externalInstructions, child.providerContentPath);
              if (matchingPresentation?.files && Array.isArray(matchingPresentation.files)) {
                files.push(...matchingPresentation.files);
              }
            } else if (externalInstructions) {
              // Fallback: extract files from instructions when presentations aren't available
              const matchingItem = this.findItemByPath(externalInstructions, child.providerContentPath);
              if (matchingItem) {
                const miniInstructions: Instructions = { name: matchingItem.label || "", items: [matchingItem] };
                files.push(...instructionsToPlaylist(miniInstructions));
              }
            }
          } else {
            // No specific content path - get all files (with caching)
            let externalFiles = this.externalContentCache.playlists.get(cacheKey);
            if (externalFiles === undefined) {
              externalFiles = await fetchFromProviderProxy(
                "getPlaylist",
                ministryId,
                child.providerId,
                child.providerPath,
                authData,
                resolution
              );
              this.externalContentCache.playlists.set(cacheKey, externalFiles);
            }
            if (Array.isArray(externalFiles)) {
              files.push(...externalFiles);
            }
          }
        } else if ((childItemType === "providerFile" || childItemType === "providerPresentation") && child.link) {
          // Fallback: use stored link when no provider info available
          const file = getFileFromProviderFileItem(child);
          if (file) files.push(file);
        } else if (venueFeed && (childItemType === "lessonAction" || childItemType === "action" ||
               childItemType === "lessonAddOn" || childItemType === "addon")) {
          // Handle action items from venue feed
          const itemFiles = getFilesFromVenueFeed(venueFeed, childItemType, child.relatedId);
          files.push(...itemFiles);
        }
      }
    }

    if (files.length === 0) {
      console.warn(`[B1Church] getPlaylist: no files found for path=${path}`);
      return null;
    }
    return files;
  }
}
