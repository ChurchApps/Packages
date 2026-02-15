import type {
  IProvider,
  ContentProviderAuthData,
  DeviceAuthorizationResponse,
  Plan,
  Instructions,
  ContentFolder,
  ContentFile
} from "../src";

/**
 * Application state interface for the playground
 */
export interface AppState {
  currentView: 'providers' | 'browser' | 'plan' | 'instructions';
  currentProvider: IProvider | null;
  currentAuth: ContentProviderAuthData | null;
  currentPath: string;
  breadcrumbTitles: string[];
  connectedProviders: Map<string, ContentProviderAuthData | null>;
  deviceFlowActive: boolean;
  deviceFlowData: DeviceAuthorizationResponse | null;
  pollingInterval: number | null;
  slowDownCount: number;
  currentPlan: Plan | null;
  currentInstructions: Instructions | null;
  currentVenueFolder: ContentFolder | null;
  playlistQueue: { files: ContentFile[]; currentIndex: number } | null;
  currentPlaylist: ContentFile[] | null;
}

/**
 * Default application state
 */
export const state: AppState = {
  currentView: 'providers',
  currentProvider: null,
  currentAuth: null,
  currentPath: '',
  breadcrumbTitles: [],
  connectedProviders: new Map(),
  deviceFlowActive: false,
  deviceFlowData: null,
  pollingInterval: null,
  slowDownCount: 0,
  currentPlan: null,
  currentInstructions: null,
  currentVenueFolder: null,
  playlistQueue: null,
  currentPlaylist: null
};

/**
 * Interface for cached DOM element references
 */
export interface DOMElements {
  // Main views
  providersView: HTMLElement;
  docsView: HTMLElement;
  browserView: HTMLElement;
  providersGrid: HTMLElement;
  mainTabs: HTMLElement;
  contentGrid: HTMLElement;
  breadcrumb: HTMLElement;
  breadcrumbPath: HTMLElement;
  backBtn: HTMLElement;
  browserTitle: HTMLElement;
  loadingEl: HTMLElement;
  emptyEl: HTMLElement;
  statusEl: HTMLElement;

  // Device flow modal
  modal: HTMLElement;
  modalTitle: HTMLElement;
  modalClose: HTMLElement;
  modalLoading: HTMLElement;
  modalCode: HTMLElement;
  modalSuccess: HTMLElement;
  modalError: HTMLElement;
  verificationUrl: HTMLAnchorElement;
  userCode: HTMLElement;
  copyCodeBtn: HTMLElement;
  qrCode: HTMLImageElement;
  errorMessage: HTMLElement;
  retryBtn: HTMLElement;

  // OAuth section
  oauthSection: HTMLElement;
  oauthSigninBtn: HTMLElement;
  oauthProcessing: HTMLElement;

  // Auth choice section
  authChoiceSection: HTMLElement;
  authChoiceDeviceBtn: HTMLElement;
  authChoiceOAuthBtn: HTMLElement;

  // Form login section
  formLoginSection: HTMLElement;
  loginEmail: HTMLInputElement;
  loginPassword: HTMLInputElement;
  formLoginBtn: HTMLElement;
  formLoginError: HTMLElement;
}

/**
 * Cached DOM element references (populated by initElements)
 */
export let elements: DOMElements;

/**
 * Initialize and cache all DOM element references
 * Call this once after DOM is ready
 */
export function initElements(): void {
  elements = {
    // Main views
    providersView: document.getElementById('providers-view')!,
    docsView: document.getElementById('docs-view')!,
    browserView: document.getElementById('browser-view')!,
    providersGrid: document.getElementById('providers-grid')!,
    mainTabs: document.getElementById('main-tabs')!,
    contentGrid: document.getElementById('content-grid')!,
    breadcrumb: document.getElementById('breadcrumb')!,
    breadcrumbPath: document.getElementById('breadcrumb-path')!,
    backBtn: document.getElementById('back-btn')!,
    browserTitle: document.getElementById('browser-title')!,
    loadingEl: document.getElementById('loading')!,
    emptyEl: document.getElementById('empty')!,
    statusEl: document.getElementById('status')!,

    // Device flow modal
    modal: document.getElementById('device-flow-modal')!,
    modalTitle: document.getElementById('modal-title')!,
    modalClose: document.getElementById('modal-close')!,
    modalLoading: document.getElementById('device-flow-loading')!,
    modalCode: document.getElementById('device-flow-code')!,
    modalSuccess: document.getElementById('device-flow-success')!,
    modalError: document.getElementById('device-flow-error')!,
    verificationUrl: document.getElementById('verification-url')! as HTMLAnchorElement,
    userCode: document.getElementById('user-code')!,
    copyCodeBtn: document.getElementById('copy-code-btn')!,
    qrCode: document.getElementById('qr-code')! as HTMLImageElement,
    errorMessage: document.getElementById('error-message')!,
    retryBtn: document.getElementById('retry-btn')!,

    // OAuth section
    oauthSection: document.getElementById('oauth-flow-section')!,
    oauthSigninBtn: document.getElementById('oauth-signin-btn')!,
    oauthProcessing: document.getElementById('oauth-processing')!,

    // Auth choice section
    authChoiceSection: document.getElementById('auth-choice-section')!,
    authChoiceDeviceBtn: document.getElementById('auth-choice-device')!,
    authChoiceOAuthBtn: document.getElementById('auth-choice-oauth')!,

    // Form login section
    formLoginSection: document.getElementById('form-login-section')!,
    loginEmail: document.getElementById('login-email')! as HTMLInputElement,
    loginPassword: document.getElementById('login-password')! as HTMLInputElement,
    formLoginBtn: document.getElementById('form-login-btn')!,
    formLoginError: document.getElementById('form-login-error')!
  };
}
