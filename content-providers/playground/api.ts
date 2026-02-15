import { state } from './state';
import { showLoading, showStatus } from './ui';
import { FormatResolver, ContentItem, ContentFile, Plan, Instructions, ContentFolder } from '../src';
import type { ResolvedFormatMeta } from '../src';

/**
 * Result type for viewAsPlaylist function
 */
export interface PlaylistResult {
  playlist: ContentFile[];
  meta: ResolvedFormatMeta;
}

// /**
//  * Result type for viewAsPresentations function
//  */
// export interface PresentationsResult {
//   plan: Plan;
//   meta: ResolvedFormatMeta;
// }

/**
 * Result type for viewAsInstructions function
 */
export interface InstructionsResult {
  instructions: Instructions;
  meta: ResolvedFormatMeta;
}

/**
 * Load content from the current provider at the current path.
 * @returns Array of content items, or empty array on error
 */
export async function loadContent(): Promise<ContentItem[]> {
  if (!state.currentProvider) return [];

  showLoading(true);

  try {
    const items = await state.currentProvider.browse(state.currentPath || null, state.currentAuth);
    showLoading(false);
    return items;
  } catch (error) {
    showLoading(false);
    showStatus(`Failed to load content: ${error}`, 'error');
    return [];
  }
}

/**
 * Get playlist data for a folder using FormatResolver.
 * Updates state with current path and breadcrumb information.
 * @param folder - The folder to get playlist data for
 * @returns Playlist data with metadata, or null on error
 */
export async function viewAsPlaylist(folder: ContentFolder): Promise<PlaylistResult | null> {
  if (!state.currentProvider) return null;

  showLoading(true);

  try {
    const resolver = new FormatResolver(state.currentProvider);
    const { data: playlist, meta } = await resolver.getPlaylistWithMeta(folder.path, state.currentAuth);

    if (!playlist || playlist.length === 0) {
      // Update state even for empty playlist (caller may want to fallback to browse)
      state.currentVenueFolder = folder;
      state.currentPath = folder.path;
      state.breadcrumbTitles.push(folder.title);
      showLoading(false);
      return null;
    }

    // Update state
    state.currentVenueFolder = folder;
    state.currentPath = folder.path;
    state.breadcrumbTitles.push(folder.title);

    showLoading(false);
    return { playlist, meta };

  } catch (error) {
    showLoading(false);
    showStatus(`Failed to load playlist: ${error}`, 'error');
    return null;
  }
}

// /**
//  * Get presentations/plan data for a folder using FormatResolver.
//  * Updates state with current path, breadcrumb, and plan information.
//  * @param folder - The folder to get presentations data for
//  * @returns Plan data with metadata, or null on error
//  */
// export async function viewAsPresentations(folder: ContentFolder): Promise<PresentationsResult | null> {
//   if (!state.currentProvider) return null;

//   showLoading(true);

//   try {
//     const resolver = new FormatResolver(state.currentProvider);
//     const { data: plan, meta } = await resolver.getPresentationsWithMeta(folder.path, state.currentAuth);

//     if (!plan) {
//       showStatus('This provider does not support presentations view', 'error');
//       showLoading(false);
//       return null;
//     }

//     // Update state
//     state.currentPlan = plan;
//     state.currentVenueFolder = folder;
//     state.currentView = 'plan';
//     state.currentPath = folder.path;
//     state.breadcrumbTitles.push(folder.title);

//     showLoading(false);
//     return { plan, meta };

//   } catch (error) {
//     showLoading(false);
//     showStatus(`Failed to load presentations: ${error}`, 'error');
//     return null;
//   }
// }

/**
 * Get instructions data for a folder using FormatResolver.
 * Updates state with current path, breadcrumb, and instructions information.
 * @param folder - The folder to get instructions data for
 * @returns Instructions data with metadata, or null on error
 */
export async function viewAsInstructions(folder: ContentFolder): Promise<InstructionsResult | null> {
  if (!state.currentProvider) return null;

  showLoading(true);

  try {
    const resolver = new FormatResolver(state.currentProvider);
    const { data: instructions, meta } = await resolver.getInstructionsWithMeta(folder.path, state.currentAuth);

    if (!instructions) {
      showStatus('This provider does not support expanded instructions view', 'error');
      showLoading(false);
      return null;
    }

    // Update state
    state.currentInstructions = instructions;
    state.currentVenueFolder = folder;
    state.currentView = 'instructions';
    state.currentPath = folder.path;
    state.breadcrumbTitles.push(folder.title);

    showLoading(false);
    return { instructions, meta };

  } catch (error) {
    showLoading(false);
    showStatus(`Failed to load expanded instructions: ${error}`, 'error');
    return null;
  }
}
