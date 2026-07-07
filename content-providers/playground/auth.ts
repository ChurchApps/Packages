import { state, elements } from './state';
import { showModal, closeModal, showStatus } from './ui';
import { getProvider, ContentProviderAuthData, DeviceAuthorizationResponse } from '../src';
import { OAuthHelper, DeviceFlowHelper } from '../src/helpers';

const OAUTH_REDIRECT_URI = `${window.location.origin}${window.location.pathname}`;
const STORAGE_KEY_VERIFIER = 'oauth_code_verifier';
const STORAGE_KEY_PROVIDER = 'oauth_provider_id';

const PCO_CLIENT_ID = '35d1112d839d678ce3f1de730d2cff0b81038c2944b11c5e2edf03f8b43abc05';
const B1_CLIENT_ID = 'nsowldn58dk';
const DROPBOX_CLIENT_ID = 'edggy1jh5vvnxyd';

export const oauthHelper = new OAuthHelper();
export const deviceFlowHelper = new DeviceFlowHelper();

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
  const clientIds: Record<string, string> = { planningcenter: PCO_CLIENT_ID, b1church: B1_CLIENT_ID, dropbox: DROPBOX_CLIENT_ID };
  for (const [id, clientId] of Object.entries(clientIds)) {
    const provider = getProvider(id);
    if (provider) (provider.config as any).clientId = clientId;
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

    const result = state.currentProvider.buildAuthUrl
      ? await state.currentProvider.buildAuthUrl(codeVerifier, OAUTH_REDIRECT_URI)
      : await oauthHelper.buildAuthUrl(state.currentProvider.config, codeVerifier, OAUTH_REDIRECT_URI);

    window.location.href = result.url;
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
    const authData: ContentProviderAuthData | null = provider.exchangeCodeForTokens
      ? await provider.exchangeCodeForTokens(code, codeVerifier, OAUTH_REDIRECT_URI)
      : await oauthHelper.exchangeCodeForTokens(provider.config, provider.id, code, codeVerifier, OAUTH_REDIRECT_URI);

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

  if (supportsDeviceFlow && supportsOAuth) {
    showAuthChoiceModal();
  } else if (supportsDeviceFlow) {
    startDeviceFlow();
  } else {
    showOAuthModal();
  }
}
