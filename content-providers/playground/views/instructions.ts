import { state, elements } from '../state';
import { escapeHtml, renderJsonViewer } from '../utils';
import { showStatus } from '../ui';
import { Instructions, InstructionItem } from '../../src';
import type { ResolvedFormatMeta } from '../../src';
import { renderFormatSourceBadge } from './common';

/**
 * Render the instructions view with hierarchical item tree
 * Issue #13: Removed the unused `_isExpanded` parameter
 * @param instructions - The instructions object containing items
 * @param meta - Optional format metadata indicating native or derived source
 */
export function renderInstructionsView(instructions: Instructions, meta?: ResolvedFormatMeta): void {
  if (!elements) return;

  const viewType = 'Instructions';
  elements.browserTitle.textContent = `${escapeHtml(instructions.name || 'Instructions')} (${viewType})`;

  const countItems = (items: InstructionItem[]): number => {
    let count = items.length;
    for (const item of items) {
      if (item.children) count += countItems(item.children);
    }
    return count;
  };

  const totalItems = countItems(instructions.items);

  let html = `
    <div class="instructions-view">
      <div class="instructions-header">
        <div class="instructions-info">
          <h2>${escapeHtml(instructions.name || 'Instructions')}</h2>
          ${meta ? renderFormatSourceBadge(meta) : ''}
          <p class="instructions-stats">${instructions.items.length} top-level items &bull; ${totalItems} total items</p>
        </div>
      </div>
      <div class="instructions-tree">
  `;

  const renderItem = (item: InstructionItem, depth: number = 0): string => {
    const indent = depth * 20;
    const hasChildren = item.children && item.children.length > 0;

    // Type icons using HTML entities
    let typeIcon: string;
    switch (item.itemType) {
      case 'header':
        typeIcon = '&#128193;'; // folder
        break;
      case 'lessonSection':
        typeIcon = '&#128203;'; // clipboard
        break;
      case 'lessonAction':
        typeIcon = '&#9654;&#65039;'; // play button
        break;
      case 'lessonAddOn':
        typeIcon = '&#10133;'; // plus sign
        break;
      default:
        typeIcon = '&#128196;'; // page facing up
    }

    const thumbHtml = item.thumbnail
      ? `<img class="instruction-thumb" src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.label || '')}" onerror="this.style.display='none'">`
      : '';

    let itemHtml = `
      <div class="instruction-item" style="margin-left: ${indent}px;" data-embed-url="${escapeHtml(item.downloadUrl || '')}">
        ${thumbHtml}
        <div class="instruction-content">
          <span class="instruction-icon">${typeIcon}</span>
          <span class="instruction-label">${escapeHtml(item.label || 'Untitled')}</span>
          ${item.itemType ? `<span class="instruction-type">${escapeHtml(item.itemType)}</span>` : ''}
          ${item.seconds ? `<span class="instruction-seconds">${item.seconds}s</span>` : ''}
        </div>
        ${item.actionType ? `<div class="instruction-action-type">${escapeHtml(item.actionType)}</div>` : ''}
        ${item.downloadUrl ? `<a href="${escapeHtml(item.downloadUrl)}" target="_blank" class="instruction-embed-link">Open Embed</a>` : ''}
      </div>
    `;

    if (hasChildren) {
      itemHtml += item.children!.map(child => renderItem(child, depth + 1)).join('');
    }

    return itemHtml;
  };

  html += instructions.items.map(item => renderItem(item)).join('');

  html += `
      </div>
    </div>
  `;

  html += renderJsonViewer(instructions, `${viewType} JSON`);

  elements.contentGrid.innerHTML = html;
  if (elements.emptyEl) {
    elements.emptyEl.classList.add('hidden');
  }

  elements.contentGrid.querySelectorAll('.instruction-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('instruction-embed-link')) return;
      const downloadUrl = item.getAttribute('data-embed-url');
      if (downloadUrl) {
        showStatus(`Embed URL: ${downloadUrl}`, 'success');
        console.log('Instruction item:', item);
      }
    });
  });
}
