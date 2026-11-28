import { IProvider } from "../interfaces";
import { B1ChurchProvider } from "./b1Church";
import { FreeShowProvider } from "./freeShow";
import { GoCurriculumProvider } from "./goCurriculum";

/**
 * Built-in implementations a manifest can name with "implementation", for providers whose logic JSON can't express.
 * Each one reads its identity, auth settings and capabilities from the manifest it's given.
 */
export const IMPLEMENTATIONS: Record<string, (manifest: unknown) => IProvider> = {
  b1church: m => new B1ChurchProvider(m),
  freeshow: m => new FreeShowProvider(m),
  gocurriculum: m => new GoCurriculumProvider(m)
};
