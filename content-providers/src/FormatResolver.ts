import type { IProvider, ContentFile, ContentProviderAuthData, Instructions } from "./interfaces";
import * as Converters from "./FormatConverters";
import { parsePath } from "./pathUtils";

export interface FormatResolverOptions {
  allowLossy?: boolean;
}

export interface ResolvedFormatMeta {
  isNative: boolean;
  sourceFormat?: "playlist" | "presentations" | "instructions";
  isLossy: boolean;
}

export class FormatResolver {
  private provider: IProvider;
  private options: Required<FormatResolverOptions>;

  constructor(provider: IProvider, options: FormatResolverOptions = {}) {
    this.provider = provider;
    this.options = { allowLossy: options.allowLossy ?? true };
  }

  getProvider(): IProvider {
    return this.provider;
  }

  /** Extract the last segment from a path to use as fallback ID/title */
  private getIdFromPath(path: string): string {
    const { segments } = parsePath(path);
    return segments[segments.length - 1] || "content";
  }

  async getPlaylist(path: string, auth?: ContentProviderAuthData | null): Promise<ContentFile[] | null> {
    const caps = this.provider.capabilities;

    if (caps.playlist && this.provider.getPlaylist) {
      const result = await this.provider.getPlaylist(path, auth);
      if (result && result.length > 0) return result;
    }

    // if (caps.presentations) {
    //   const plan = await this.provider.getPresentations(path, auth);
    //   if (plan) return Converters.presentationsToPlaylist(plan);
    // }

    if (caps.instructions && this.provider.getInstructions) {
      const expanded = await this.provider.getInstructions(path, auth);
      if (expanded) return Converters.instructionsToPlaylist(expanded);
    }

    return null;
  }

  async getPlaylistWithMeta(path: string, auth?: ContentProviderAuthData | null): Promise<{ data: ContentFile[] | null; meta: ResolvedFormatMeta }> {
    const caps = this.provider.capabilities;

    if (caps.playlist && this.provider.getPlaylist) {
      const result = await this.provider.getPlaylist(path, auth);
      if (result && result.length > 0) {
        return { data: result, meta: { isNative: true, isLossy: false } };
      }
    }

    // if (caps.presentations) {
    //   const plan = await this.provider.getPresentations(path, auth);
    //   if (plan) return { data: Converters.presentationsToPlaylist(plan), meta: { isNative: false, sourceFormat: "presentations", isLossy: false } };
    // }

    if (caps.instructions && this.provider.getInstructions) {
      const expanded = await this.provider.getInstructions(path, auth);
      if (expanded) return { data: Converters.instructionsToPlaylist(expanded), meta: { isNative: false, sourceFormat: "instructions", isLossy: false } };
    }

    return { data: null, meta: { isNative: false, isLossy: false } };
  }

  // async getPresentations(path: string, auth?: ContentProviderAuthData | null): Promise<Plan | null> {
  //   const caps = this.provider.capabilities;
  //   const fallbackId = this.getIdFromPath(path);

  //   if (caps.presentations) {
  //     const result = await this.provider.getPresentations(path, auth);
  //     if (result) return result;
  //   }

  //   if (caps.instructions && this.provider.getInstructions) {
  //     const expanded = await this.provider.getInstructions(path, auth);
  //     if (expanded) return Converters.instructionsToPresentations(expanded, fallbackId);
  //   }

  //   if (this.options.allowLossy && caps.playlist && this.provider.getPlaylist) {
  //     const playlist = await this.provider.getPlaylist(path, auth);
  //     if (playlist && playlist.length > 0) {
  //       return Converters.playlistToPresentations(playlist, fallbackId);
  //     }
  //   }

  //   return null;
  // }

  // async getPresentationsWithMeta(path: string, auth?: ContentProviderAuthData | null): Promise<{ data: Plan | null; meta: ResolvedFormatMeta }> {
  //   const caps = this.provider.capabilities;
  //   const fallbackId = this.getIdFromPath(path);

  //   if (caps.presentations) {
  //     const result = await this.provider.getPresentations(path, auth);
  //     if (result) {
  //       return { data: result, meta: { isNative: true, isLossy: false } };
  //     }
  //   }

  //   if (caps.instructions && this.provider.getInstructions) {
  //     const expanded = await this.provider.getInstructions(path, auth);
  //     if (expanded) return { data: Converters.instructionsToPresentations(expanded, fallbackId), meta: { isNative: false, sourceFormat: "instructions", isLossy: false } };
  //   }

  //   if (this.options.allowLossy && caps.playlist && this.provider.getPlaylist) {
  //     const playlist = await this.provider.getPlaylist(path, auth);
  //     if (playlist && playlist.length > 0) return { data: Converters.playlistToPresentations(playlist, fallbackId), meta: { isNative: false, sourceFormat: "playlist", isLossy: true } };
  //   }

  //   return { data: null, meta: { isNative: false, isLossy: false } };
  // }

  async getInstructions(path: string, auth?: ContentProviderAuthData | null): Promise<Instructions | null> {
    const caps = this.provider.capabilities;
    const fallbackTitle = this.getIdFromPath(path);

    if (caps.instructions && this.provider.getInstructions) {
      const result = await this.provider.getInstructions(path, auth);
      if (result) return result;
    }

    // if (caps.presentations) {
    //   const plan = await this.provider.getPresentations(path, auth);
    //   if (plan) return Converters.presentationsToExpandedInstructions(plan);
    // }

    if (this.options.allowLossy && caps.playlist && this.provider.getPlaylist) {
      const playlist = await this.provider.getPlaylist(path, auth);
      if (playlist && playlist.length > 0) {
        return Converters.playlistToInstructions(playlist, fallbackTitle);
      }
    }

    return null;
  }

  async getInstructionsWithMeta(path: string, auth?: ContentProviderAuthData | null): Promise<{ data: Instructions | null; meta: ResolvedFormatMeta }> {
    const caps = this.provider.capabilities;
    const fallbackTitle = this.getIdFromPath(path);

    if (caps.instructions && this.provider.getInstructions) {
      const result = await this.provider.getInstructions(path, auth);
      if (result) {
        return { data: result, meta: { isNative: true, isLossy: false } };
      }
    }

    // if (caps.presentations) {
    //   const plan = await this.provider.getPresentations(path, auth);
    //   if (plan) return { data: Converters.presentationsToExpandedInstructions(plan), meta: { isNative: false, sourceFormat: "presentations", isLossy: false } };
    // }

    if (this.options.allowLossy && caps.playlist && this.provider.getPlaylist) {
      const playlist = await this.provider.getPlaylist(path, auth);
      if (playlist && playlist.length > 0) return { data: Converters.playlistToInstructions(playlist, fallbackTitle), meta: { isNative: false, sourceFormat: "playlist", isLossy: true } };
    }

    return { data: null, meta: { isNative: false, isLossy: false } };
  }
}
