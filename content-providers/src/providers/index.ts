import { IProvider, ProviderInfo, ProviderLogos } from "../interfaces";
import { registerProvider, getProvider, getAllProviders } from "./registry";
import { APlayProvider } from "./aPlay";
import { B1ChurchProvider } from "./b1Church";
import { DropboxProvider } from "./dropbox";
import { GoCurriculumProvider } from "./goCurriculum";
import { BibleProjectProvider } from "./bibleProject";
import { HighVoltageKidsProvider } from "./highVoltage";
import { LessonsChurchProvider } from "./lessonsChurch";
import { LifeChurchProvider } from "./lifeChurch";
import { PlanningCenterProvider } from "./planningCenter";
import { SignPresenterProvider } from "./signPresenter";
import { JesusFilmProvider } from "./jesusFilm";
import { CbnProvider } from "./cbn";

export { getProvider, getAllProviders, registerProvider } from "./registry";

export { APlayProvider } from "./aPlay";
export { B1ChurchProvider } from "./b1Church";
export { DropboxProvider } from "./dropbox";
export { GoCurriculumProvider } from "./goCurriculum";
export { BibleProjectProvider } from "./bibleProject";
export { HighVoltageKidsProvider } from "./highVoltage";
export { JesusFilmProvider } from "./jesusFilm";
export { LessonsChurchProvider } from "./lessonsChurch";
export { LifeChurchProvider } from "./lifeChurch";
export { PlanningCenterProvider } from "./planningCenter";
export { SignPresenterProvider } from "./signPresenter";
export { CbnProvider } from "./cbn";

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
    id: "iteachchurch",
    name: "iTeachChurch",
    logos: {
      light: "https://iteachchurch.com/wp-content/uploads/2022/05/iTeachChurch_Artboard-1-copy-3@2x.png",
      dark: "https://iteachchurch.com/wp-content/uploads/2022/05/iTeachChurch_Artboard-1-copy-3@2x.png"
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

function initializeProviders() {
  const providers: IProvider[] = [
    new APlayProvider(),
    new B1ChurchProvider(),
    new DropboxProvider(),
    new GoCurriculumProvider(),
    new BibleProjectProvider(),
    new HighVoltageKidsProvider(),
    new JesusFilmProvider(),
    new LessonsChurchProvider(),
    new LifeChurchProvider(),
    new PlanningCenterProvider(),
    new SignPresenterProvider(),
    new CbnProvider()
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
  const comingSoon: ProviderInfo[] = unimplementedProviders.map((p) => ({
    id: p.id,
    name: p.name,
    logos: p.logos,
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
