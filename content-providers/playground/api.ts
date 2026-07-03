import { state } from './state';
import { showLoading, showStatus } from './ui';
import { ContentItem, ContentFile, Instructions, ContentFolder } from '../src';
import { getPlaylistWithMeta, getInstructionsWithMeta, type ResolvedFormatMeta } from './formats';

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

export async function viewAsPlaylist(folder: ContentFolder): Promise<PlaylistResult | null> {
  if (!state.currentProvider) return null;

  showLoading(true);

  try {
    const { data: playlist, meta } = await getPlaylistWithMeta(state.currentProvider, folder.path, state.currentAuth);

    if (!playlist || playlist.length === 0) {
      // Caller may want to fallback to browse
      state.currentVenueFolder = folder;
      state.currentPath = folder.path;
      state.breadcrumbTitles.push(folder.title);
      showLoading(false);
      return null;
    }

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

export async function viewAsInstructions(folder: ContentFolder): Promise<InstructionsResult | null> {
  if (!state.currentProvider) return null;

  showLoading(true);

  try {
    const { data: instructions, meta } = await getInstructionsWithMeta(state.currentProvider, folder.path, state.currentAuth);

    if (!instructions) {
      showStatus('This provider does not support expanded instructions view', 'error');
      showLoading(false);
      return null;
    }

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
