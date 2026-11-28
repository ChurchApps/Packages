import { IProvider } from "../interfaces";
import { APlayProvider } from "./aPlay";
import { B1ChurchProvider } from "./b1Church";
import { BibleProjectProvider } from "./bibleProject";
import { DropboxProvider } from "./dropbox";
import { FreeShowProvider } from "./freeShow";
import { GoCurriculumProvider } from "./goCurriculum";
import { GoogleDriveProvider } from "./googledrive";
import { HighVoltageKidsProvider } from "./highVoltage";
import { JesusFilmProvider } from "./jesusFilm";
import { LessonsChurchProvider } from "./lessonsChurch";
import { LifeChurchProvider } from "./lifeChurch";
import { OneDriveProvider } from "./onedrive";

/**
 * Built-in implementations a manifest can name with "implementation", for providers whose logic JSON can't express.
 * Each one reads its identity, auth settings and capabilities from the manifest it's given.
 */
export const IMPLEMENTATIONS: Record<string, (manifest: unknown) => IProvider> = {
  aplay: m => new APlayProvider(m),
  b1church: m => new B1ChurchProvider(m),
  bibleproject: m => new BibleProjectProvider(m),
  dropbox: m => new DropboxProvider(m),
  freeshow: m => new FreeShowProvider(m),
  gocurriculum: m => new GoCurriculumProvider(m),
  googledrive: m => new GoogleDriveProvider(m),
  highvoltagekids: m => new HighVoltageKidsProvider(m),
  jesusfilm: m => new JesusFilmProvider(m),
  lessonschurch: m => new LessonsChurchProvider(m),
  lifechurch: m => new LifeChurchProvider(m),
  onedrive: m => new OneDriveProvider(m)
};
