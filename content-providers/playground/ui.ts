import { state, elements } from './state';

/**
 * Modal view types supported by the application
 */
export type ModalView =
  | 'loading'
  | 'code'
  | 'success'
  | 'error'
  | 'oauth'
  | 'processing'
  | 'form_login'
  | 'auth_choice'
  | 'presentation_detail'
  | 'playlist_queue';

/**
 * Map of modal view names to their corresponding section element IDs
 */
const modalSectionIds: Record<ModalView, string> = {
  loading: 'device-flow-loading',
  code: 'device-flow-code',
  success: 'device-flow-success',
  error: 'device-flow-error',
  oauth: 'oauth-flow-section',
  processing: 'oauth-processing',
  form_login: 'form-login-section',
  auth_choice: 'auth-choice-section',
  presentation_detail: 'presentation-detail-section',
  playlist_queue: 'playlist-queue-section'
};

/**
 * Shows the main modal and displays the requested section while hiding all others.
 * @param view - The modal view to display
 */
export function showModal(view: ModalView): void {
  if (!elements) return;

  const modal = elements.modal;
  if (!modal) return;

  // Show the main modal
  modal.classList.remove('hidden');

  // Hide all internal sections
  Object.values(modalSectionIds).forEach(sectionId => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('hidden');
    }
  });

  // Show the requested section
  const targetSectionId = modalSectionIds[view];
  const targetSection = document.getElementById(targetSectionId);
  if (targetSection) {
    targetSection.classList.remove('hidden');
  }
}

/**
 * Closes the modal, deactivates device flow, and clears any polling interval.
 */
export function closeModal(): void {
  if (!elements) return;

  const modal = elements.modal;
  if (modal) {
    modal.classList.add('hidden');
  }

  state.deviceFlowActive = false;

  if (state.pollingInterval) {
    clearTimeout(state.pollingInterval);
    state.pollingInterval = null;
  }
}

/**
 * Shows a toast notification message that auto-hides after 4 seconds.
 * @param message - The message to display
 * @param type - The type of notification ('success' or 'error')
 */
export function showStatus(message: string, type: 'success' | 'error' = 'success'): void {
  if (!elements) return;

  const statusEl = elements.status;
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove('hidden');

  setTimeout(() => {
    statusEl.classList.add('hidden');
  }, 4000);
}

/**
 * Toggles the visibility of the loading spinner.
 * @param show - Whether to show or hide the loading spinner
 */
export function showLoading(show: boolean): void {
  if (!elements) return;

  const loadingEl = elements.loading;
  if (!loadingEl) return;

  if (show) {
    loadingEl.classList.remove('hidden');
  } else {
    loadingEl.classList.add('hidden');
  }
}

/**
 * Removes the venue choice modal from the DOM and clears the current venue folder state.
 */
export function closeVenueChoiceModal(): void {
  const venueModal = document.getElementById('venue-choice-modal');
  if (venueModal) {
    venueModal.remove();
  }

  state.currentVenueFolder = null;
}
