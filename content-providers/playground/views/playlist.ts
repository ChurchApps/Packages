import { state, elements } from '../state';
import { escapeHtml, renderJsonViewer } from '../utils';
import { showStatus, showModal } from '../ui';
import { ContentFile, ContentItem, isContentFile } from '../../src';
import type { ResolvedFormatMeta } from '../../src';
import { renderFormatSourceBadge } from './common';

/**
 * Render the playlist view with file list and controls
 * @param playlist - Array of content files to display
 * @param meta - Format metadata indicating native or derived source
 */
export function renderPlaylistView(playlist: ContentFile[], meta: ResolvedFormatMeta): void {
  if (!elements) return;

  elements.browserTitle.textContent = 'Playlist';

  let html = `
    <div class="playlist-view">
      <div class="playlist-header">
        <div class="playlist-info">
          <h2>Playlist</h2>
          ${renderFormatSourceBadge(meta)}
          <p class="playlist-stats">${playlist.length} files</p>
          <button id="play-all-btn" class="play-all-btn">&#9654; Play All</button>
        </div>
      </div>
      <div class="playlist-files">
  `;

  playlist.forEach((file, index) => {
    const escapedTitle = escapeHtml(file.title);
    const mediaIcon = file.mediaType === 'video' ? '&#127916;' : '&#128444;';
    const imageHtml = file.thumbnail
      ? `<img class="file-thumb" src="${escapeHtml(file.thumbnail)}" alt="${escapedTitle}" onerror="this.outerHTML='<span class=\\'file-thumb-icon\\'>${mediaIcon}</span>'">`
      : `<span class="file-thumb-icon">${mediaIcon}</span>`;

    html += `
      <div class="playlist-file" data-file-index="${index}">
        ${imageHtml}
        <div class="playlist-file-info">
          <span class="playlist-file-title">${escapedTitle}</span>
          <span class="playlist-file-type">${escapeHtml(file.mediaType)}</span>
          ${file.seconds ? `<span class="playlist-file-duration">${file.seconds}s</span>` : ''}
        </div>
        <a href="${escapeHtml(file.url)}" target="_blank" class="playlist-file-link">Open</a>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  html += renderJsonViewer(playlist, 'Playlist JSON');

  elements.contentGrid.innerHTML = html;
  if (elements.emptyEl) {
    elements.emptyEl.classList.add('hidden');
  }

  document.getElementById('play-all-btn')?.addEventListener('click', () => {
    playPlanFiles(playlist);
  });
}

/**
 * Play files with queue UI
 * Opens first file immediately and shows queue modal if multiple files
 * @param files - Array of content items to play
 */
export function playPlanFiles(files: ContentItem[]): void {
  if (files.length === 0) {
    showStatus('No files to play', 'error');
    return;
  }

  // Filter to only content files
  const contentFiles = files.filter(isContentFile);
  if (contentFiles.length === 0) {
    showStatus('No playable files found', 'error');
    return;
  }

  const firstFile = contentFiles[0];
  window.open(firstFile.url, '_blank');

  if (contentFiles.length > 1) {
    // Set up playlist queue
    state.playlistQueue = {
      files: contentFiles,
      currentIndex: 0
    };
    showStatus(`Playing: ${firstFile.title} (1 of ${contentFiles.length})`, 'success');
    showModal('playlist_queue');
    renderPlaylistQueue();
  } else {
    showStatus(`Playing: ${firstFile.title}`, 'success');
  }

  console.log('Playlist:', files);
}

/**
 * Render the playlist queue modal UI
 * Shows current file, navigation buttons, and queue list
 */
export function renderPlaylistQueue(): void {
  const queueSection = document.getElementById('playlist-queue-section');
  if (!queueSection || !state.playlistQueue) return;

  const { files, currentIndex } = state.playlistQueue;
  const currentFile = files[currentIndex];

  let queueHtml = `
    <div class="playlist-queue">
      <div class="queue-current">
        <h3>Now Playing</h3>
        <div class="queue-current-file">
          <span class="queue-file-index">${currentIndex + 1} / ${files.length}</span>
          <span class="queue-file-title">${escapeHtml(currentFile.title)}</span>
          ${currentFile.seconds ? `<span class="queue-file-duration">${currentFile.seconds}s</span>` : ''}
        </div>
      </div>
      <div class="queue-controls">
        <button id="queue-prev-btn" class="queue-nav-btn" ${currentIndex === 0 ? 'disabled' : ''}>&#9664; Previous</button>
        <button id="queue-next-btn" class="queue-nav-btn" ${currentIndex === files.length - 1 ? 'disabled' : ''}>Next &#9654;</button>
      </div>
      <div class="queue-list">
        <h4>Queue</h4>
  `;

  files.forEach((file, index) => {
    const isCurrentClass = index === currentIndex ? 'current' : '';
    const playedClass = index < currentIndex ? 'played' : '';
    queueHtml += `
      <div class="queue-item ${isCurrentClass} ${playedClass}" data-queue-index="${index}">
        <span class="queue-item-index">${index + 1}</span>
        <span class="queue-item-title">${escapeHtml(file.title)}</span>
        ${file.seconds ? `<span class="queue-item-duration">${file.seconds}s</span>` : ''}
      </div>
    `;
  });

  queueHtml += `
      </div>
    </div>
  `;

  queueSection.innerHTML = queueHtml;

  // Set up event listeners
  document.getElementById('queue-prev-btn')?.addEventListener('click', playPrevInQueue);
  document.getElementById('queue-next-btn')?.addEventListener('click', playNextInQueue);

  queueSection.querySelectorAll('.queue-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.getAttribute('data-queue-index') || '0', 10);
      playQueueItem(index);
    });
  });
}

/**
 * Play a specific item in the queue by index
 * @param index - The index of the item to play
 */
export function playQueueItem(index: number): void {
  if (!state.playlistQueue) return;

  const { files } = state.playlistQueue;
  if (index < 0 || index >= files.length) return;

  state.playlistQueue.currentIndex = index;
  const file = files[index];

  window.open(file.url, '_blank');
  showStatus(`Playing: ${file.title} (${index + 1} of ${files.length})`, 'success');

  renderPlaylistQueue();
}

/**
 * Play the next item in the queue
 */
export function playNextInQueue(): void {
  if (!state.playlistQueue) return;

  const { files, currentIndex } = state.playlistQueue;
  if (currentIndex < files.length - 1) {
    playQueueItem(currentIndex + 1);
  }
}

/**
 * Play the previous item in the queue
 */
export function playPrevInQueue(): void {
  if (!state.playlistQueue) return;

  const { currentIndex } = state.playlistQueue;
  if (currentIndex > 0) {
    playQueueItem(currentIndex - 1);
  }
}
