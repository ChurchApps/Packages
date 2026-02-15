#!/usr/bin/env node

import { select, confirm, input, password } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import {
  getAvailableProviders,
  getProvider,
  IProvider,
  ContentFolder,
  ContentItem,
  ContentFile,
  ContentProviderAuthData,
  isContentFolder,
  isContentFile,
  ProviderInfo,
  DeviceFlowHelper,
} from '../src/index.js';

// Device flow helper for providers that support it
const deviceFlowHelper = new DeviceFlowHelper();
import {
  displayContentTable,
  displayPlaylist,
  displayPlan,
  displayInstructions,
  displayJson,
  displayBreadcrumb,
  formatProviderChoice,
  displayHeader,
  showSuccess,
  showError,
  showInfo,
  sleep,
} from './utils.js';

// App state
interface CliState {
  currentProvider: IProvider | null;
  currentAuth: ContentProviderAuthData | null;
  currentPath: string;
  breadcrumbTitles: string[];
  connectedProviders: Map<string, ContentProviderAuthData | null>;
}

const state: CliState = {
  currentProvider: null,
  currentAuth: null,
  currentPath: '',
  breadcrumbTitles: [],
  connectedProviders: new Map(),
};

/**
 * Check if a provider can be used in CLI (public, device flow, or form login)
 */
function canUseInCli(provider: ProviderInfo): boolean {
  if (!provider.implemented) return false;
  if (!provider.requiresAuth) return true;
  if (provider.authTypes.includes('device_flow')) return true;
  if (provider.authTypes.includes('form_login')) return true;
  return false;
}

/**
 * Main menu
 */
async function mainMenu(): Promise<void> {
  displayHeader('Content Provider Helper - CLI Playground');

  while (true) {
    const choices = [
      { name: 'Select Provider', value: 'select' },
    ];

    if (state.currentProvider) {
      choices.push({ name: `Browse ${state.currentProvider.name}`, value: 'browse' });
      choices.push({ name: `Disconnect from ${state.currentProvider.name}`, value: 'disconnect' });
    }

    choices.push({ name: 'Exit', value: 'exit' });

    const action = await select({
      message: 'What would you like to do?',
      choices,
    });

    switch (action) {
      case 'select':
        await selectProvider();
        break;
      case 'browse':
        await browseContent();
        break;
      case 'disconnect':
        disconnect();
        break;
      case 'exit':
        console.log(chalk.dim('\nGoodbye!\n'));
        process.exit(0);
    }
  }
}

/**
 * Provider selection
 */
async function selectProvider(): Promise<void> {
  const providers = getAvailableProviders();

  const choices = providers.map((p) => ({
    name: formatProviderChoice(p, state.connectedProviders.has(p.id)),
    value: p.id,
    disabled: !p.implemented ? 'Coming soon' : (!canUseInCli(p) ? 'OAuth required (use web playground)' : false),
  }));

  choices.push({ name: chalk.dim('← Back'), value: 'back', disabled: false });

  const providerId = await select({
    message: 'Select a content provider:',
    choices,
  });

  if (providerId === 'back') return;

  await handleProviderSelection(providerId);
}

/**
 * Handle provider selection - connect and navigate
 */
async function handleProviderSelection(providerId: string): Promise<void> {
  const provider = getProvider(providerId);
  if (!provider) {
    showError('Provider not found');
    return;
  }

  // Already connected?
  if (state.connectedProviders.has(providerId)) {
    state.currentProvider = provider;
    state.currentAuth = state.connectedProviders.get(providerId) || null;
    state.currentPath = '';
    state.breadcrumbTitles = [];
    showSuccess(`Connected to ${provider.name}`);
    await browseContent();
    return;
  }

  // Check if auth is needed
  if (!provider.requiresAuth) {
    // Public API - no auth needed
    state.currentProvider = provider;
    state.currentAuth = null;
    state.connectedProviders.set(providerId, null);
    state.currentPath = '';
    state.breadcrumbTitles = [];
    showSuccess(`Connected to ${provider.name} (public API)`);
    await browseContent();
    return;
  }

  // Device flow auth
  if (provider.supportsDeviceFlow()) {
    const auth = await handleDeviceFlow(provider);
    if (auth) {
      state.currentProvider = provider;
      state.currentAuth = auth;
      state.connectedProviders.set(providerId, auth);
      state.currentPath = '';
      state.breadcrumbTitles = [];
      showSuccess(`Authenticated with ${provider.name}`);
      await browseContent();
    }
    return;
  }

  // Form login auth
  if (provider.authTypes.includes('form_login')) {
    const auth = await handleFormLogin(provider);
    if (auth) {
      state.currentProvider = provider;
      state.currentAuth = auth;
      state.connectedProviders.set(providerId, auth);
      state.currentPath = '';
      state.breadcrumbTitles = [];
      showSuccess(`Logged in to ${provider.name}`);
      await browseContent();
    }
    return;
  }

  // OAuth only - not supported in CLI
  showError(`${provider.name} requires OAuth authentication. Please use the web playground.`);
}

/**
 * Handle device flow authentication
 */
async function handleDeviceFlow(provider: IProvider): Promise<ContentProviderAuthData | null> {
  const spinner = ora('Initiating device authorization...').start();

  const deviceAuth = await deviceFlowHelper.initiateDeviceFlow(provider.config);
  if (!deviceAuth) {
    spinner.fail('Failed to initiate device flow');
    return null;
  }

  spinner.stop();

  console.log(chalk.cyan('\n' + '═'.repeat(50)));
  console.log(chalk.bold('  Device Authorization Required'));
  console.log(chalk.cyan('═'.repeat(50)) + '\n');
  console.log(`  1. Open this URL in your browser:`);
  console.log(chalk.underline.blue(`     ${deviceAuth.verification_uri}`));
  console.log();
  console.log(`  2. Enter this code:`);
  console.log(chalk.bold.yellow(`     ${deviceAuth.user_code}`));
  console.log();

  const pollSpinner = ora('Waiting for authorization...').start();

  let slowDownCount = 0;
  const expiresAt = Date.now() + deviceAuth.expires_in * 1000;
  const baseInterval = deviceAuth.interval || 5;

  while (Date.now() < expiresAt) {
    const delay = deviceFlowHelper.calculatePollDelay(baseInterval, slowDownCount);
    await sleep(delay);

    const result = await deviceFlowHelper.pollDeviceFlowToken(provider.config, deviceAuth.device_code);

    if (result === null) {
      pollSpinner.fail('Authorization denied or expired');
      return null;
    }

    if ('error' in result) {
      if (result.shouldSlowDown) slowDownCount++;
      continue;
    }

    // Success!
    pollSpinner.succeed('Authorization successful!');
    return result;
  }

  pollSpinner.fail('Authorization expired');
  return null;
}

/**
 * Handle form-based login authentication
 */
async function handleFormLogin(provider: IProvider): Promise<ContentProviderAuthData | null> {
  console.log(chalk.cyan('\n' + '═'.repeat(50)));
  console.log(chalk.bold(`  Login to ${provider.name}`));
  console.log(chalk.cyan('═'.repeat(50)) + '\n');

  const username = await input({
    message: 'Email/Username:',
    validate: (value) => value.length > 0 || 'Email is required',
  });

  const pwd = await password({
    message: 'Password:',
    validate: (value) => value.length > 0 || 'Password is required',
  });

  const spinner = ora('Logging in...').start();

  try {
    // Call provider's performLogin method
    const providerAny = provider as any;
    if (typeof providerAny.performLogin !== 'function') {
      spinner.fail('This provider does not support form login');
      return null;
    }

    const auth = await providerAny.performLogin(username, pwd);

    if (auth) {
      spinner.succeed('Login successful!');
      return auth;
    } else {
      spinner.fail('Login failed. Check your credentials.');
      return null;
    }
  } catch (error) {
    spinner.fail(`Login error: ${error}`);
    return null;
  }
}

/**
 * Disconnect from current provider
 */
function disconnect(): void {
  if (state.currentProvider) {
    const name = state.currentProvider.name;
    state.connectedProviders.delete(state.currentProvider.id);
    state.currentProvider = null;
    state.currentAuth = null;
    state.currentPath = '';
    state.breadcrumbTitles = [];
    showInfo(`Disconnected from ${name}`);
  }
}

/**
 * Go back one level in the path
 */
function goBack(): void {
  if (!state.currentPath) return;

  // Remove last segment from path
  const segments = state.currentPath.split('/').filter(Boolean);
  segments.pop();
  state.currentPath = segments.length > 0 ? '/' + segments.join('/') : '';

  // Remove last breadcrumb title
  state.breadcrumbTitles.pop();
}

/**
 * Browse content
 */
async function browseContent(): Promise<void> {
  if (!state.currentProvider) {
    showError('No provider selected');
    return;
  }

  const spinner = ora('Loading content...').start();

  try {
    const items = await state.currentProvider.browse(state.currentPath || null, state.currentAuth);
    spinner.stop();

    if (!items || items.length === 0) {
      showInfo('No content found');
      if (state.currentPath) {
        await handleBackOrMenu();
      }
      return;
    }

    displayBreadcrumb(state.currentProvider.name, state.breadcrumbTitles);
    displayContentTable(items);

    await handleContentSelection(items);
  } catch (error) {
    spinner.stop();
    showError(`Failed to load content: ${error}`);
  }
}

/**
 * Handle content item selection
 */
async function handleContentSelection(items: ContentItem[]): Promise<void> {
  const choices: Array<{ name: string; value: string }> = items.map((item, i) => ({
    name: `${i + 1}. ${isContentFolder(item) ? '📁' : item.mediaType === 'video' ? '🎬' : '🖼️'} ${item.title}`,
    value: String(i),
  }));

  if (state.currentPath) {
    choices.push({ name: '← Back', value: 'back' });
  }
  choices.push({ name: '🏠 Main Menu', value: 'menu' });
  choices.push({ name: '📋 View as JSON', value: 'json' });

  const selection = await select({
    message: 'Select an item:',
    choices,
  });

  if (selection === 'back') {
    goBack();
    await browseContent();
    return;
  }

  if (selection === 'menu') {
    return;
  }

  if (selection === 'json') {
    displayJson(items, 'Content Items');
    await browseContent();
    return;
  }

  const selectedItem = items[parseInt(selection, 10)];

  if (isContentFolder(selectedItem)) {
    await handleFolderSelection(selectedItem);
  } else if (isContentFile(selectedItem)) {
    await handleFileSelection(selectedItem);
  }
}

/**
 * Handle folder selection - check for venue or navigate
 */
async function handleFolderSelection(folder: ContentFolder): Promise<void> {
  // Check if this is a leaf folder (offers view modes)
  // Providers set isLeaf: true to indicate the bottom of the browse tree
  const isLeafFolder = folder.isLeaf;

  if (isLeafFolder && state.currentProvider) {
    await showViewModeMenu(folder);
  } else {
    // Navigate into the folder using its path
    state.currentPath = folder.path;
    state.breadcrumbTitles.push(folder.title);
    await browseContent();
  }
}

/**
 * Show view mode selection for venue folders
 */
async function showViewModeMenu(folder: ContentFolder): Promise<void> {
  if (!state.currentProvider) return;

  const caps = state.currentProvider.capabilities;
  const path = folder.path;
  const title = folder.title;

  const choices: Array<{ name: string; value: string; disabled?: string | boolean }> = [
    {
      name: '📋 Playlist - Simple list of media files',
      value: 'playlist',
      disabled: !caps.playlist && !caps.browse && 'Not supported',
    },
    {
      name: '🎬 Presentations - Structured sections with files',
      value: 'presentations',
      disabled: !caps.presentations && 'Not supported',
    },
    {
      name: '📖 Instructions - Full hierarchy with all actions',
      value: 'instructions',
      disabled: !caps.instructions && 'Not supported',
    },
    { name: '← Cancel', value: 'cancel' },
  ];

  const viewMode = await select({
    message: `Choose view mode for "${title}":`,
    choices,
  });

  switch (viewMode) {
    case 'playlist':
      await showPlaylistView(path, title);
      break;
    case 'presentations':
      await showPresentationsView(path, title);
      break;
    case 'instructions':
      await showInstructionsView(path, title);
      break;
    case 'cancel':
      await browseContent();
      break;
  }
}

/**
 * Show playlist view
 */
async function showPlaylistView(path: string, title: string): Promise<void> {
  if (!state.currentProvider) return;

  const spinner = ora('Loading playlist...').start();

  try {
    // Try getPlaylist first, fall back to browse
    let files: ContentFile[] | null = null;

    if (state.currentProvider.capabilities.playlist && state.currentProvider.getPlaylist) {
      files = await state.currentProvider.getPlaylist(path, state.currentAuth);
    }

    if (!files) {
      // Fall back to browse and filter files
      const items = await state.currentProvider.browse(path, state.currentAuth);
      files = items?.filter(isContentFile) || [];
    }

    spinner.stop();

    if (files.length === 0) {
      showInfo('No files in playlist');
    } else {
      state.currentPath = path;
      state.breadcrumbTitles.push(title);
      displayBreadcrumb(state.currentProvider.name, state.breadcrumbTitles);
      displayPlaylist(files);
    }

    await handlePlaylistMenu(files);
  } catch (error) {
    spinner.stop();
    showError(`Failed to load playlist: ${error}`);
  }
}

/**
 * Handle playlist menu actions
 */
async function handlePlaylistMenu(files: ContentFile[]): Promise<void> {
  const choices = [
    { name: '📋 View as JSON', value: 'json' },
    { name: '← Back', value: 'back' },
    { name: '🏠 Main Menu', value: 'menu' },
  ];

  const action = await select({
    message: 'What next?',
    choices,
  });

  if (action === 'json') {
    displayJson(files, 'Playlist Files');
    await handlePlaylistMenu(files);
    return;
  }

  if (action === 'back') {
    goBack();
    await browseContent();
    return;
  }

  // menu - return to main
}

/**
 * Show presentations view
 */
async function showPresentationsView(path: string, title: string): Promise<void> {
  if (!state.currentProvider) return;

  const spinner = ora('Loading presentations...').start();

  try {
    const plan = await state.currentProvider.getPresentations(path, state.currentAuth);
    spinner.stop();

    if (!plan) {
      showError('This provider does not support presentations view');
      return;
    }

    state.currentPath = path;
    state.breadcrumbTitles.push(title);
    displayBreadcrumb(state.currentProvider.name, state.breadcrumbTitles);
    displayPlan(plan);

    await handlePlanMenu(plan);
  } catch (error) {
    spinner.stop();
    showError(`Failed to load presentations: ${error}`);
  }
}

/**
 * Handle plan menu actions
 */
async function handlePlanMenu(plan: any): Promise<void> {
  const choices = [
    { name: '📋 View as JSON', value: 'json' },
    { name: '← Back', value: 'back' },
    { name: '🏠 Main Menu', value: 'menu' },
  ];

  const action = await select({
    message: 'What next?',
    choices,
  });

  if (action === 'json') {
    displayJson(plan, 'Plan JSON');
    await handlePlanMenu(plan);
    return;
  }

  if (action === 'back') {
    goBack();
    await browseContent();
    return;
  }

  // menu - return to main
}

/**
 * Show instructions view
 */
async function showInstructionsView(path: string, title: string): Promise<void> {
  if (!state.currentProvider) return;

  const spinner = ora('Loading instructions...').start();

  try {
    const instructions = state.currentProvider.getInstructions
      ? await state.currentProvider.getInstructions(path, state.currentAuth)
      : null;

    spinner.stop();

    if (!instructions) {
      showError('This provider does not support instructions view');
      return;
    }

    state.currentPath = path;
    state.breadcrumbTitles.push(title);
    displayBreadcrumb(state.currentProvider.name, state.breadcrumbTitles);
    displayInstructions(instructions, true);

    await handleInstructionsMenu(instructions);
  } catch (error) {
    spinner.stop();
    showError(`Failed to load instructions: ${error}`);
  }
}

/**
 * Handle instructions menu actions
 */
async function handleInstructionsMenu(instructions: any): Promise<void> {
  const choices = [
    { name: '📋 View as JSON', value: 'json' },
    { name: '← Back', value: 'back' },
    { name: '🏠 Main Menu', value: 'menu' },
  ];

  const action = await select({
    message: 'What next?',
    choices,
  });

  if (action === 'json') {
    displayJson(instructions, 'Instructions JSON');
    await handleInstructionsMenu(instructions);
    return;
  }

  if (action === 'back') {
    goBack();
    await browseContent();
    return;
  }

  // menu - return to main
}

/**
 * Handle file selection
 */
async function handleFileSelection(file: ContentFile): Promise<void> {
  console.log(chalk.cyan('\n' + '─'.repeat(50)));
  console.log(chalk.bold(`  ${file.title}`));
  console.log(chalk.cyan('─'.repeat(50)));
  console.log(`  Type: ${file.mediaType}`);
  console.log(`  URL: ${chalk.underline(file.url)}`);
  if (file.downloadUrl) console.log(`  Download: ${chalk.underline(file.downloadUrl)}`);
  if (file.muxPlaybackId) console.log(`  Mux ID: ${file.muxPlaybackId}`);
  console.log();

  const choices = [
    { name: '📋 View as JSON', value: 'json' },
    { name: '← Back to list', value: 'back' },
  ];

  const action = await select({
    message: 'What next?',
    choices,
  });

  if (action === 'json') {
    displayJson(file, 'File Details');
  }

  await browseContent();
}

/**
 * Handle back or menu when at empty content
 */
async function handleBackOrMenu(): Promise<void> {
  const choices = [];

  if (state.currentPath) {
    choices.push({ name: '← Back', value: 'back' });
  }
  choices.push({ name: '🏠 Main Menu', value: 'menu' });

  const action = await select({
    message: 'What would you like to do?',
    choices,
  });

  if (action === 'back') {
    goBack();
    await browseContent();
  }
  // else return to main menu
}

// Start the CLI
console.clear();
mainMenu().catch((error) => {
  if (error.name === 'ExitPromptError') {
    // User pressed Ctrl+C
    console.log(chalk.dim('\nGoodbye!\n'));
    process.exit(0);
  }
  console.error(chalk.red('Error:'), error);
  process.exit(1);
});
