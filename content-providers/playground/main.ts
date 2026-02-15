import { getAvailableProviders, getProvider, ContentFolder, ContentItem, isContentFolder, isContentFile } from "../src";
import { state, initElements, elements } from './state';
import { closeModal, showStatus, closeVenueChoiceModal } from './ui';
import {
  configureProviders,
  setOnAuthSuccess,
  handleOAuthCallback,
  showAuthChoiceModal,
  showOAuthModal,
  showFormLoginModal,
  handleFormLoginSubmit,
  startOAuthRedirect,
  startDeviceFlow,
  copyUserCode,
  retryAuth,
  deviceFlowHelper
} from './auth';
import { loadContent, viewAsPlaylist, /* viewAsPresentations, */ viewAsInstructions } from './api';
import { renderProviders, renderContent } from './views/common';
import {
  renderPlaylistView,
  playPlanFiles,
  playQueueItem,
  playNextInQueue,
  playPrevInQueue
} from './views/playlist';
import { renderPlanView, showPresentationDetails } from './views/plans';
import { renderInstructionsView } from './views/instructions';

// Configure providers on load
configureProviders();

// Set up auth success callback
setOnAuthSuccess(() => {
  navigateToBrowser();
  renderProvidersView();
});

function init() {
  initElements();
  handleOAuthCallback();
  renderProvidersView();
  setupEventListeners();
  setupEventDelegation();
}

function renderProvidersView() {
  renderProviders(handleProviderClick);
}

async function handleProviderClick(providerId: string) {
  const provider = getProvider(providerId);
  if (!provider) {
    showStatus('Provider not found', 'error');
    return;
  }

  state.currentProvider = provider;

  if (state.connectedProviders.has(providerId)) {
    state.currentAuth = state.connectedProviders.get(providerId) || null;
    await navigateToBrowser();
    return;
  }

  if (provider.requiresAuth) {
    const supportsDeviceFlow = deviceFlowHelper.supportsDeviceFlow(provider.config);
    const supportsOAuth = provider.authTypes.includes('oauth_pkce');

    if (supportsDeviceFlow && supportsOAuth) {
      showAuthChoiceModal();
    } else if (supportsDeviceFlow) {
      await startDeviceFlow();
    } else if (provider.authTypes.includes('form_login')) {
      showFormLoginModal();
    } else {
      showOAuthModal();
    }
    return;
  }

  state.connectedProviders.set(providerId, null);
  state.currentAuth = null;
  await navigateToBrowser();
}

function setupEventListeners() {
  if (!elements) return;

  elements.backBtn.addEventListener('click', handleBack);
  elements.modalClose.addEventListener('click', closeModal);
  elements.copyCodeBtn.addEventListener('click', copyUserCode);
  elements.retryBtn.addEventListener('click', retryAuth);
  elements.oauthSigninBtn.addEventListener('click', startOAuthRedirect);
  elements.formLoginBtn.addEventListener('click', handleFormLoginSubmit);
  elements.authChoiceDeviceBtn.addEventListener('click', () => startDeviceFlow());
  elements.authChoiceOAuthBtn.addEventListener('click', () => showOAuthModal());

  // Handle Enter key in form login fields
  elements.loginEmail.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') elements!.loginPassword.focus();
  });
  elements.loginPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleFormLoginSubmit();
  });

  elements.modal.addEventListener('click', (e) => {
    if (e.target === elements!.modal) {
      closeModal();
    }
  });

  // Tab switching
  elements.mainTabs.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab')!;
      switchTab(tab);
    });
  });
}

function setupEventDelegation() {
  if (!elements) return;

  // Content grid delegation - handles all dynamic content
  elements.contentGrid.addEventListener('click', handleContentGridClick);

  // Modal delegation - handles presentation detail and playlist queue
  elements.modal.addEventListener('click', handleModalClick);
}

function handleContentGridClick(e: Event) {
  const target = e.target as HTMLElement;

  // Folder card click
  const folderCard = target.closest('.folder-card');
  if (folderCard) {
    const folderId = folderCard.getAttribute('data-folder-id');
    if (folderId) {
      const items = getCurrentContentItems();
      const folder = items?.find(i => isContentFolder(i) && i.id === folderId) as ContentFolder | undefined;
      if (folder) handleFolderClick(folder);
    }
    return;
  }

  // File card click
  const fileCard = target.closest('.file-card');
  if (fileCard) {
    const fileId = fileCard.getAttribute('data-file-id');
    if (fileId) {
      const items = getCurrentContentItems();
      const file = items?.find(i => isContentFile(i) && i.id === fileId);
      if (file && isContentFile(file)) {
        window.open(file.url, '_blank');
        showStatus(`Opening: ${file.title}`, 'success');
      }
    }
    return;
  }

  // // Play presentation button
  // const playPresentationBtn = target.closest('.play-presentation-btn');
  // if (playPresentationBtn) {
  //   e.stopPropagation();
  //   const sectionIdx = parseInt(playPresentationBtn.getAttribute('data-section') || '0');
  //   const presentationIdx = parseInt(playPresentationBtn.getAttribute('data-presentation') || '0');
  //   if (state.currentPlan) {
  //     const presentation = state.currentPlan.sections[sectionIdx]?.presentations[presentationIdx];
  //     if (presentation) playPlanFiles(presentation.files);
  //   }
  //   return;
  // }

  // // Presentation card click (for details)
  // const presentationCard = target.closest('.presentation-card');
  // if (presentationCard && !target.closest('button')) {
  //   const sectionIdx = parseInt(presentationCard.getAttribute('data-section') || '0');
  //   const presentationIdx = parseInt(presentationCard.getAttribute('data-presentation') || '0');
  //   if (state.currentPlan) {
  //     const presentation = state.currentPlan.sections[sectionIdx]?.presentations[presentationIdx];
  //     if (presentation) showPresentationDetails(presentation);
  //   }
  //   return;
  // }

  // Play All button
  const playAllBtn = target.closest('#play-all-btn');
  if (playAllBtn) {
    if (state.currentPlan) {
      playPlanFiles(state.currentPlan.allFiles);
    } else if (state.currentPlaylist) {
      playPlanFiles(state.currentPlaylist);
    }
    return;
  }

  // Playlist file click
  const playlistFile = target.closest('.playlist-file');
  if (playlistFile && !target.closest('a')) {
    const fileIndex = parseInt(playlistFile.getAttribute('data-file-index') || '0');
    if (state.currentPlaylist && state.currentPlaylist[fileIndex]) {
      const file = state.currentPlaylist[fileIndex];
      window.open(file.url, '_blank');
      showStatus(`Playing: ${file.title}`, 'success');
    }
    return;
  }

  // JSON toggle
  const jsonToggle = target.closest('.json-toggle');
  if (jsonToggle) {
    const viewer = jsonToggle.closest('.json-viewer');
    const content = viewer?.querySelector('.json-content');
    const isExpanded = content?.hasAttribute('hidden') === false;

    content?.toggleAttribute('hidden');
    viewer?.classList.toggle('collapsed', isExpanded);
    jsonToggle.setAttribute('aria-expanded', String(!isExpanded));

    const icon = jsonToggle.querySelector('.toggle-icon');
    if (icon) icon.textContent = isExpanded ? '▶' : '▼';
    return;
  }

  // JSON copy
  const jsonCopyBtn = target.closest('.json-copy-btn');
  if (jsonCopyBtn) {
    const content = jsonCopyBtn.closest('.json-viewer')?.querySelector('.json-content');
    if (content) {
      navigator.clipboard.writeText(content.textContent || '')
        .then(() => {
          jsonCopyBtn.textContent = 'Copied!';
          setTimeout(() => { jsonCopyBtn.textContent = 'Copy'; }, 2000);
        })
        .catch(() => { jsonCopyBtn.textContent = 'Failed'; });
    }
    return;
  }

  // Instruction item click
  const instructionItem = target.closest('.instruction-item');
  if (instructionItem && !target.closest('a')) {
    const downloadUrl = instructionItem.getAttribute('data-embed-url');
    if (downloadUrl) {
      showStatus(`Embed URL: ${downloadUrl}`, 'success');
    }
    return;
  }

  // Browse fallback button in empty state
  const browseFallbackBtn = target.closest('.browse-fallback-btn');
  if (browseFallbackBtn) {
    // Go back to regular browse view
    if (state.currentVenueFolder) {
      state.currentPath = state.currentVenueFolder.path;
      loadAndRenderContent();
    }
    return;
  }
}

function handleModalClick(e: Event) {
  const target = e.target as HTMLElement;

  // Queue navigation
  if (target.id === 'queue-next-btn') {
    playNextInQueue();
    return;
  }
  if (target.id === 'queue-prev-btn') {
    playPrevInQueue();
    return;
  }
  if (target.id === 'queue-close-btn') {
    closeModal();
    state.playlistQueue = null;
    return;
  }

  // Queue item click
  const queueItem = target.closest('.queue-item');
  if (queueItem) {
    const index = parseInt(queueItem.getAttribute('data-queue-index') || '0');
    playQueueItem(index);
    return;
  }

  // Presentation detail actions
  if (target.id === 'presentation-play-all-btn') {
    const filesEl = document.getElementById('presentation-detail-files');
    if (filesEl && state.currentPlan) {
      // Find the presentation from stored state
      const sectionIdx = parseInt(filesEl.getAttribute('data-section') || '0');
      const presentationIdx = parseInt(filesEl.getAttribute('data-presentation') || '0');
      const presentation = state.currentPlan.sections[sectionIdx]?.presentations[presentationIdx];
      if (presentation) {
        closeModal();
        playPlanFiles(presentation.files);
      }
    }
    return;
  }
  if (target.id === 'presentation-close-btn') {
    closeModal();
    return;
  }
}

// Store current content items for delegation lookup
let currentContentItems: ContentItem[] | null = null;

function getCurrentContentItems(): ContentItem[] | null {
  return currentContentItems;
}

function setCurrentContentItems(items: ContentItem[] | null) {
  currentContentItems = items;
}

function switchTab(tab: string) {
  if (!elements) return;

  // Update tab buttons
  elements.mainTabs.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });

  // Show/hide views
  elements.providersView.classList.toggle('hidden', tab !== 'providers');
  elements.docsView.classList.toggle('hidden', tab !== 'docs');

  // Hide browser view when switching tabs
  if (tab !== 'providers') {
    elements.browserView.classList.add('hidden');
    elements.breadcrumb.classList.add('hidden');
  }
}

async function navigateToBrowser() {
  if (!elements) return;

  state.currentView = 'browser';
  state.currentPath = '';
  state.breadcrumbTitles = [];

  elements.providersView.classList.add('hidden');
  elements.browserView.classList.remove('hidden');
  elements.breadcrumb.classList.remove('hidden');

  updateBreadcrumb();
  await loadAndRenderContent();
}

function navigateToProviders() {
  if (!elements) return;

  state.currentView = 'providers';
  state.currentProvider = null;
  state.currentPath = '';
  state.breadcrumbTitles = [];

  elements.browserView.classList.add('hidden');
  elements.breadcrumb.classList.add('hidden');
  elements.providersView.classList.remove('hidden');

  renderProvidersView();
}

function goBack() {
  if (!state.currentPath) return;

  const segments = state.currentPath.split('/').filter(Boolean);
  segments.pop();
  state.currentPath = segments.length > 0 ? '/' + segments.join('/') : '';
  state.breadcrumbTitles.pop();
}

function handleBack() {
  if (state.currentPath) {
    goBack();
    updateBreadcrumb();
    loadAndRenderContent();
  } else {
    navigateToProviders();
  }
}

function updateBreadcrumb() {
  if (!elements) return;

  const parts: string[] = [state.currentProvider?.name || 'Unknown'];
  state.breadcrumbTitles.forEach(title => {
    parts.push(title);
  });

  elements.breadcrumbPath.innerHTML = parts
    .map((part, i) => i === parts.length - 1 ? `<span>${part}</span>` : part)
    .join(' / ');

  elements.browserTitle.textContent = state.breadcrumbTitles.length > 0
    ? state.breadcrumbTitles[state.breadcrumbTitles.length - 1]
    : state.currentProvider?.name || 'Content';
}

async function loadAndRenderContent() {
  if (!elements) return;

  const items = await loadContent();
  setCurrentContentItems(items);

  if (items.length === 0) {
    elements.emptyEl.classList.remove('hidden');
    elements.contentGrid.innerHTML = '';
    return;
  }

  elements.emptyEl.classList.add('hidden');
  renderContent(items, handleFolderClick, handleFileClick);
}

function handleFolderClick(folder: ContentFolder) {
  const isLeafFolder = folder.isLeaf;

  if (isLeafFolder && state.currentProvider) {
    showVenueChoiceModal(folder);
  } else {
    state.currentPath = folder.path;
    state.breadcrumbTitles.push(folder.title);
    updateBreadcrumb();
    loadAndRenderContent();
  }
}

function handleFileClick(file: ContentItem & { type: 'file' }) {
  window.open(file.url, '_blank');
  showStatus(`Opening: ${file.title}`, 'success');
}

function showVenueChoiceModal(folder: ContentFolder) {
  state.currentVenueFolder = folder;

  const caps = state.currentProvider?.capabilities;

  const formatBtn = (id: string, icon: string, name: string, desc: string, isNative: boolean, sourceFormat?: string) => {
    const nativeLabel = isNative ? '<span class="native-badge">Native</span>' : `<span class="derived-badge">Derived${sourceFormat ? ` from ${sourceFormat}` : ''}</span>`;
    const btnClass = isNative ? 'venue-btn native' : 'venue-btn derived';
    return `
      <button id="${id}" class="${btnClass}">
        <span class="btn-icon">${icon}</span>
        <span class="btn-text">${name}</span>
        ${nativeLabel}
        <span class="btn-desc">${desc}</span>
      </button>
    `;
  };

  const getPlaylistSource = () => caps?.instructions ? 'Instructions' : 'Playlist';
  // const getPresentationsSource = () => caps?.instructions ? 'Instructions' : 'Playlist';
  const getInstructionsSource = () => 'Playlist';

  const choiceHtml = `
    <div class="venue-choice-modal" id="venue-choice-modal">
      <div class="venue-choice-content">
        <h2>Choose View for "${folder.title}"</h2>
        <p>How would you like to view this content?</p>
        <p class="format-legend"><span class="native-badge">Native</span> = Direct provider support &nbsp; <span class="derived-badge">Derived</span> = Converted from another format</p>
        <div class="venue-choice-buttons">
          ${formatBtn('view-playlist-btn', '📋', 'Playlist', 'Simple list of media files', !!caps?.playlist, getPlaylistSource())}
          ${formatBtn('view-expanded-btn', '📚', 'Instructions', 'Full hierarchy with all actions', !!caps?.instructions, getInstructionsSource())}
        </div>
        <button id="venue-choice-cancel" class="cancel-btn">Cancel</button>
      </div>
    </div>
  `;

  const existingModal = document.getElementById('venue-choice-modal');
  if (existingModal) existingModal.remove();

  document.body.insertAdjacentHTML('beforeend', choiceHtml);

  document.getElementById('view-playlist-btn')!.addEventListener('click', () => {
    closeVenueChoiceModal();
    handleViewAsPlaylist(folder);
  });

  // document.getElementById('view-presentations-btn')!.addEventListener('click', () => {
  //   closeVenueChoiceModal();
  //   handleViewAsPresentations(folder);
  // });

  document.getElementById('view-expanded-btn')!.addEventListener('click', () => {
    closeVenueChoiceModal();
    handleViewAsInstructions(folder);
  });

  document.getElementById('venue-choice-cancel')!.addEventListener('click', closeVenueChoiceModal);

  document.getElementById('venue-choice-modal')!.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'venue-choice-modal') {
      closeVenueChoiceModal();
    }
  });
}

async function handleViewAsPlaylist(folder: ContentFolder) {
  if (!elements) return;

  const result = await viewAsPlaylist(folder);

  if (!result) {
    // Fallback to regular browse
    state.currentPath = folder.path;
    state.breadcrumbTitles.push(folder.title);
    updateBreadcrumb();
    loadAndRenderContent();
    return;
  }

  // Store playlist for Play All
  state.currentPlaylist = result.playlist;

  updateBreadcrumb();
  renderPlaylistView(result.playlist, result.meta);
}

// async function handleViewAsPresentations(folder: ContentFolder) {
//   if (!elements) return;

//   const result = await viewAsPresentations(folder);

//   if (!result) return;

//   updateBreadcrumb();
//   renderPlanView(result.plan, result.meta);
// }

async function handleViewAsInstructions(folder: ContentFolder) {
  if (!elements) return;

  const result = await viewAsInstructions(folder);

  if (!result) return;

  updateBreadcrumb();
  renderInstructionsView(result.instructions, result.meta);
}

// Initialize
init();

console.log('Content Provider Helper Playground loaded');
console.log('Available providers:', getAvailableProviders());
