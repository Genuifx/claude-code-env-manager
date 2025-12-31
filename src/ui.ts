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

// Usage 详细统计页面
export const renderUsageDetail = (stats: UsageStats): string => {
  const lines: string[] = [];

  lines.push('');
  lines.push(theme.primary('  Token Usage Statistics'));
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

// 导出 theme 供其他模块使用
export { theme };
