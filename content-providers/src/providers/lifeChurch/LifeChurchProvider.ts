import { ContentProviderConfig, ContentProviderAuthData, ContentItem, ContentFile, ProviderLogos, ProviderCapabilities, AuthType, Instructions, CurrentPlan } from "../../interfaces";
import { parsePath } from "../../pathUtils";
import { filesToInstructions } from "../../utils";
import { BaseProvider } from "../BaseProvider";
import lifeChurchData from "./data.json";
import { LifeChurchData, LifeChurchSeries, LifeChurchUnit, LifeChurchLesson, LifeChurchScheduledLesson } from "./LifeChurchInterfaces";

/** Browses Life.Church's kids curriculum from a static catalog (series → units → lessons), plus a weekly scheduled lesson index. */
export class LifeChurchProvider extends BaseProvider {
  readonly id = "lifechurch";
  readonly name = "Life.Church";

  readonly logos: ProviderLogos = {
    light: "https://cdn.brandfetch.io/idRrA6pM45/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1668042253613",
    dark: "https://cdn.brandfetch.io/idRrA6pM45/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1668042253613"
  };

  readonly config: ContentProviderConfig = {
    id: "lifechurch",
    name: "Life.Church",
    apiBase: "https://www.life.church",
    oauthBase: "",
    clientId: "",
    scopes: []
  };

  readonly requiresAuth = false;
  readonly authTypes: AuthType[] = ["none"];
  readonly capabilities: ProviderCapabilities = {
    browse: true,
    playlist: true,
    instructions: true,
    mediaLicensing: false
  };

  private data: LifeChurchData = lifeChurchData as LifeChurchData;

  private findSeries(seriesId: string): LifeChurchSeries | undefined {
    return this.data.series.find(s => s.id === seriesId);
  }

  private findScheduled(scheduledId: string): LifeChurchScheduledLesson | undefined {
    return this.data.scheduledLessons?.find(s => s.id === scheduledId);
  }

  /** Resolve a scheduled-lesson reference to the underlying lesson + unit + series. */
  private resolveScheduled(sched: LifeChurchScheduledLesson): { series: LifeChurchSeries; unit: LifeChurchUnit; lesson: LifeChurchLesson } | null {
    const series = this.findSeries(sched.seriesId);
    const unit = series?.units.find(u => u.id === sched.unitId);
    const lesson = unit?.lessons.find(l => l.id === sched.lessonId);
    if (!series || !unit || !lesson) return null;
    return { series, unit, lesson };
  }

  private lessonToFile(lesson: LifeChurchLesson, overrideTitle?: string): ContentFile {
    return {
      type: "file",
      id: lesson.id,
      title: overrideTitle ?? lesson.title,
      mediaType: "video",
      url: lesson.videoUrl,
      thumbnail: lesson.thumbnail,
      providerData: { sourceUrl: lesson.sourceUrl }
    };
  }

  /** Resolve a leaf-or-unit path to its files plus the name/section used for instructions. */
  private resolve(path: string | null | undefined): { files: ContentFile[]; name: string; section: { id: string; label: string } } | null {
    const { segments, depth } = parsePath(path);

    if (segments[0] === "scheduled") {
      if (depth !== 2) return null;
      const sched = this.findScheduled(segments[1]);
      const resolved = sched && this.resolveScheduled(sched);
      if (!sched || !resolved) return null;
      const label = `${sched.ageGroup} — ${resolved.lesson.title}`;
      return {
        files: [this.lessonToFile(resolved.lesson, label)],
        name: label,
        section: { id: `scheduled-${sched.id}-section`, label: "This Sunday" }
      };
    }

    const series = this.findSeries(segments[0]);
    const unit = series?.units.find(u => u.id === segments[1]);
    if (!unit) return null;

    if (depth === 2) {
      return { files: unit.lessons.map(l => this.lessonToFile(l)), name: unit.name, section: { id: `${unit.id}-section`, label: unit.name } };
    }

    if (depth === 3) {
      const lesson = unit.lessons.find(l => l.id === segments[2]);
      if (!lesson) return null;
      return { files: [this.lessonToFile(lesson)], name: lesson.title, section: { id: `${unit.id}-section`, label: unit.name } };
    }

    return null;
  }

  async browse(path?: string | null, _auth?: ContentProviderAuthData | null): Promise<ContentItem[]> {
    const { segments, depth } = parsePath(path);

    if (depth === 0) {
      const items: ContentItem[] = [];
      if (this.data.scheduledLessons && this.data.scheduledLessons.length > 0) {
        items.push({ type: "folder", id: "scheduled", title: "This Sunday", path: "/scheduled" });
      }
      for (const s of this.data.series) {
        items.push({ type: "folder", id: s.id, title: s.name, thumbnail: s.thumbnail, path: `/${s.id}` });
      }
      return items;
    }

    if (segments[0] === "scheduled") {
      if (depth === 1) {
        return (this.data.scheduledLessons ?? []).map(s => {
          const resolved = this.resolveScheduled(s);
          return {
            type: "folder" as const,
            id: s.id,
            title: `${s.ageGroup} — ${resolved?.lesson.title ?? s.sourceTitle}`,
            thumbnail: resolved?.lesson.thumbnail ?? resolved?.unit.thumbnail,
            isLeaf: true,
            path: `/scheduled/${s.id}`
          };
        });
      }
      return this.resolve(path)?.files ?? [];
    }

    if (depth === 1) {
      const series = this.findSeries(segments[0]);
      if (!series) return [];
      return series.units.map(u => ({
        type: "folder" as const,
        id: u.id,
        title: u.name,
        thumbnail: u.thumbnail ?? series.thumbnail,
        path: `/${series.id}/${u.id}`
      }));
    }

    if (depth === 2) {
      const series = this.findSeries(segments[0]);
      const unit = series?.units.find(u => u.id === segments[1]);
      if (!unit) return [];
      return unit.lessons.map(l => ({
        type: "folder" as const,
        id: l.id,
        title: l.title,
        thumbnail: l.thumbnail,
        isLeaf: true,
        path: `/${series!.id}/${unit.id}/${l.id}`
      }));
    }

    if (depth === 3) {
      return this.resolve(path)?.files ?? [];
    }

    return [];
  }

  async getPlaylist(path: string, _auth?: ContentProviderAuthData | null, _resolution?: number): Promise<ContentFile[] | null> {
    const resolved = this.resolve(path);
    return resolved && resolved.files.length > 0 ? resolved.files : null;
  }

  async getInstructions(path: string, _auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const resolved = this.resolve(path);
    if (!resolved) return null;
    return filesToInstructions(resolved.name, resolved.files, resolved.section);
  }

  /**
   * Returns the most recent scheduled lesson from data.scheduledLessons.
   */
  async getCurrentPlan(_auth?: ContentProviderAuthData | null): Promise<CurrentPlan | null> {
    const all = this.data.scheduledLessons ?? [];
    if (all.length === 0) return null;

    const sched = [...all].sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0];
    const resolved = this.resolveScheduled(sched);
    if (!resolved) return null;

    const { lesson } = resolved;
    return {
      id: sched.id,
      title: `${sched.ageGroup} — ${lesson.title}`,
      serviceDate: sched.weekOf,
      thumbnail: lesson.thumbnail ?? resolved.unit.thumbnail ?? resolved.series.thumbnail,
      files: [
        {
          id: lesson.id,
          name: lesson.title,
          url: lesson.videoUrl,
          image: lesson.thumbnail,
          seconds: 0
        }
      ]
    };
  }
}
