/**
 * Utility functions for the playground
 */

/** Escape HTML special characters to prevent XSS attacks. */
export function escapeHtml(unsafe: string | undefined | null): string {
  if (unsafe === undefined || unsafe === null) {
    return '';
  }
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Format a duration in seconds as a human-readable string. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/** Render a collapsible JSON viewer HTML component. Issue #9: JSON viewers are collapsed by default to reduce visual clutter. */
export function renderJsonViewer(data: unknown, title: string, collapsed: boolean = true): string {
  const jsonStr = JSON.stringify(data, null, 2);
  const escapedJson = escapeHtml(jsonStr);
  const collapsedClass = collapsed ? 'collapsed' : '';
  const toggleIcon = collapsed ? '+' : '-';

  return `
    <div class="json-viewer ${collapsedClass}">
      <div class="json-viewer-header" onclick="this.parentElement.classList.toggle('collapsed'); this.querySelector('.json-toggle').textContent = this.parentElement.classList.contains('collapsed') ? '+' : '-';">
        <span class="json-toggle">${toggleIcon}</span>
        <h3>${escapeHtml(title)}</h3>
        <button class="json-copy-btn" onclick="event.stopPropagation(); navigator.clipboard.writeText(this.closest('.json-viewer').querySelector('.json-content').textContent).then(() => this.textContent = 'Copied!').catch(() => this.textContent = 'Failed'); setTimeout(() => this.textContent = 'Copy', 2000);">Copy</button>
      </div>
      <pre class="json-content">${escapedJson}</pre>
    </div>
  `;
}
