import { IProvider, ProviderInfo } from "../interfaces";
import { registerProvider, getProvider, getAllProviders } from "./registry";
import { APlayProvider } from "./aPlay";
import { B1ChurchProvider } from "./b1Church";
import { DropboxProvider } from "./dropbox";
import { GoCurriculumProvider } from "./goCurriculum";
import { GoogleDriveProvider } from "./googledrive";
import { OneDriveProvider } from "./onedrive";
import { BibleProjectProvider } from "./bibleProject";
import { HighVoltageKidsProvider } from "./highVoltage";
import { LessonsChurchProvider } from "./lessonsChurch";
import { LifeChurchProvider } from "./lifeChurch";
import { PlanningCenterProvider } from "./planningCenter";
import { JesusFilmProvider } from "./jesusFilm";
import { FreeShowProvider } from "./freeShow";
import { createBundledProviders, getComingSoonEntries } from "../manifest/loader";

export { getProvider, getAllProviders, registerProvider } from "./registry";

function initializeProviders() {
  const providers: IProvider[] = [
    new APlayProvider(),
    new B1ChurchProvider(),
    new DropboxProvider(),
    new GoCurriculumProvider(),
    new GoogleDriveProvider(),
    new OneDriveProvider(),
    new BibleProjectProvider(),
    new HighVoltageKidsProvider(),
    new JesusFilmProvider(),
    new LessonsChurchProvider(),
    new LifeChurchProvider(),
    new PlanningCenterProvider(),
    new FreeShowProvider(),
    // Providers defined by JSON manifests (src/manifests); hosts can add more at runtime with loadProviderIndex.
    ...createBundledProviders()
  ];
  for (const provider of providers) registerProvider(provider);
}

initializeProviders();

/**
 * Get provider configuration by ID (for backward compatibility).
 */
export function getProviderConfig(providerId: string) {
  const provider = getProvider(providerId);
  return provider?.config || null;
}

/** Get available providers (implemented and coming soon), optionally filtered by IDs. */
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
  const comingSoon: ProviderInfo[] = getComingSoonEntries().map((p) => ({
    id: p.id,
    name: p.name || p.id,
    logos: p.logos || { light: "", dark: "" },
    implemented: false,
    requiresAuth: false,
    authTypes: [],
    capabilities: { browse: false, playlist: false, instructions: false, mediaLicensing: false }
  }));

  const all = [...implemented, ...comingSoon];

  // Filter by IDs if provided
  if (ids && ids.length > 0) {
    const idSet = new Set(ids);
    return all.filter((provider) => idSet.has(provider.id));
  }

  return all;
}
