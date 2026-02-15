import { state, elements } from '../state';
import { escapeHtml, renderJsonViewer } from '../utils';
import { showStatus, showModal } from '../ui';
import { getAvailableProviders, ContentItem, ContentFolder, ContentFile, isContentFolder, isContentFile } from '../../src';
import type { ResolvedFormatMeta } from '../../src';

/**
 * Render provider cards in the providers grid
 * @param onProviderClick - Callback when a provider card is clicked
 */
export function renderProviders(onProviderClick: (providerId: string) => void): void {
  if (!elements) return;

  const providers = getAvailableProviders();

  elements.providersGrid.innerHTML = providers.map(provider => {
    const isConnected = state.connectedProviders.has(provider.id);
    const disabledClass = provider.implemented ? '' : 'disabled';

    // Auth method badges
    let authBadges = '';
    if (!provider.implemented) {
      authBadges += '<span class="provider-badge badge-coming-soon">Coming Soon</span>';
    } else if (!provider.requiresAuth) {
      authBadges += '<span class="provider-badge badge-public">Public API</span>';
    } else {
      if (provider.authTypes.includes('device_flow')) {
        authBadges += '<span class="provider-badge badge-device">Device Flow</span>';
      }
      if (provider.authTypes.includes('oauth_pkce')) {
        authBadges += '<span class="provider-badge badge-auth">OAuth</span>';
      }
      if (provider.authTypes.includes('form_login')) {
        authBadges += '<span class="provider-badge badge-form">Login</span>';
      }
    }

    // Capability badges - show all formats with native vs derived indicators
    let capBadges = '';
    if (provider.implemented && provider.capabilities) {
      const caps = provider.capabilities;

      // Determine what formats can be derived
      const canDerivePlaylist = caps.presentations || caps.instructions;
      const canDerivePresentations = caps.instructions || caps.playlist;
      const canDeriveExpanded = caps.presentations || caps.playlist;

      // Playlist badge
      if (caps.playlist) {
        capBadges += '<span class="provider-badge badge-cap-playlist badge-native" title="Native support">Playlist</span>';
      } else if (canDerivePlaylist) {
        capBadges += '<span class="provider-badge badge-cap-playlist badge-derived" title="Derived from other formats">Playlist*</span>';
      }

      // Presentations badge
      if (caps.presentations) {
        capBadges += '<span class="provider-badge badge-cap-presentations badge-native" title="Native support">Presentations</span>';
      } else if (canDerivePresentations) {
        capBadges += '<span class="provider-badge badge-cap-presentations badge-derived" title="Derived from other formats">Presentations*</span>';
      }

      // Instructions badge
      if (caps.instructions) {
        capBadges += '<span class="provider-badge badge-cap-instructions badge-native" title="Native support">Instructions</span>';
      } else if (canDeriveExpanded) {
        capBadges += '<span class="provider-badge badge-cap-instructions badge-derived" title="Derived from other formats">Instructions*</span>';
      }
    }

    let subtitle = 'Click to connect';
    if (!provider.implemented) {
      subtitle = 'Not yet available';
    } else if (isConnected) {
      subtitle = '&#10003; Connected';
    }

    const escapedName = escapeHtml(provider.name);
    const logoHtml = provider.logos.dark
      ? `<img class="card-image provider-logo" src="${escapeHtml(provider.logos.dark)}" alt="${escapedName}" onerror="this.outerHTML='<div class=\\'card-image placeholder\\'>&#128230;</div>'">`
      : '<div class="card-image placeholder">&#128230;</div>';

    return `
      <div class="card provider-card ${disabledClass}" data-provider-id="${escapeHtml(provider.id)}" data-implemented="${provider.implemented}">
        ${logoHtml}
        <h3 class="card-title">${escapedName}</h3>
        <p class="card-subtitle">${subtitle}</p>
        <div class="badge-row auth-badges">${authBadges}</div>
        <div class="badge-row cap-badges">${capBadges}</div>
      </div>
    `;
  }).join('');

  elements.providersGrid.querySelectorAll('.provider-card').forEach(card => {
    card.addEventListener('click', () => {
      const implemented = card.getAttribute('data-implemented') === 'true';
      if (!implemented) {
        showStatus('This provider is coming soon!', 'error');
        return;
      }
      const providerId = card.getAttribute('data-provider-id')!;
      onProviderClick(providerId);
    });
  });
}

/**
 * Render content items (folders and files) in the content grid
 * @param items - Array of content items to render
 * @param onFolderClick - Callback when a folder card is clicked
 * @param onFileClick - Callback when a file card is clicked
 */
export function renderContent(
  items: ContentItem[],
  onFolderClick: (folder: ContentFolder) => void,
  onFileClick: (file: ContentFile) => void
): void {
  if (!elements) return;

  let html = items.map(item => {
    if (isContentFolder(item)) {
      return renderFolder(item);
    } else if (isContentFile(item)) {
      return renderFile(item);
    }
    return '';
  }).join('');

  // Add JSON viewer for all content views
  if (items.length > 0) {
    const allFiles = items.every(item => isContentFile(item));
    const allFolders = items.every(item => isContentFolder(item));
    const title = allFiles ? 'Playlist JSON' : allFolders ? 'Folders JSON' : 'Content JSON';
    html += renderJsonViewer(items, title);
  }

  elements.contentGrid.innerHTML = html;

  elements.contentGrid.querySelectorAll('.folder-card').forEach(card => {
    card.addEventListener('click', () => {
      const folderId = card.getAttribute('data-folder-id')!;
      const folder = items.find(i => isContentFolder(i) && i.id === folderId) as ContentFolder;
      if (folder) {
        onFolderClick(folder);
      }
    });
  });

  elements.contentGrid.querySelectorAll('.file-card').forEach(card => {
    card.addEventListener('click', () => {
      const fileId = card.getAttribute('data-file-id')!;
      const file = items.find(i => isContentFile(i) && i.id === fileId);
      if (file && isContentFile(file)) {
        onFileClick(file);
      }
    });
  });
}

/**
 * Generate folder card HTML
 * @param folder - The folder to render
 * @returns HTML string for the folder card
 */
export function renderFolder(folder: ContentFolder): string {
  const escapedTitle = escapeHtml(folder.title);
  const imageHtml = folder.thumbnail
    ? `<img class="card-image" src="${escapeHtml(folder.thumbnail)}" alt="${escapedTitle}" onerror="this.outerHTML='<div class=\\'card-image placeholder\\'>&#128193;</div>'">`
    : '<div class="card-image placeholder">&#128193;</div>';

  return `
    <div class="card content-card folder-card" data-folder-id="${escapeHtml(folder.id)}">
      ${imageHtml}
      <h3 class="card-title folder-icon">${escapedTitle}</h3>
      <p class="card-subtitle">Folder</p>
    </div>
  `;
}

/**
 * Generate file card HTML
 * @param file - The file to render
 * @returns HTML string for the file card
 */
export function renderFile(file: ContentFile): string {
  const escapedTitle = escapeHtml(file.title);
  const mediaIcon = file.mediaType === 'video' ? '&#127916;' : '&#128444;';
  const imageHtml = file.thumbnail
    ? `<img class="card-image" src="${escapeHtml(file.thumbnail)}" alt="${escapedTitle}" onerror="this.outerHTML='<div class=\\'card-image placeholder\\'>${mediaIcon}</div>'">`
    : `<div class="card-image placeholder">${mediaIcon}</div>`;

  return `
    <div class="card content-card file-card" data-file-id="${escapeHtml(file.id)}">
      <div class="card-image-wrapper">
        ${imageHtml}
        <span class="media-badge ${file.mediaType}">${escapeHtml(file.mediaType)}</span>
      </div>
      <h3 class="card-title file-icon ${file.mediaType}">${escapedTitle}</h3>
      <p class="card-subtitle">${file.mediaType === 'video' ? 'Video' : 'Image'}</p>
      <p class="file-url">${escapeHtml(file.url)}</p>
    </div>
  `;
}

/**
 * Render an empty state message for a specific view type
 * @param viewType - The type of view that is empty
 */
export function renderEmptyState(viewType: 'playlist' | 'presentations' | 'instructions' | 'browse'): void {
  if (!elements) return;

  const messages: Record<typeof viewType, string> = {
    playlist: 'No files found in this playlist.',
    presentations: 'No presentations found for this service.',
    instructions: 'No instructions found for this content.',
    browse: 'No content found in this folder.'
  };

  const message = messages[viewType];

  elements.contentGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">&#128196;</div>
      <h3 class="empty-state-title">No Content</h3>
      <p class="empty-state-message">${escapeHtml(message)}</p>
      <button class="empty-state-action" id="browse-instead-btn">Browse Content Instead</button>
    </div>
  `;

  elements.emptyEl.classList.add('hidden');

  const browseBtn = document.getElementById('browse-instead-btn');
  if (browseBtn) {
    browseBtn.addEventListener('click', () => {
      // Trigger navigation back to browse view
      // This will be handled by the main module through event dispatch
      window.dispatchEvent(new CustomEvent('navigate-browse'));
    });
  }
}

/**
 * Render a format source badge indicating native or derived format
 * @param meta - The resolved format metadata
 * @returns HTML string for the badge
 */
export function renderFormatSourceBadge(meta: ResolvedFormatMeta): string {
  if (meta.isNative) {
    return '<span class="format-source-badge native">Native</span>';
  }
  const lossyWarning = meta.isLossy ? ' (lossy)' : '';
  return `<span class="format-source-badge derived">Derived from ${escapeHtml(meta.sourceFormat || 'unknown')}${lossyWarning}</span>`;
}
