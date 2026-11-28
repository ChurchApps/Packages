import type { ManifestProvider } from "../../manifest/ManifestProvider";
import type { ContentProviderAuthData } from "../../interfaces";
import type { GoCurriculumData } from "./GoCurriculumInterfaces";

export * from "./GoCurriculumInterfaces";

/** A device host's way to load a catalog (e.g. through its server), instead of the private feed URLs. */
export type GoCurriculumCatalogLoader = (groupId: string, auth: ContentProviderAuthData) => Promise<GoCurriculumData | null>;

/** getProvider("gocurriculum"): a JSON-manifest provider with these methods from its manifest. */
export type GoCurriculumProvider = ManifestProvider & {
  setCatalogLoader(loader: GoCurriculumCatalogLoader | null): void;
  /** The catalog a server host returns to a device's catalog loader, already filtered to the user's tiers. */
  getCatalog(groupId: string, auth?: ContentProviderAuthData | null): Promise<GoCurriculumData | null>;
};
