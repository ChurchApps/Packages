import { state, elements } from './state';
import { showModal, closeModal, showStatus } from './ui';
import { getProvider, B1ChurchProvider, DropboxProvider, ContentProviderAuthData, DeviceAuthorizationResponse } from '../src';
import { OAuthHelper, DeviceFlowHelper } from '../src/helpers';
import type { PlanningCenterProvider } from '../src';

// OAuth configuration constants
const OAUTH_REDIRECT_URI = `${window.location.origin}${window.location.pathname}`;
const STORAGE_KEY_VERIFIER = 'oauth_code_verifier';
const STORAGE_KEY_PROVIDER = 'oauth_provider_id';

// Client IDs for OAuth providers (using FreeShow's registered app credentials for testing)
const PCO_CLIENT_ID = '35d1112d839d678ce3f1de730d2cff0b81038c2944b11c5e2edf03f8b43abc05';
const B1_CLIENT_ID = 'nsowldn58dk';
const DROPBOX_CLIENT_ID = 'edggy1jh5vvnxyd';

// Auth helpers
export const oauthHelper = new OAuthHelper();
export const deviceFlowHelper = new DeviceFlowHelper();

// Callback for successful authentication
let onAuthSuccess: (() => void) | null = null;

/**
 * Set the callback to be invoked after successful authentication
 */
export function setOnAuthSuccess(callback: () => void): void {
  onAuthSuccess = callback;
}

/**
 * Configure providers with their client IDs
 */
export function configureProviders(): void {
  const pcoProvider = getProvider('planningcenter') as PlanningCenterProvider | null;
  if (pcoProvider) {
    (pcoProvider.config as any).clientId = PCO_CLIENT_ID;
  }

  const b1Provider = getProvider('b1church') as B1ChurchProvider | null;
  if (b1Provider) {
    (b1Provider.config as any).clientId = B1_CLIENT_ID;
  }

  const dropboxProvider = getProvider('dropbox') as DropboxProvider | null;
  if (dropboxProvider) {
    (dropboxProvider.config as any).clientId = DROPBOX_CLIENT_ID;
  }
}

/**
 * Show authentication choice modal (OAuth vs Device Flow)
 */
export function showAuthChoiceModal(): void {
  if (!state.currentProvider) return;
  elements.modalTitle.textContent = `Connect to ${state.currentProvider.name}`;
  showModal('auth_choice');
}

/**
 * Show OAuth modal for browser-based authentication
 */
export function showOAuthModal(): void {
  if (!state.currentProvider) return;
  elements.modalTitle.textContent = `Connect to ${state.currentProvider.name}`;
  showModal('oauth');
}

/**
 * Show form login modal and focus the email field
 */
export function showFormLoginModal(): void {
  if (!state.currentProvider) return;
  elements.modalTitle.textContent = `Login to ${state.currentProvider.name}`;
  elements.loginEmail.value = '';
  elements.loginPassword.value = '';
  elements.formLoginError.classList.add('hidden');
  showModal('form_login');
  // Focus email field after modal opens
  setTimeout(() => elements.loginEmail.focus(), 100);
}

/**
 * Handle form login submission
 */
export async function handleFormLoginSubmit(): Promise<void> {
  if (!state.currentProvider) return;

  const email = elements.loginEmail.value.trim();
  const pwd = elements.loginPassword.value;

  if (!email || !pwd) {
    elements.formLoginError.textContent = 'Please enter email and password';
    elements.formLoginError.classList.remove('hidden');
    return;
  }

  showModal('processing');

  try {
    if (!state.currentProvider.performLogin) {
      showModal('error');
      elements.errorMessage.textContent = 'This provider does not support form login';
      return;
    }

    const auth = await state.currentProvider.performLogin(email, pwd);

    if (auth) {
      state.currentAuth = auth;
      state.connectedProviders.set(state.currentProvider.id, auth);
      showModal('success');

      setTimeout(() => {
        closeModal();
        onAuthSuccess?.();
      }, 1500);
    } else {
      showModal('form_login');
      elements.formLoginError.textContent = 'Login failed. Check your credentials.';
      elements.formLoginError.classList.remove('hidden');
    }
  } catch (error) {
    showModal('error');
    elements.errorMessage.textContent = `Login error: ${error}`;
  }
}

/**
 * Start OAuth PKCE redirect flow
 */
export async function startOAuthRedirect(): Promise<void> {
  if (!state.currentProvider) return;

  try {
    const codeVerifier = oauthHelper.generateCodeVerifier();
    sessionStorage.setItem(STORAGE_KEY_VERIFIER, codeVerifier);
    sessionStorage.setItem(STORAGE_KEY_PROVIDER, state.currentProvider.id);

    let url: string;
    // B1Church has its own OAuth URL format
    if (state.currentProvider.id === 'b1church') {
      const b1Provider = state.currentProvider as B1ChurchProvider;
      const result = await b1Provider.buildAuthUrl(codeVerifier, OAUTH_REDIRECT_URI);
      url = result.url;
    } else if (state.currentProvider.id === 'dropbox') {
      const dropboxProvider = state.currentProvider as DropboxProvider;
      const result = await dropboxProvider.buildAuthUrl(codeVerifier, OAUTH_REDIRECT_URI);
      url = result.url;
    } else {
      const result = await oauthHelper.buildAuthUrl(state.currentProvider.config, codeVerifier, OAUTH_REDIRECT_URI);
      url = result.url;
    }

    window.location.href = url;
  } catch (error) {
    showModal('error');
    elements.errorMessage.textContent = `Failed to start OAuth: ${error}`;
  }
}

/**
 * Handle OAuth callback after redirect
 */
export async function handleOAuthCallback(): Promise<void> {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state_param = urlParams.get('state');
  const error = urlParams.get('error');

  if (error) {
    window.history.replaceState({}, '', window.location.pathname);
    showStatus(`OAuth error: ${error}`, 'error');
    return;
  }

  if (!code) return;

  const codeVerifier = sessionStorage.getItem(STORAGE_KEY_VERIFIER);
  const providerId = sessionStorage.getItem(STORAGE_KEY_PROVIDER) || state_param;

  sessionStorage.removeItem(STORAGE_KEY_VERIFIER);
  sessionStorage.removeItem(STORAGE_KEY_PROVIDER);
  window.history.replaceState({}, '', window.location.pathname);

  if (!codeVerifier || !providerId) {
    showStatus('OAuth callback error: missing verifier or provider', 'error');
    return;
  }

  const provider = getProvider(providerId);
  if (!provider) {
    showStatus('OAuth callback error: provider not found', 'error');
    return;
  }

  state.currentProvider = provider;
  elements.modalTitle.textContent = `Connecting to ${provider.name}`;
  showModal('processing');

  try {
    let authData: ContentProviderAuthData | null;

    // B1Church now uses PKCE
    if (provider.id === 'b1church') {
      const b1Provider = provider as B1ChurchProvider;
      authData = await b1Provider.exchangeCodeForTokensWithPKCE(code, OAUTH_REDIRECT_URI, codeVerifier);
    } else if (provider.id === 'dropbox') {
      const dropboxProvider = provider as DropboxProvider;
      authData = await dropboxProvider.exchangeCodeForTokens(code, codeVerifier, OAUTH_REDIRECT_URI);
    } else {
      authData = await oauthHelper.exchangeCodeForTokens(provider.config, provider.id, code, codeVerifier, OAUTH_REDIRECT_URI);
    }

    if (!authData) {
      showModal('error');
      elements.errorMessage.textContent = 'Failed to exchange authorization code for tokens.';
      return;
    }

    state.currentAuth = authData;
    state.connectedProviders.set(provider.id, authData);
    showModal('success');

    setTimeout(() => {
      closeModal();
      onAuthSuccess?.();
    }, 1500);

  } catch (error) {
    showModal('error');
    elements.errorMessage.textContent = `Token exchange failed: ${error}`;
  }
}

/**
 * Start device authorization flow
 */
export async function startDeviceFlow(): Promise<void> {
  if (!state.currentProvider) return;

  showModal('loading');
  elements.modalTitle.textContent = `Connect to ${state.currentProvider.name}`;

  try {
    const deviceAuth = await deviceFlowHelper.initiateDeviceFlow(state.currentProvider.config);

    if (!deviceAuth) {
      showModal('error');
      elements.errorMessage.textContent = 'Failed to initiate device authorization. Please try again.';
      return;
    }

    state.deviceFlowData = deviceAuth;
    state.deviceFlowActive = true;
    state.slowDownCount = 0;

    showModal('code');
    elements.verificationUrl.href = deviceAuth.verification_uri_complete || deviceAuth.verification_uri;
    elements.verificationUrl.textContent = deviceAuth.verification_uri;
    elements.userCode.textContent = deviceAuth.user_code;

    const qrUrl = deviceAuth.verification_uri_complete || `${deviceAuth.verification_uri}?user_code=${deviceAuth.user_code}`;
    elements.qrCode.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}`;

    startPolling(deviceAuth);

  } catch (error) {
    showModal('error');
    elements.errorMessage.textContent = `Error: ${error}`;
  }
}

/**
 * Poll for device flow token
 */
export function startPolling(deviceAuth: DeviceAuthorizationResponse): void {
  if (!state.currentProvider) return;

  const baseInterval = deviceAuth.interval || 5;
  const expiresAt = Date.now() + (deviceAuth.expires_in * 1000);

  const poll = async () => {
    if (!state.deviceFlowActive || !state.currentProvider || !state.deviceFlowData) {
      return;
    }

    if (Date.now() > expiresAt) {
      state.deviceFlowActive = false;
      showModal('error');
      elements.errorMessage.textContent = 'Authorization expired. Please try again.';
      return;
    }

    try {
      const result = await deviceFlowHelper.pollDeviceFlowToken(state.currentProvider.config, state.deviceFlowData.device_code);

      if (result === null) {
        state.deviceFlowActive = false;
        showModal('error');
        elements.errorMessage.textContent = 'Authorization failed or was denied.';
        return;
      }

      if ('error' in result) {
        if (result.shouldSlowDown) {
          state.slowDownCount++;
        }

        const delay = deviceFlowHelper.calculatePollDelay(baseInterval, state.slowDownCount);
        state.pollingInterval = window.setTimeout(poll, delay);
        return;
      }

      state.deviceFlowActive = false;
      state.currentAuth = result;
      state.connectedProviders.set(state.currentProvider.id, result);

      showModal('success');

      setTimeout(() => {
        closeModal();
        onAuthSuccess?.();
      }, 1500);

    } catch (error) {
      console.error('Polling error:', error);
      const delay = deviceFlowHelper.calculatePollDelay(baseInterval, state.slowDownCount);
      state.pollingInterval = window.setTimeout(poll, delay);
    }
  };

  const initialDelay = deviceFlowHelper.calculatePollDelay(baseInterval, 0);
  state.pollingInterval = window.setTimeout(poll, initialDelay);
}

/**
 * Copy user code to clipboard
 */
export function copyUserCode(): void {
  const code = elements.userCode.textContent || '';
  navigator.clipboard.writeText(code).then(() => {
    showStatus('Code copied to clipboard!', 'success');
  }).catch(() => {
    showStatus('Failed to copy code', 'error');
  });
}

/**
 * Retry authentication
 */
export function retryAuth(): void {
  if (!state.currentProvider) {
    closeModal();
    return;
  }

  const supportsDeviceFlow = deviceFlowHelper.supportsDeviceFlow(state.currentProvider.config);
  const supportsOAuth = state.currentProvider.authTypes.includes('oauth_pkce');

  // Show choice if both OAuth and Device Flow are supported
  if (supportsDeviceFlow && supportsOAuth) {
    showAuthChoiceModal();
  } else if (supportsDeviceFlow) {
    startDeviceFlow();
  } else {
    showOAuthModal();
  }
}
