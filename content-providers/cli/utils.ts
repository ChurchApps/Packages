import chalk from 'chalk';
import Table from 'cli-table3';
import {
  ContentItem,
  ContentFile,
  Plan,
  Instructions,
  InstructionItem,
  ProviderInfo,
  isContentFolder,
} from '../src/index.js';

/**
 * Get an icon for an instruction item type
 */
function getItemTypeIcon(itemType?: string): string {
  switch (itemType) {
    case 'header':
      return '📁';
    case 'section':
    case 'lessonSection':
      return '📋';
    case 'action':
    case 'lessonAction':
      return '▶️';
    case 'addon':
    case 'lessonAddOn':
      return '➕';
    case 'file':
      return '🎬';
    case 'item':
    default:
      return '📄';
  }
}

/**
 * Display a table of content items (folders and files)
 */
export function displayContentTable(items: ContentItem[]): void {
  if (items.length === 0) {
    console.log(chalk.yellow('\n  No content found.\n'));
    return;
  }

  const table = new Table({
    head: [chalk.cyan('#'), chalk.cyan('Name'), chalk.cyan('Type')],
    style: { head: [], border: [] },
    colWidths: [5, 50, 15],
  });

  items.forEach((item, i) => {
    const icon = isContentFolder(item)
      ? '📁'
      : item.mediaType === 'video'
        ? '🎬'
        : '🖼️';
    const type = isContentFolder(item) ? 'folder' : item.mediaType;
    table.push([String(i + 1), item.title, `${icon} ${type}`]);
  });

  console.log(table.toString());
}

/**
 * Display a flat list of files (for playlist view)
 */
export function displayPlaylist(files: ContentFile[]): void {
  if (files.length === 0) {
    console.log(chalk.yellow('\n  No files in playlist.\n'));
    return;
  }

  const table = new Table({
    head: [chalk.cyan('#'), chalk.cyan('Title'), chalk.cyan('Type'), chalk.cyan('URL'), chalk.cyan('Thumbnail')],
    style: { head: [], border: [] },
    colWidths: [5, 30, 10, 40, 30],
  });

  files.forEach((file, i) => {
    const icon = file.mediaType === 'video' ? '🎬' : '🖼️';
    const url = file.url.length > 37 ? file.url.substring(0, 34) + '...' : file.url;
    const thumb = file.thumbnail
      ? (file.thumbnail.length > 27 ? file.thumbnail.substring(0, 24) + '...' : file.thumbnail)
      : chalk.dim('none');
    table.push([String(i + 1), file.title, `${icon} ${file.mediaType}`, url, thumb]);
  });

  console.log(table.toString());
}

/**
 * Display a plan with sections and presentations
 */
export function displayPlan(plan: Plan): void {
  console.log(chalk.cyan('\n' + '═'.repeat(60)));
  console.log(chalk.bold(`  ${plan.name}`));
  if (plan.description) {
    console.log(chalk.dim(`  ${plan.description}`));
  }
  console.log(`  ${plan.sections.length} sections • ${plan.allFiles.length} total files`);
  console.log(chalk.cyan('═'.repeat(60)) + '\n');

  plan.sections.forEach((section) => {
    console.log(chalk.green(`▶ SECTION: ${section.name}`));
    section.presentations.forEach((pres, i) => {
      const prefix = i === section.presentations.length - 1 ? '└─' : '├─';
      const badge =
        pres.actionType === 'play'
          ? chalk.blue('play')
          : pres.actionType === 'add-on'
            ? chalk.yellow('add-on')
            : chalk.dim('other');
      console.log(`  ${prefix} [${i + 1}] ${pres.name} (${badge}) - ${pres.files.length} files`);
    });
    console.log();
  });
}

/**
 * Display instructions hierarchy
 */
export function displayInstructions(instructions: Instructions, isExpanded: boolean = false): void {
  const viewType = isExpanded ? 'Expanded Instructions' : 'Instructions';
  const venueName = instructions.name || 'Instructions';

  const countItems = (items: InstructionItem[]): number => {
    let count = items.length;
    for (const item of items) {
      if (item.children) count += countItems(item.children);
    }
    return count;
  };

  const totalItems = countItems(instructions.items);

  console.log(chalk.cyan('\n' + '═'.repeat(60)));
  console.log(chalk.bold(`  ${venueName} (${viewType})`));
  console.log(`  ${instructions.items.length} top-level items • ${totalItems} total items`);
  console.log(chalk.cyan('═'.repeat(60)) + '\n');

  const renderItem = (item: InstructionItem, depth: number = 0): void => {
    const indent = '  '.repeat(depth + 1);
    const typeIcon = getItemTypeIcon(item.itemType);

    let line = `${indent}${typeIcon} ${item.label || 'Untitled'}`;
    if (item.itemType) {
      line += chalk.dim(` [${item.itemType}]`);
    }
    if (item.actionType) {
      line += chalk.cyan(` (${item.actionType})`);
    }
    if (item.seconds) {
      line += chalk.yellow(` ${item.seconds}s`);
    }
    console.log(line);

    if (item.thumbnail) {
      console.log(chalk.blue(`${indent}   img: ${item.thumbnail}`));
    }

    if (item.children && item.children.length > 0) {
      item.children.forEach((child) => renderItem(child, depth + 1));
    }
  };

  instructions.items.forEach((item) => renderItem(item));
  console.log();
}

/**
 * Display JSON with simple syntax highlighting
 */
export function displayJson(data: unknown, title: string): void {
  console.log(chalk.cyan(`\n─── ${title} ───\n`));
  const json = JSON.stringify(data, null, 2);
  // Simple syntax highlighting
  const highlighted = json
    .replace(/"([^"]+)":/g, (_, key) => `${chalk.cyan(`"${key}"`)}:`)
    .replace(/: "([^"]*)"/g, (_, val) => `: ${chalk.green(`"${val}"`)}`)
    .replace(/: (\d+)/g, (_, num) => `: ${chalk.yellow(num)}`)
    .replace(/: (true|false)/g, (_, bool) => `: ${chalk.magenta(bool)}`)
    .replace(/: null/g, `: ${chalk.dim('null')}`);
  console.log(highlighted);
  console.log();
}

/**
 * Display the current navigation breadcrumb
 */
export function displayBreadcrumb(providerName: string, breadcrumbTitles: string[]): void {
  const path = [providerName, ...breadcrumbTitles].join(' > ');
  console.log(chalk.dim(`\n📍 ${path}\n`));
}

/**
 * Format a provider for display in selection list
 */
export function formatProviderChoice(provider: ProviderInfo, isConnected: boolean): string {
  let badges = '';

  if (!provider.implemented) {
    badges = chalk.dim(' [Coming Soon]');
  } else if (!provider.requiresAuth) {
    badges = chalk.green(' [Public]');
  } else if (provider.authTypes.includes('device_flow')) {
    badges = chalk.blue(' [Device Flow]');
  } else if (provider.authTypes.includes('oauth_pkce')) {
    badges = chalk.yellow(' [OAuth - Web Only]');
  }

  const connected = isConnected ? chalk.green(' ✓') : '';
  return `${provider.name}${badges}${connected}`;
}

/**
 * Display a header/divider
 */
export function displayHeader(text: string): void {
  console.log(chalk.cyan('\n' + '═'.repeat(60)));
  console.log(chalk.bold(`  ${text}`));
  console.log(chalk.cyan('═'.repeat(60)) + '\n');
}

/**
 * Display a success message
 */
export function showSuccess(message: string): void {
  console.log(chalk.green(`\n✓ ${message}\n`));
}

/**
 * Display an error message
 */
export function showError(message: string): void {
  console.log(chalk.red(`\n✗ ${message}\n`));
}

/**
 * Display an info message
 */
export function showInfo(message: string): void {
  console.log(chalk.blue(`\nℹ ${message}\n`));
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
