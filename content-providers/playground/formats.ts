import type { IProvider, ContentFile, Instructions, ContentProviderAuthData } from '../src';
import { instructionsToPlaylist } from '../src/utils';

// Local playground shim. The package's FormatResolver was removed because no shipping app used it
// (they call provider.getPlaylist/getInstructions directly). The playground still wants the old
// "try native, else derive from instructions" behaviour, so it lives here instead of in the package.
export interface ResolvedFormatMeta {
  isNative: boolean;
  sourceFormat?: 'playlist' | 'instructions';
  isLossy: boolean;
}

export async function getPlaylistWithMeta(provider: IProvider, path: string, auth?: ContentProviderAuthData | null): Promise<{ data: ContentFile[] | null; meta: ResolvedFormatMeta }> {
  if (provider.capabilities.playlist && provider.getPlaylist) {
    const result = await provider.getPlaylist(path, auth);
    if (result && result.length > 0) return { data: result, meta: { isNative: true, isLossy: false } };
  }
  // Fall back to deriving a playlist from instructions (e.g. providers that only expose playlists
  // at leaf depth, like Jesus Film and High Voltage Kids at the collection level).
  if (provider.capabilities.instructions && provider.getInstructions) {
    const instructions = await provider.getInstructions(path, auth);
    if (instructions) return { data: instructionsToPlaylist(instructions), meta: { isNative: false, sourceFormat: 'instructions', isLossy: false } };
  }
  return { data: null, meta: { isNative: false, isLossy: false } };
}

export async function getInstructionsWithMeta(provider: IProvider, path: string, auth?: ContentProviderAuthData | null): Promise<{ data: Instructions | null; meta: ResolvedFormatMeta }> {
  if (provider.capabilities.instructions && provider.getInstructions) {
    const result = await provider.getInstructions(path, auth);
    if (result) return { data: result, meta: { isNative: true, isLossy: false } };
  }
  return { data: null, meta: { isNative: false, isLossy: false } };
}
