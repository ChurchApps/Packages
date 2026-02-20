import { ProviderInfo, ProviderLogos, IProvider } from "../interfaces";
import { APlayProvider } from "./aPlay";
import { B1ChurchProvider } from "./b1Church";
import { DropboxProvider } from "./dropbox";
import { BibleProjectProvider } from "./bibleProject";
import { HighVoltageKidsProvider } from "./highVoltage";
import { LessonsChurchProvider } from "./lessonsChurch";
import { PlanningCenterProvider } from "./planningCenter";
import { SignPresenterProvider } from "./signPresenter";
import { JesusFilmProvider } from "./jesusFilm";

export { APlayProvider } from "./aPlay";
export { B1ChurchProvider } from "./b1Church";
export { DropboxProvider } from "./dropbox";
export { BibleProjectProvider } from "./bibleProject";
export { HighVoltageKidsProvider } from "./highVoltage";
export { JesusFilmProvider } from "./jesusFilm";
export { LessonsChurchProvider } from "./lessonsChurch";
export { PlanningCenterProvider } from "./planningCenter";
export { SignPresenterProvider } from "./signPresenter";

// Provider registry - singleton instances
const providerRegistry: Map<string, IProvider> = new Map();

// Unimplemented providers (coming soon)
interface UnimplementedProvider {
  id: string;
  name: string;
  logos: ProviderLogos;
}

const unimplementedProviders: UnimplementedProvider[] = [
  {
    id: "awana",
    name: "Awana",
    logos: {
      light: "https://www.awana.org/wp-content/uploads/2025/04/awana-logo-black.svg",
      dark: "https://www.awana.org/wp-content/uploads/2025/04/awana-logo-white.svg"
    }
  },
  {
    id: "freeshow",
    name: "FreeShow",
    logos: {
      light: "https://freeshow.app/images/favicon.png",
      dark: "https://freeshow.app/images/favicon.png"
    }
  },
  {
    id: "gocurriculum",
    name: "Go Curriculum",
    logos: {
      light: "https://gocurriculum.com/wp-content/uploads/go-logo-curriculum-v2.png",
      dark: "https://gocurriculum.com/wp-content/uploads/go-logo-curriculum-v2.png"
    }
  },
  {
    id: "iteachchurch",
    name: "iTeachChurch",
    logos: {
      light: "https://iteachchurch.com/wp-content/uploads/2022/05/iTeachChurch_Artboard-1-copy-3@2x.png",
      dark: "https://iteachchurch.com/wp-content/uploads/2022/05/iTeachChurch_Artboard-1-copy-3@2x.png"
    }
  },
  {
    id: "lifechurch",
    name: "LifeChurch",
    logos: {
      light: "https://cdn.brandfetch.io/idRrA6pM45/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1668042253613",
      dark: "https://cdn.brandfetch.io/idRrA6pM45/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1668042253613"
    }
  },
  {
    id: "ministrystuff",
    name: "MinistryStuff",
    logos: {
      light: "",
      dark: ""
    }
  }
];

// Register built-in providers
function initializeProviders() {
  const aplay = new APlayProvider();
  const b1Church = new B1ChurchProvider();
  const dropbox = new DropboxProvider();
  const bibleProject = new BibleProjectProvider();
  const highVoltageKids = new HighVoltageKidsProvider();
  const lessonsChurch = new LessonsChurchProvider();
  const planningCenter = new PlanningCenterProvider();
  const signPresenter = new SignPresenterProvider();
  const jesusFilm = new JesusFilmProvider();

  providerRegistry.set(aplay.id, aplay);
  providerRegistry.set(b1Church.id, b1Church);
  providerRegistry.set(dropbox.id, dropbox);
  providerRegistry.set(bibleProject.id, bibleProject);
  providerRegistry.set(highVoltageKids.id, highVoltageKids);
  providerRegistry.set(jesusFilm.id, jesusFilm);
  providerRegistry.set(lessonsChurch.id, lessonsChurch);
  providerRegistry.set(planningCenter.id, planningCenter);
  providerRegistry.set(signPresenter.id, signPresenter);
}

// Initialize on module load
initializeProviders();

/**
 * Get a provider by ID.
 */
export function getProvider(providerId: string): IProvider | null {
  return providerRegistry.get(providerId) || null;
}

/**
 * Get all registered providers.
 */
export function getAllProviders(): IProvider[] {
  return Array.from(providerRegistry.values());
}

/**
 * Register a custom provider.
 */
export function registerProvider(provider: IProvider): void {
  providerRegistry.set(provider.id, provider);
}

/**
 * Get provider configuration by ID (for backward compatibility).
 */
export function getProviderConfig(providerId: string) {
  const provider = getProvider(providerId);
  return provider?.config || null;
}

/**
 * Get list of available providers with their info including logos and auth types.
 * Includes both implemented providers and coming soon providers.
 * @param ids - Optional array of provider IDs to filter the results. If provided, only providers with matching IDs will be returned.
 */
export function getAvailableProviders(ids?: string[]): ProviderInfo[] {
  // Implemented providers
  const implemented: ProviderInfo[] = getAllProviders().map((provider) => ({
    id: provider.id,
    name: provider.name,
    logos: provider.logos,
    implemented: true,
    requiresAuth: provider.requiresAuth,
    authTypes: provider.authTypes,
    capabilities: provider.capabilities
  }));

  // Coming soon providers
  const comingSoon: ProviderInfo[] = unimplementedProviders.map((p) => ({
    id: p.id,
    name: p.name,
    logos: p.logos,
    implemented: false,
    requiresAuth: false,
    authTypes: [],
    capabilities: { browse: false, presentations: false, playlist: false, instructions: false, mediaLicensing: false }
  }));

  const all = [...implemented, ...comingSoon];

  // Filter by IDs if provided
  if (ids && ids.length > 0) {
    const idSet = new Set(ids);
    return all.filter((provider) => idSet.has(provider.id));
  }

  return all;
}
