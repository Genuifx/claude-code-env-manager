/**
 * Terminal UI Components - Claude Code Style
 * 简洁、专业、低调
 */
import chalk from 'chalk';
import Table from 'cli-table3';
import type { PermissionModeName, UsageStats, TokenUsageWithCost } from './types.js';
import { PERMISSION_PRESETS } from './presets.js';
import { formatTokens, formatCost, getTotalTokens } from './usage.js';

// 颜色主题 - 柔和但有对比度
const theme = {
  primary: chalk.hex('#89B4FA'),   // 亮蓝
  accent: chalk.hex('#CBA6F7'),    // 亮紫
  success: chalk.hex('#A6E3A1'),   // 亮绿
  warning: chalk.hex('#F9E2AF'),   // 亮黄
  danger: chalk.hex('#F38BA8'),    // 亮红
  text: chalk.white,
  muted: chalk.hex('#6C7086'),     // 中灰
  dim: chalk.hex('#45475A'),       // 暗灰
};

// Spinner 动画帧 (经典 braille dots spinner)
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerIndex = 0;
let spinnerInterval: ReturnType<typeof setInterval> | null = null;

// 获取当前 spinner 帧
export const getSpinnerFrame = (): string => {
  return theme.primary(SPINNER_FRAMES[spinnerIndex]);
};

// 启动 spinner 动画
export const startSpinner = (onFrame: () => void): void => {
  if (spinnerInterval) return;
  spinnerInterval = setInterval(() => {
    spinnerIndex = (spinnerIndex + 1) % SPINNER_FRAMES.length;
    onFrame();
  }, 80);
};

// 停止 spinner 动画
export const stopSpinner = (): void => {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }
};

// CCEM Logo - Claude Code 风格 + 绅士帽
export const renderLogo = (): string => {
  const face = chalk.hex('#89B4FA');     // 脸 - 亮蓝
  const hat = chalk.hex('#45475A');      // 帽子 - 暗灰
  const spark = chalk.hex('#6C7086');    // 星星 - 中灰

  const lines = [
    `   ${spark('*')}   ${hat('▄█▄')}  ${spark('*')}`,
    `   ${spark('*')}  ${hat('▀▀▀▀▀')} ${spark('*')}`,
    `  ${spark('*')} ${face('▐▛█████▜▌')} ${spark('*')}`,
    ` ${spark('*')} ${face('▝▜███████▛▘')} ${spark('*')}`,
    `  ${spark('*')}  ${face('▘▘   ▝▝')}  ${spark('*')}`,
  ];
  return lines.join('\n');
};

// 获取终端宽度
const getTerminalWidth = (): number => {
  return process.stdout.columns || 80;
};

// Logo + 环境信息面板 横向布局
export const renderLogoWithEnvPanel = (
  envName: string,
  env: {
    ANTHROPIC_BASE_URL?: string;
    ANTHROPIC_API_KEY?: string;
    ANTHROPIC_MODEL?: string;
    ANTHROPIC_SMALL_FAST_MODEL?: string;
  },
  defaultMode?: PermissionModeName | null
): string => {
  const face = chalk.hex('#89B4FA');     // 脸 - 亮蓝
  const hat = chalk.hex('#45475A');      // 帽子 - 暗灰
  const spark = chalk.hex('#6C7086');    // 星星 - 中灰

  const termWidth = getTerminalWidth();
  const isNarrow = termWidth < 60;
  const isVeryNarrow = termWidth < 45;

  // 右侧环境信息
  const title = theme.primary('CCEM') + '   ' + theme.muted('Claude Code Env Manager');
  const titleShort = theme.primary('CCEM');
  const envLabel = theme.muted('Env:   ') + theme.primary(envName);

  // 构建环境变量显示
  const baseUrl = env.ANTHROPIC_BASE_URL || '-';
  const model = env.ANTHROPIC_MODEL || '-';
  const fastModel = env.ANTHROPIC_SMALL_FAST_MODEL || '-';
  const apiKey = env.ANTHROPIC_API_KEY ? env.ANTHROPIC_API_KEY.slice(0, 2) + '••••' + env.ANTHROPIC_API_KEY.slice(-4) : '-';

  // 截断过长的值
  const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max - 3) + '...' : s;

  // URL 掩码：显示协议+域名前几位...域名后几位+端口/路径
  const maskUrl = (url: string, max: number): string => {
    if (url.length <= max) return url;
    try {
      const parsed = new URL(url);
      const protocol = parsed.protocol + '//';
      const host = parsed.host;
      const path = parsed.pathname + parsed.search;

      // 保留协议 + 域名前8位 + ... + 域名后4位 + 路径前几位
      const hostStart = host.slice(0, 8);
      const hostEnd = host.slice(-4);
      const pathPart = path.length > 10 ? path.slice(0, 7) + '...' : path;

      return `${protocol}${hostStart}...${hostEnd}${pathPart}`;
    } catch {
      // 非标准 URL，直接截断
      return truncate(url, max);
    }
  };

  // 统一标签宽度为 7 字符（含冒号和空格）
  const labelWidth = 7;

  let envLines: string[];
  if (isNarrow) {
    envLines = [
      envLabel,
      theme.muted('Model:'.padEnd(labelWidth)) + theme.dim(truncate(model, 25)),
      theme.muted('Key:'.padEnd(labelWidth)) + theme.dim(apiKey),
    ];
  } else {
    envLines = [
      envLabel + (defaultMode && PERMISSION_PRESETS[defaultMode] ? '  ' + theme.accent(`[${PERMISSION_PRESETS[defaultMode].name}]`) : ''),
      theme.muted('URL:'.padEnd(labelWidth)) + theme.dim(maskUrl(baseUrl, 40)),
      theme.muted('Model:'.padEnd(labelWidth)) + theme.dim(truncate(model, 15)) + '  ' + theme.muted('Fast:'.padEnd(labelWidth)) + theme.dim(truncate(fastModel, 15)),
      theme.muted('Key:'.padEnd(labelWidth)) + theme.dim(apiKey),
    ];
  }

  const lines: string[] = [];

  if (isVeryNarrow) {
    // 非常窄：纯垂直布局
    lines.push(`   ${spark('*')}   ${hat('▄█▄')}  ${spark('*')}`);
    lines.push(`  ${spark('*')} ${face('▐▛█████▜▌')} ${spark('*')}`);
    lines.push(` ${spark('*')} ${face('▝▜███████▛▘')} ${spark('*')}`);
    lines.push(`  ${spark('*')}  ${face('▘▘   ▝▝')}  ${spark('*')}`);
    lines.push('');
    lines.push(titleShort);
    lines.push('');
    envLines.forEach(line => lines.push(line));
  } else {
    // 横向布局
    const gap = isNarrow ? '  ' : '    ';

    // 第一行: 帽子 + title
    lines.push('');
    lines.push(`       ${hat('▄██▄')}      ${gap}${isNarrow ? titleShort : title}`);
    // 第二行: 脸上部 + env[0]
    lines.push(`  ${spark('*')} ${face('▐▛█████▜▌')} ${spark('*')}  ${gap}${envLines[0] || ''}`);
    // 第三行: 脸下部 + env[1]
    lines.push(` ${spark('*')} ${face('▝▜███████▛▘')} ${spark('*')} ${gap}${envLines[1] || ''}`);
    // 第四行: 底部 + env[2]
    lines.push(`  ${spark('*')}  ${face('▘▘   ▝▝')}  ${spark('*')}  ${gap}${envLines[2] || ''}`);
    // 第五行（宽屏）: 空白 + env[3]（19 字符宽度与 logo 对齐）
    if (envLines[3]) {
      lines.push(`                 ${gap}${envLines[3]}`);
    }
  }

  return lines.join('\n');
};

// 底部 Usage 信息行
export const renderUsageLine = (stats: UsageStats | null, loading: boolean): string => {
  if (loading) {
    return theme.muted(' Usage: ') + getSpinnerFrame() + theme.dim(' Loading...');
  }

  if (!stats) {
    return theme.muted(' Usage: ') + theme.dim('No data');
  }

  const termWidth = getTerminalWidth();
  const isNarrow = termWidth < 70;

  const todayTokens = getTotalTokens(stats.today);
  const weekTokens = getTotalTokens(stats.week);
  const totalTokens = getTotalTokens(stats.total);

  if (isNarrow) {
    // 窄屏：简化显示
    return theme.muted(' Usage: ') +
      theme.text('Today ') + theme.primary(formatTokens(todayTokens)) +
      theme.dim(' | ') +
      theme.text('Week ') + theme.primary(formatTokens(weekTokens)) +
      theme.dim(' | ') +
      theme.text('Total ') + theme.primary(formatTokens(totalTokens));
  }

  // 宽屏：完整显示
  return theme.muted(' Usage: ') +
    theme.text('Today ') + theme.primary(formatTokens(todayTokens).padStart(6)) + theme.dim(` (${formatCost(stats.today.cost)})`) +
    theme.dim('  |  ') +
    theme.text('Week ') + theme.primary(formatTokens(weekTokens).padStart(6)) + theme.dim(` (${formatCost(stats.week.cost)})`) +
    theme.dim('  |  ') +
    theme.text('Total ') + theme.primary(formatTokens(totalTokens).padStart(6)) + theme.dim(` (${formatCost(stats.total.cost)})`);
};

// Header
export const renderCompactHeader = (): string => {
  const width = process.stdout.columns || 80;
  return theme.dim('─'.repeat(width));
};

// 环境信息面板
export const renderEnvPanel = (
  envName: string,
  env: {
    ANTHROPIC_BASE_URL?: string;
    ANTHROPIC_API_KEY?: string;
    ANTHROPIC_MODEL?: string;
    ANTHROPIC_SMALL_FAST_MODEL?: string;
  },
  defaultMode?: PermissionModeName | null
): string => {
  const lines: string[] = [];

  lines.push(theme.muted('Environment: ') + theme.primary(envName));
  lines.push('');

  const vars = [
    { key: 'Base URL', value: env.ANTHROPIC_BASE_URL || '-' },
    { key: 'Model', value: env.ANTHROPIC_MODEL || '-' },
    { key: 'Fast Model', value: env.ANTHROPIC_SMALL_FAST_MODEL || '-' },
    { key: 'API Key', value: env.ANTHROPIC_API_KEY ? env.ANTHROPIC_API_KEY.slice(0, 2) + '••••' + env.ANTHROPIC_API_KEY.slice(-4) : '-' },
  ];

  vars.forEach(({ key, value }) => {
    const displayValue = value.length > 45 ? value.slice(0, 42) + '...' : value;
    lines.push(theme.muted(key.padEnd(12)) + theme.dim(displayValue));
  });

  if (defaultMode && PERMISSION_PRESETS[defaultMode]) {
    lines.push('');
    lines.push(theme.muted('Mode        ') + theme.accent(PERMISSION_PRESETS[defaultMode].name));
  }

  return lines.join('\n');
};

// 主菜单选项
export const getMainMenuChoices = (defaultMode: PermissionModeName | null) => {
  let startLabel = 'Start Claude Code';
  if (defaultMode && PERMISSION_PRESETS[defaultMode]) {
    startLabel = `Start Claude Code ${theme.muted(`(${PERMISSION_PRESETS[defaultMode].name})`)}`;
  }

  return [
    { name: theme.success(startLabel), value: 'start', short: 'Start' },
    { name: theme.primary('Switch Environment'), value: 'switch', short: 'Switch' },
    { name: theme.primary('Permission Mode'), value: 'perm', short: 'Permission' },
    { name: theme.accent('View Usage'), value: 'usage', short: 'Usage' },
    { name: theme.text('Set Default Mode'), value: 'setDefault', short: 'Default' },
    { name: theme.muted('Exit'), value: 'exit', short: 'Exit' },
  ];
};

// 权限模式颜色
const modeColors: Record<PermissionModeName, (s: string) => string> = {
  yolo: theme.danger,
  dev: theme.success,
  readonly: theme.primary,
  safe: theme.warning,
  ci: theme.accent,
  audit: theme.primary,
};

// 权限模式选项
export const getPermModeChoices = (currentMode?: PermissionModeName | null, showCurrent = false) => {
  const modes: PermissionModeName[] = ['yolo', 'dev', 'readonly', 'safe', 'ci', 'audit'];

  const choices = modes.map(mode => {
    const preset = PERMISSION_PRESETS[mode];
    const colorFn = modeColors[mode];
    const isCurrent = showCurrent && mode === currentMode;
    const tag = isCurrent ? theme.success(' *') : '';

    return {
      name: colorFn(preset.name.padEnd(12)) + theme.muted(preset.description) + tag,
      value: mode,
      short: preset.name,
    };
  });

  if (showCurrent) {
    choices.push({
      name: theme.muted('Clear default'),
      value: 'clear',
      short: 'Clear',
    });
  }

  choices.push({
    name: theme.muted('Back'),
    value: 'back',
    short: 'Back',
  });

  return choices;
};

// 环境列表选项
export const getEnvChoices = (registries: Record<string, unknown>, current: string) => {
  return Object.keys(registries).map(name => {
    const isCurrent = name === current;
    const tag = isCurrent ? theme.success(' *') : '';

    return {
      name: (isCurrent ? theme.primary(name) : theme.text(name)) + tag,
      value: name,
      short: name,
    };
  });
};

// 状态消息
export const msg = {
  success: (text: string) => console.log(theme.success('✓ ') + theme.text(text)),
  error: (text: string) => console.log(theme.danger('✗ ') + theme.text(text)),
  warning: (text: string) => console.log(theme.warning('! ') + theme.text(text)),
  info: (text: string) => console.log(theme.primary('› ') + theme.text(text)),
};

// 启动提示
export const renderStarting = () => {
  return theme.muted('Starting Claude Code...');
};

// Usage Loading 状态 (带 spinner)
export const renderUsageLoading = (): string => {
  return theme.muted('Usage  ') + getSpinnerFrame() + theme.dim(' Loading...');
};

// Usage 简要统计（面板顶部）
export const renderUsageSummary = (stats: UsageStats): string => {
  const todayTokens = getTotalTokens(stats.today);
  const weekTokens = getTotalTokens(stats.week);
  const totalTokens = getTotalTokens(stats.total);

  const parts = [
    theme.muted('Usage  '),
    theme.text('Today: ') + theme.primary(formatTokens(todayTokens)) + theme.muted(` (${formatCost(stats.today.cost)})`),
    theme.dim('  |  '),
    theme.text('Week: ') + theme.primary(formatTokens(weekTokens)) + theme.muted(` (${formatCost(stats.week.cost)})`),
    theme.dim('  |  '),
    theme.text('Total: ') + theme.primary(formatTokens(totalTokens)) + theme.muted(` (${formatCost(stats.total.cost)})`),
  ];

  return parts.join('');
};

// Render Calendar Heatmap
const renderCalendarHeatmap = (stats: UsageStats, months: number = 6): string => {
  const lines: string[] = [];
  const now = new Date();

  // Calculate start date (Monday of the week 'months' ago)
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - months);
  // Adjust to previous Monday
  const day = startDate.getDay();
  const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
  startDate.setDate(diff);
  // Ensure we start at 00:00:00
  startDate.setHours(0, 0, 0, 0);

  // Generate all dates in range
  const dates: string[] = [];
  const d = new Date(startDate);
  // Go until we cover full weeks up to now
  while (d <= now || d.getDay() !== 1) { // Stop when we hit a Monday after now
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
    if (d > now && d.getDay() === 1) break;
  }

  // Calculate max tokens for scaling (only in visible range)
  let maxTokens = 0;
  for (const date of dates) {
    const usage = stats.dailyHistory[date];
    if (usage) {
      const tokens = getTotalTokens(usage);
      if (tokens > maxTokens) maxTokens = tokens;
    }
  }

  // Header (Months)
  let header = '     ';
  let currentMonth = -1;

  const weeks = Math.ceil(dates.length / 7);
  for (let w = 0; w < weeks; w++) {
    const dateIndex = w * 7;
    if (dateIndex < dates.length) {
      const date = new Date(dates[dateIndex]);
      const month = date.getMonth();
      // Only show month label if it changes and we have enough space (not the very last column)
      if (month !== currentMonth && w < weeks - 1) {
        const monthName = date.toLocaleString('default', { month: 'short' });
        header += theme.muted(monthName);
        // Pad based on length to align with grid (2 chars per week)
        // If month name is 3 chars ('Jan'), it takes 1.5 blocks.
        // We just print it and skip spaces in next iterations or rely on visual approximation?
        // Better approach: Check if we are at the start of a month
        currentMonth = month;
        // Simple padding for now: each week is 2 chars width ("X ")
        // We added 3 chars. So we essentially "consumed" 1.5 weeks.
        // Let's just output the month name and let it overflow slightly or handle spacing carefully.
        // Simplified approach: Just print at the start of the month, reset spacing counter.
      }
    }
    // Add spacing for the grid column if not printing month
    // This is tricky with variable length text.
    // Let's use a simpler heuristic: Just print spaces, but overlay month names?
    // Alternative: Just print month names approximately.
  }

  // Re-doing Header to be simpler and aligned
  header = '     ';
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const dateIndex = w * 7;
    if (dateIndex >= dates.length) break;
    const date = new Date(dates[dateIndex]);
    const month = date.getMonth();

    if (month !== lastMonth) {
        const monthName = date.toLocaleString('default', { month: 'short' });
        header += theme.muted(monthName.padEnd(4)); // 2 weeks space
        w++; // Skip next week slot visually to prevent overlap
        lastMonth = month;
    } else {
        header += '  ';
    }
  }
  lines.push(header);

  // Grid (Days Mon-Sun)
  const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
  const levels = [' ', '░', '▒', '▓', '█'];

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    let row = theme.muted((dayLabels[dayOfWeek] || '').padEnd(4) + ' ');

    for (let w = 0; w < weeks; w++) {
      const dateIndex = w * 7 + dayOfWeek;
      if (dateIndex < dates.length) {
        const dateKey = dates[dateIndex];
        // Don't show future dates
        if (new Date(dateKey) > now) {
           row += '  ';
        } else {
           const usage = stats.dailyHistory[dateKey];
           const tokens = usage ? getTotalTokens(usage) : 0;

           let level = 0;
           if (tokens > 0) {
             if (maxTokens === 0) level = 0;
             else {
               // Linear scale 1-4
               level = Math.ceil((tokens / maxTokens) * 4);
             }
           }
           // Use level 0 char for 0 tokens
           row += (level === 0 ? theme.dim('·') : theme.primary(levels[level])) + ' ';
        }
      }
    }
    lines.push(row);
  }

  // Legend
  lines.push('');
  lines.push('     ' + theme.dim('Less ') +
    theme.dim('·') + ' ' +
    theme.primary(levels[1]) + ' ' +
    theme.primary(levels[2]) + ' ' +
    theme.primary(levels[3]) + ' ' +
    theme.primary(levels[4]) + ' ' +
    theme.dim(' More'));

  return lines.join('\n');
};

// Usage 详细统计页面
export const renderUsageDetail = (stats: UsageStats): string => {
  const lines: string[] = [];

  lines.push('');
  lines.push(theme.primary('  Token Usage Statistics'));
  lines.push(theme.dim('─'.repeat(60)));

  // Heatmap
  lines.push('');
  lines.push(renderCalendarHeatmap(stats));
  lines.push('');
  lines.push(theme.dim('─'.repeat(60)));

  // 时间段统计表格
  const periodTable = new Table({
    head: [
      theme.muted('Period'),
      theme.muted('Input'),
      theme.muted('Output'),
      theme.muted('Cache Read'),
      theme.muted('Cost'),
    ],
    style: { head: [], border: [] },
    chars: {
      'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
      'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
      'left': '  ', 'left-mid': '', 'mid': '', 'mid-mid': '',
      'right': '', 'right-mid': '', 'middle': '  ',
    },
  });

  const formatRow = (label: string, usage: TokenUsageWithCost) => [
    theme.text(label),
    theme.primary(formatTokens(usage.inputTokens)),
    theme.primary(formatTokens(usage.outputTokens)),
    theme.primary(formatTokens(usage.cacheReadTokens)),
    theme.success(formatCost(usage.cost)),
  ];

  periodTable.push(formatRow('Today', stats.today));
  periodTable.push(formatRow('This Week', stats.week));
  periodTable.push(formatRow('All Time', stats.total));

  lines.push(periodTable.toString());

  // 按模型统计
  const modelEntries = Object.entries(stats.byModel)
    .sort((a, b) => b[1].cost - a[1].cost); // 按费用降序

  if (modelEntries.length > 0) {
    lines.push('');
    lines.push(theme.dim('─'.repeat(60)));
    lines.push(theme.muted('  By Model'));
    lines.push('');

    const modelTable = new Table({
      head: [
        theme.muted('Model'),
        theme.muted('Tokens'),
        theme.muted('Cost'),
      ],
      style: { head: [], border: [] },
      chars: {
        'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
        'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
        'left': '  ', 'left-mid': '', 'mid': '', 'mid-mid': '',
        'right': '', 'right-mid': '', 'middle': '  ',
      },
    });

    for (const [model, usage] of modelEntries) {
      const totalTokens = getTotalTokens(usage);
      modelTable.push([
        theme.text(model),
        theme.primary(formatTokens(totalTokens)),
        theme.success(formatCost(usage.cost)),
      ]);
    }

    lines.push(modelTable.toString());
  }

  lines.push('');
  lines.push(theme.dim('─'.repeat(60)));
  lines.push(theme.muted(`  Last updated: ${new Date(stats.lastUpdated).toLocaleString()}`));

  return lines.join('\n');
};

// 环境选择结果类型
export type EnvSelectResult =
  | { action: 'select'; name: string }
  | { action: 'edit'; name: string }
  | { action: 'rename'; name: string }
  | { action: 'copy'; name: string }
  | { action: 'delete'; name: string }
  | { action: 'cancel' };

// 带快捷键的环境选择器
export const selectEnvWithKeys = (
  registries: Record<string, unknown>,
  current: string
): Promise<EnvSelectResult> => {
  return new Promise((resolve) => {
    const envNames = Object.keys(registries);
    let selectedIndex = envNames.indexOf(current);
    if (selectedIndex === -1) selectedIndex = 0;

    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();

    // 列表总行数 = 标题行 + 环境数
    const totalLines = 1 + envNames.length;
    let firstRender = true;

    const render = () => {
      process.stdout.write('\x1B[?25l'); // 隐藏光标

      if (!firstRender) {
        // 非首次渲染：移动到列表开始位置
        process.stdout.write(`\x1B[${totalLines}A`); // 向上移动
        process.stdout.write('\x1B[J'); // 清除到屏幕底部
      }
      firstRender = false;

      console.log(theme.muted('?') + ' ' + theme.text('Select environment') + ' ' + theme.dim('(↑↓ navigate, Enter select, e edit, r rename, c copy, d delete)'));

      envNames.forEach((name, i) => {
        const isCurrent = name === current;
        const isSelected = i === selectedIndex;
        const prefix = isSelected ? theme.primary('❯ ') : '  ';
        const tag = isCurrent ? theme.success(' *') : '';
        const nameText = isSelected ? theme.primary(name) : (isCurrent ? theme.primary(name) : theme.text(name));
        console.log(prefix + nameText + tag);
      });
    };

    // 初始渲染
    render();

    const cleanup = () => {
      stdin.setRawMode(wasRaw ?? false);
      stdin.removeListener('data', onKeypress);
      process.stdout.write('\x1B[?25h'); // 显示光标
    };

    const onKeypress = (key: Buffer) => {
      const char = key.toString();

      // Ctrl+C
      if (char === '\x03') {
        cleanup();
        process.exit(0);
      }

      // Escape
      if (char === '\x1B' && key.length === 1) {
        cleanup();
        resolve({ action: 'cancel' });
        return;
      }

      // Arrow keys
      if (char === '\x1B[A' || char === 'k') { // Up
        selectedIndex = Math.max(0, selectedIndex - 1);
        render();
        return;
      }
      if (char === '\x1B[B' || char === 'j') { // Down
        selectedIndex = Math.min(envNames.length - 1, selectedIndex + 1);
        render();
        return;
      }

      // Enter
      if (char === '\r' || char === '\n') {
        cleanup();
        resolve({ action: 'select', name: envNames[selectedIndex] });
        return;
      }

      // Hotkeys
      if (char === 'e' || char === 'E') {
        cleanup();
        resolve({ action: 'edit', name: envNames[selectedIndex] });
        return;
      }
      if (char === 'r' || char === 'R') {
        cleanup();
        resolve({ action: 'rename', name: envNames[selectedIndex] });
        return;
      }
      if (char === 'c' || char === 'C') {
        cleanup();
        resolve({ action: 'copy', name: envNames[selectedIndex] });
        return;
      }
      if (char === 'd' || char === 'D') {
        cleanup();
        resolve({ action: 'delete', name: envNames[selectedIndex] });
        return;
      }
    };

    stdin.on('data', onKeypress);
  });
};

// 导出 theme 供其他模块使用
export { theme };
