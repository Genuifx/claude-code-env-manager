/**
 * Terminal UI Components - Claude Code Style
 * 简洁、专业、低调
 */
import chalk from 'chalk';
import type { PermissionModeName } from './types.js';
import { PERMISSION_PRESETS } from './presets.js';

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

// Header
export const renderCompactHeader = (): string => {
  return theme.dim('─'.repeat(60));
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
    { key: 'API Key', value: env.ANTHROPIC_API_KEY ? '••••' + env.ANTHROPIC_API_KEY.slice(-4) : '-' },
  ];

  vars.forEach(({ key, value }) => {
    const displayValue = value.length > 45 ? value.slice(0, 42) + '...' : value;
    lines.push(theme.muted('  ' + key.padEnd(12)) + theme.dim(displayValue));
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
