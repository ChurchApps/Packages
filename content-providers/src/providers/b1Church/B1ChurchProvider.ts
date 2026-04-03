import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, Plan, PlanPresentation, Instructions, ProviderCapabilities, DeviceAuthorizationResponse, DeviceFlowPollResult, IProvider, AuthType, InstructionItem } from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { navigateToPath } from "../../instructionPathUtils";
import { instructionsToPlaylist } from "../../FormatConverters";
import { ApiHelper } from "../../helpers";
import { B1PlanItem } from "./B1ChurchTypes";
import * as B1ChurchAuth from "./B1ChurchAuth";
import { fetchMinistries, fetchPlanTypes, fetchPlans, fetchVenueFeed, fetchVenueActions, fetchFromProviderProxy, API_BASE } from "./B1ChurchApi";
import { ministryToFolder, planTypeToFolder, planToFolder, planItemToInstruction, getFilesFromVenueFeed, getFileFromProviderFileItem, buildSectionActionsMap } from "./B1ChurchConverters";

function isExternalProviderItem(item: B1PlanItem): boolean {
  // An item is external if it has a non-b1church providerId and a providerPath
  if (!item.providerId || item.providerId === "b1church") return false;
  // If providerPath is set, it needs proxy expansion regardless of itemType
  if (item.providerPath) return true;
  // Otherwise check for provider-prefixed itemType (legacy support)
  const itemType = item.itemType || "";
  return itemType.startsWith("provider");
}

export class B1ChurchProvider implements IProvider {
  private readonly apiHelper = new ApiHelper();

  // Unified cache for external provider data to avoid duplicate calls across methods
  private readonly externalContentCache = {
    plans: new Map<string, Plan | null>(),
    instructions: new Map<string, Instructions | null>(),
    playlists: new Map<string, ContentFile[] | null>()
  };

  private async apiRequest<T>(path: string, authData?: ContentProviderAuthData | null): Promise<T | null> {
    return this.apiHelper.apiRequest<T>(this.config, this.id, path, authData);
  }
  readonly id = "b1church";
  readonly name = "B1.Church";

  readonly logos: ProviderLogos = { light: "https://b1.church/b1-church-logo.png", dark: "https://b1.church/b1-church-logo.png" };

  readonly config: ContentProviderConfig = { id: "b1church", name: "B1.Church", apiBase: `${API_BASE}/doing`, oauthBase: `${API_BASE}/membership/oauth`, clientId: "nsowldn58dk", scopes: ["plans"], supportsDeviceFlow: true, deviceAuthEndpoint: "/device/authorize", endpoints: { planItems: (churchId: string, planId: string) => `/planFeed/presenter/${churchId}/${planId}` } };

  private appBase = "https://admin.b1.church";

  readonly requiresAuth = true;
  readonly authTypes: AuthType[] = ["oauth_pkce", "device_flow"];
  readonly capabilities: ProviderCapabilities = { browse: true, presentations: true, playlist: true, instructions: true, mediaLicensing: false };

  async buildAuthUrl(codeVerifier: string, redirectUri: string, state?: string): Promise<{ url: string; challengeMethod: string }> {
    return B1ChurchAuth.buildB1AuthUrl(this.config, this.appBase, redirectUri, codeVerifier, state);
  }

  async exchangeCodeForTokensWithPKCE(code: string, redirectUri: string, codeVerifier: string): Promise<ContentProviderAuthData | null> {
    return B1ChurchAuth.exchangeCodeForTokensWithPKCE(this.config, code, redirectUri, codeVerifier);
  }

  async exchangeCodeForTokensWithSecret(code: string, redirectUri: string, clientSecret: string): Promise<ContentProviderAuthData | null> {
    return B1ChurchAuth.exchangeCodeForTokensWithSecret(this.config, code, redirectUri, clientSecret);
  }

  async refreshTokenWithSecret(authData: ContentProviderAuthData, clientSecret: string): Promise<ContentProviderAuthData | null> {
    return B1ChurchAuth.refreshTokenWithSecret(this.config, authData, clientSecret);
  }

  async initiateDeviceFlow(): Promise<DeviceAuthorizationResponse | null> {
    return B1ChurchAuth.initiateDeviceFlow(this.config);
  }

  async pollDeviceFlowToken(deviceCode: string): Promise<DeviceFlowPollResult> {
    return B1ChurchAuth.pollDeviceFlowToken(this.config, deviceCode);
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

    // /ministries/{ministryId}/{planTypeId} -> list plans
    if (depth === 3) {
      const ministryId = segments[1];
      const planTypeId = segments[2];
      const plans = await fetchPlans(planTypeId, authData);
      plans.sort((a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime());
      return plans.map(p => {
        const folder = planToFolder(p);
        return {
          ...folder,
          isLeaf: true,
          path: `/ministries/${ministryId}/${planTypeId}/${p.id}`
        };
      });
    }

    return [];
  }

  // async getPresentations(path: string, authData?: ContentProviderAuthData | null): Promise<Plan | null> {
  //   const { segments, depth } = parsePath(path);

  //   if (depth < 4 || segments[0] !== "ministries") return null;

  //   const ministryId = segments[1];
  //   const planId = segments[3];
  //   const planTypeId = segments[2];

  //   // Need to fetch plan details to get churchId and contentId
  //   const plans = await fetchPlans(planTypeId, authData);
  //   const planFolder = plans.find(p => p.id === planId);
  //   if (!planFolder) return null;

  //   const churchId = planFolder.churchId;
  //   const venueId = planFolder.contentId;
  //   const planTitle = planFolder.name || "Plan";

  //   if (!churchId) {
  //     console.warn("[B1Church getPresentations] planFolder missing churchId:", planFolder.id);
  //     return null;
  //   }

  //   const pathFn = this.config.endpoints.planItems as (churchId: string, planId: string) => string;
  //   const planItems = await this.apiRequest<B1PlanItem[]>(pathFn(churchId, planId), authData);

  //   // If no planItems but plan has associated provider content, fetch from that provider
  //   if ((!planItems || planItems.length === 0) && planFolder.providerId && planFolder.providerPlanId) {
  //     const externalPlan = await fetchFromProviderProxy(
  //       "getPresentations",
  //       ministryId,
  //       planFolder.providerId,
  //       planFolder.providerPlanId,
  //       authData
  //     );
  //     if (externalPlan) {
  //       return { id: planId, name: planTitle, sections: externalPlan.sections, allFiles: externalPlan.allFiles };
  //     }
  //   }

  //   if (!planItems || !Array.isArray(planItems)) return null;

  //   const venueFeed = venueId ? await fetchVenueFeed(venueId) : null;

  //   const sections: PlanSection[] = [];
  //   const allFiles: ContentFile[] = [];

  //   for (const sectionItem of planItems) {
  //     const presentations: PlanPresentation[] = [];

  //     for (const child of sectionItem.children || []) {
  //       // Try external provider resolution first (cached, uses providerContentPath)
  //       if (isExternalProviderItem(child) && child.providerId && child.providerPath) {
  //         const cacheKey = `${child.providerId}:${child.providerPath}`;

  //         let externalPlan = this.externalContentCache.plans.get(cacheKey);
  //         if (externalPlan === undefined) {
  //           externalPlan = await fetchFromProviderProxy(
  //             "getPresentations",
  //             ministryId,
  //             child.providerId,
  //             child.providerPath,
  //             authData
  //           );
  //           this.externalContentCache.plans.set(cacheKey, externalPlan);
  //         }

  //         if (externalPlan) {
  //           if (child.providerContentPath) {
  //             // Fetch instructions to enable path-based lookup (with caching)
  //             let externalInstructions = this.externalContentCache.instructions.get(cacheKey);
  //             if (externalInstructions === undefined) {
  //               externalInstructions = await fetchFromProviderProxy(
  //                 "getInstructions",
  //                 ministryId,
  //                 child.providerId,
  //                 child.providerPath,
  //                 authData
  //               );
  //               this.externalContentCache.instructions.set(cacheKey, externalInstructions);
  //             }
  //             // Find and use only the specific presentation
  //             const matchingPresentation = this.findPresentationByPath(externalPlan, externalInstructions, child.providerContentPath);
  //             if (matchingPresentation) {
  //               presentations.push(matchingPresentation);
  //               if (Array.isArray(matchingPresentation.files)) {
  //                 allFiles.push(...matchingPresentation.files);
  //               }
  //             }
  //           } else {
  //             // Add all presentations from the external plan
  //             for (const section of externalPlan.sections || []) {
  //               if (Array.isArray(section.presentations)) {
  //                 presentations.push(...section.presentations);
  //               }
  //             }
  //             if (Array.isArray(externalPlan.allFiles)) {
  //               allFiles.push(...externalPlan.allFiles);
  //             }
  //           }
  //         }
  //       } else {
  //         // Handle internal items (venue feed sections, link-based files, etc.)
  //         const presentation = await planItemToPresentation(child, venueFeed);
  //         if (presentation) {
  //           presentations.push(presentation);
  //           allFiles.push(...presentation.files);
  //         }
  //       }
  //     }

  //     if (presentations.length > 0 || sectionItem.label) {
  //       sections.push({ id: sectionItem.id, name: sectionItem.label || "Section", presentations });
  //     }
  //   }

  //   return { id: planId, name: planTitle, sections, allFiles };
  // }

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
    const venueId = planFolder.contentId;
    const planTitle = planFolder.name || "Plan";

    if (!churchId) {
      console.warn("[B1Church getInstructions] planFolder missing churchId:", planFolder.id);
      return null;
    }

    const pathFn = this.config.endpoints.planItems as (churchId: string, planId: string) => string;
    const planItems = await this.apiRequest<B1PlanItem[]>(pathFn(churchId, planId), authData);

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
    console.log(`[B1Church] getPlaylist called with path=${path}`);
    const { segments, depth } = parsePath(path);

    if (depth < 4 || segments[0] !== "ministries") {
      console.warn(`[B1Church] getPlaylist: invalid path depth=${depth} segments=${JSON.stringify(segments)}`);
      return null;
    }

    const ministryId = segments[1];
    const planId = segments[3];
    const planTypeId = segments[2];
    console.log(`[B1Church] getPlaylist: ministryId=${ministryId}, planTypeId=${planTypeId}, planId=${planId}`);

    // Need to fetch plan details to get churchId and contentId
    const plans = await fetchPlans(planTypeId, authData);
    console.log(`[B1Church] getPlaylist: fetchPlans returned ${plans.length} plans`);
    const planFolder = plans.find(p => p.id === planId);
    if (!planFolder) {
      console.warn(`[B1Church] getPlaylist: plan ${planId} not found in ${plans.length} plans (ids: ${plans.map(p => p.id).join(", ")})`);
      return null;
    }

    const churchId = planFolder.churchId;
    const venueId = planFolder.contentId;
    console.log(`[B1Church] getPlaylist: planFolder found — churchId=${churchId}, venueId=${venueId}, providerId=${planFolder.providerId}, providerPlanId=${planFolder.providerPlanId}`);

    if (!churchId) {
      console.warn("[B1Church getPlaylist] planFolder missing churchId:", planFolder.id);
      return null;
    }

    const pathFn = this.config.endpoints.planItems as (churchId: string, planId: string) => string;
    const planItems = await this.apiRequest<B1PlanItem[]>(pathFn(churchId, planId), authData);
    console.log(`[B1Church] getPlaylist: planItems=${planItems ? (Array.isArray(planItems) ? planItems.length + " sections" : typeof planItems) : "null"}`);

    // If no planItems but plan has associated provider content, fetch from that provider
    if ((!planItems || planItems.length === 0) && planFolder.providerId && planFolder.providerPlanId) {
      console.log(`[B1Church] getPlaylist: no planItems, trying external provider ${planFolder.providerId} with path ${planFolder.providerPlanId}`);
      const externalFiles = await fetchFromProviderProxy(
        "getPlaylist",
        ministryId,
        planFolder.providerId,
        planFolder.providerPlanId,
        authData,
        resolution
      );
      console.log(`[B1Church] getPlaylist: external provider returned ${externalFiles ? (Array.isArray(externalFiles) ? externalFiles.length + " files" : typeof externalFiles) : "null"}`);
      return externalFiles || null;
    }

    if (!planItems || !Array.isArray(planItems)) {
      console.warn(`[B1Church] getPlaylist: planItems is null/not-array and no external provider fallback. providerId=${planFolder.providerId}, providerPlanId=${planFolder.providerPlanId}`);
      return null;
    }

    console.log(`[B1Church] getPlaylist: processing ${planItems.length} sections, venueId=${venueId || "none"}`);
    const venueFeed = venueId ? await fetchVenueFeed(venueId) : null;
    if (venueId && !venueFeed) {
      console.warn(`[B1Church] getPlaylist: venueFeed is null for venueId=${venueId}`);
    }
    const files: ContentFile[] = [];

    for (const sectionItem of planItems) {
      console.log(`[B1Church] getPlaylist: section "${sectionItem.label || sectionItem.id}" has ${sectionItem.children?.length || 0} children`);
      for (const child of sectionItem.children || []) {
        const childItemType = child.itemType;
        console.log(`[B1Church] getPlaylist:   child itemType=${childItemType}, relatedId=${child.relatedId}, providerId=${child.providerId}, providerPath=${child.providerPath}, link=${child.link ? "yes" : "no"}`);

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

    console.log(`[B1Church] getPlaylist: total files collected = ${files.length}`);
    if (files.length === 0) {
      console.warn(`[B1Church] getPlaylist: returning null — no files found for path=${path}`);
    }
    return files.length > 0 ? files : null;
  }

  supportsDeviceFlow(): boolean {
    return !!this.config.supportsDeviceFlow;
  }
}
