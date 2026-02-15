import { state, elements } from '../state';
import { escapeHtml, renderJsonViewer, formatDuration } from '../utils';
import { showStatus, showModal } from '../ui';
import { Plan, PlanPresentation, ContentItem, isContentFile } from '../../src';
import type { ResolvedFormatMeta } from '../../src';
import { renderFormatSourceBadge } from './common';
import { playPlanFiles } from './playlist';

/**
 * Render the presentations/plan view
 * @param plan - The plan object containing sections and presentations
 * @param meta - Format metadata indicating native or derived source
 */
export function renderPlanView(plan: Plan, meta: ResolvedFormatMeta): void {
  if (!elements) return;

  elements.browserTitle.textContent = `${escapeHtml(plan.name)} (Presentations)`;

  let html = `
    <div class="plan-view">
      <div class="plan-header">
        ${plan.thumbnail ? `<img class="plan-image" src="${escapeHtml(plan.thumbnail)}" alt="${escapeHtml(plan.name)}">` : ''}
        <div class="plan-info">
          <h2>${escapeHtml(plan.name)}</h2>
          ${renderFormatSourceBadge(meta)}
          ${plan.description ? `<p class="plan-description">${escapeHtml(plan.description)}</p>` : ''}
          <p class="plan-stats">${plan.sections.length} sections &bull; ${plan.allFiles.length} total files</p>
          <button id="play-all-btn" class="play-all-btn">&#9654; Play All (${plan.allFiles.length} files)</button>
        </div>
      </div>
      <div class="plan-sections">
  `;

  plan.sections.forEach((section, sectionIndex) => {
    html += `
      <div class="plan-section">
        <h3 class="section-title">${escapeHtml(section.name)}</h3>
        <div class="section-presentations">
    `;

    section.presentations.forEach((presentation, presentationIndex) => {
      // Issue #1 FIX: Changed 'add-on' to 'other' and badge text to "Other"
      const actionBadge = presentation.actionType === 'other'
        ? '<span class="action-badge addon">Other</span>'
        : '<span class="action-badge play">Play</span>';

      html += `
        <div class="presentation-card" data-section="${sectionIndex}" data-presentation="${presentationIndex}">
          <div class="presentation-info">
            <span class="presentation-name">${escapeHtml(presentation.name)}</span>
            ${actionBadge}
          </div>
          <div class="presentation-files">
            ${presentation.files.length} file${presentation.files.length !== 1 ? 's' : ''}
          </div>
          <button class="play-presentation-btn" data-section="${sectionIndex}" data-presentation="${presentationIndex}">&#9654; Play</button>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  html += renderJsonViewer(plan, 'Plan JSON');

  elements.contentGrid.innerHTML = html;
  if (elements.emptyEl) {
    elements.emptyEl.classList.add('hidden');
  }

  document.getElementById('play-all-btn')?.addEventListener('click', () => {
    playPlanFiles(plan.allFiles);
  });

  elements.contentGrid.querySelectorAll('.play-presentation-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sectionIdx = parseInt((e.target as HTMLElement).getAttribute('data-section')!);
      const presentationIdx = parseInt((e.target as HTMLElement).getAttribute('data-presentation')!);
      const presentation = plan.sections[sectionIdx].presentations[presentationIdx];
      playPlanFiles(presentation.files);
    });
  });

  elements.contentGrid.querySelectorAll('.presentation-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('play-presentation-btn')) return;

      const sectionIdx = parseInt(card.getAttribute('data-section')!);
      const presentationIdx = parseInt(card.getAttribute('data-presentation')!);
      const presentation = plan.sections[sectionIdx].presentations[presentationIdx];
      showPresentationDetails(presentation);
    });
  });
}

/**
 * Show presentation detail modal with file list
 * Issue #2: Populate the presentation-detail-section modal elements
 * @param presentation - The presentation to show details for
 */
export function showPresentationDetails(presentation: PlanPresentation): void {
  const detailSection = document.getElementById('presentation-detail-section');
  if (!detailSection) {
    // Fallback to console and status if modal section doesn't exist
    showStatus(`${presentation.name}: ${presentation.files.length} file(s)`, 'success');
    console.log('Presentation details:', presentation);
    return;
  }

  // Calculate total duration
  const totalSeconds = presentation.files.reduce((sum, file) => sum + (file.seconds || 0), 0);

  let detailHtml = `
    <div class="presentation-detail">
      <div class="presentation-detail-header">
        <h3>${escapeHtml(presentation.name)}</h3>
        <span class="presentation-action-type ${presentation.actionType}">${presentation.actionType === 'other' ? 'Other' : 'Play'}</span>
      </div>
      <div class="presentation-detail-stats">
        <span>${presentation.files.length} file${presentation.files.length !== 1 ? 's' : ''}</span>
        ${totalSeconds > 0 ? `<span>&bull; ${formatDuration(totalSeconds)} total</span>` : ''}
      </div>
      <div class="presentation-detail-actions">
        <button id="play-presentation-detail-btn" class="play-all-btn">&#9654; Play All</button>
      </div>
      <div class="presentation-file-list">
        <h4>Files</h4>
  `;

  presentation.files.forEach((file, index) => {
    const mediaIcon = file.mediaType === 'video' ? '&#127916;' : '&#128444;';
    detailHtml += `
      <div class="presentation-file-item">
        <span class="file-index">${index + 1}</span>
        <span class="file-type ${file.mediaType}">${mediaIcon}</span>
        <span class="file-title">${escapeHtml(file.title || 'Untitled')}</span>
        <span class="file-seconds">${file.seconds ? formatDuration(file.seconds) : ''}</span>
        <a href="${escapeHtml(file.url)}" target="_blank" class="file-link">Open</a>
      </div>
    `;
  });

  detailHtml += `
      </div>
    </div>
  `;

  detailSection.innerHTML = detailHtml;

  // Show the modal
  showModal('presentation_detail');

  // Set up play button handler
  document.getElementById('play-presentation-detail-btn')?.addEventListener('click', () => {
    playPlanFiles(presentation.files);
  });

  console.log('Presentation details:', presentation);
}
