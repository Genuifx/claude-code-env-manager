import fs from 'fs';
import chalk from 'chalk';
import Table from 'cli-table3';
import { spawn } from 'child_process';
import type { PermissionConfig, PermissionModeName, EnvConfig } from './types.js';
import { getSettingsPath, ensureClaudeDir, decrypt } from './utils.js';
import { PERMISSION_PRESETS, getPermissionModeNames } from './presets.js';

/**
 * 读取 settings 文件
 */
export const readSettings = (settingsPath: string): PermissionConfig => {
  if (fs.existsSync(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      console.warn(chalk.yellow(`警告: 无法解析 ${settingsPath}，将创建备份`));
      const backupPath = settingsPath + '.error.' + Date.now();
      fs.copyFileSync(settingsPath, backupPath);
      console.log(chalk.gray(`备份已保存到: ${backupPath}`));
      return {};
    }
  }
  return {};
};

/**
 * 写入 settings 文件
 */
export const writeSettings = (settingsPath: string, config: PermissionConfig): void => {
  ensureClaudeDir();
  fs.writeFileSync(settingsPath, JSON.stringify(config, null, 2) + '\n');
};

/**
 * 合并权限配置
 */
export const mergePermissions = (
  existing: PermissionConfig,
  preset: { allow: string[]; deny: string[] }
): PermissionConfig => {
  const existingAllow = existing.permissions?.allow || [];
  const existingDeny = existing.permissions?.deny || [];

  // 合并并去重
  const mergedAllow = [...new Set([...preset.allow, ...existingAllow])];
  const mergedDeny = [...new Set([...preset.deny, ...existingDeny])];

  return {
    ...existing,
    permissions: {
      allow: mergedAllow,
      deny: mergedDeny
    }
  };
};

/**
 * 应用权限模式（永久）
 */
export const applyPermissionMode = (modeName: PermissionModeName): void => {
  const preset = PERMISSION_PRESETS[modeName];
  if (!preset) {
    console.error(chalk.red(`未知的权限模式: ${modeName}`));
    console.log(chalk.yellow('可用模式: ' + getPermissionModeNames().join(', ')));
    process.exit(1);
  }

  const settingsPath = getSettingsPath(true);
  const existing = readSettings(settingsPath);
  const merged = mergePermissions(existing, preset.permissions);

  writeSettings(settingsPath, merged);

  console.log(chalk.green(`已应用 ${preset.name}`));
  console.log(chalk.gray(`配置已写入: ${settingsPath}`));
  console.log(chalk.gray(`说明: ${preset.description}`));
};

/**
 * 重置权限配置
 */
export const resetPermissions = (): void => {
  const settingsPath = getSettingsPath(true);

  if (!fs.existsSync(settingsPath)) {
    console.log(chalk.yellow('没有自定义权限配置需要重置'));
    return;
  }

  const config = readSettings(settingsPath);
  delete config.permissions;

  if (Object.keys(config).length === 0) {
    fs.unlinkSync(settingsPath);
    console.log(chalk.green('已删除配置文件（文件为空）'));
  } else {
    writeSettings(settingsPath, config);
    console.log(chalk.green('权限配置已重置'));
  }
  console.log(chalk.gray(`文件: ${settingsPath}`));
};

/**
 * 显示当前权限模式
 */
export const showCurrentMode = (): void => {
  const settingsPath = getSettingsPath(true);

  if (!fs.existsSync(settingsPath)) {
    console.log(chalk.yellow('未配置自定义权限'));
    console.log(chalk.gray(`文件不存在: ${settingsPath}`));
    return;
  }

  const config = readSettings(settingsPath);

  if (!config.permissions) {
    console.log(chalk.yellow('未配置自定义权限'));
    return;
  }

  // 尝试匹配已知预设
  const matchedPreset = Object.entries(PERMISSION_PRESETS).find(([_, preset]) => {
    const configAllow = new Set(config.permissions?.allow || []);
    const configDeny = new Set(config.permissions?.deny || []);
    const presetAllow = new Set(preset.permissions.allow);
    const presetDeny = new Set(preset.permissions.deny);

    // 检查预设的权限是否都包含在配置中
    const allowMatch = preset.permissions.allow.every(p => configAllow.has(p));
    const denyMatch = preset.permissions.deny.every(p => configDeny.has(p));

    return allowMatch && denyMatch;
  });

  if (matchedPreset) {
    console.log(chalk.green(`当前模式: ${matchedPreset[0]} (${matchedPreset[1].name})`));
  } else {
    console.log(chalk.yellow('当前模式: 自定义'));
  }

  console.log(chalk.gray(`配置文件: ${settingsPath}`));

  // 显示权限表格
  const table = new Table({
    head: ['类型', '规则'],
    style: { head: ['cyan'] },
    colWidths: [10, 70]
  });

  const allowRules = config.permissions.allow || [];
  const denyRules = config.permissions.deny || [];

  table.push(['Allow', allowRules.length > 0 ? allowRules.join('\n') : '(无)']);
  table.push(['Deny', denyRules.length > 0 ? denyRules.join('\n') : '(无)']);

  console.log(table.toString());
};

/**
 * 列出所有可用权限模式
 */
export const listAvailableModes = (): void => {
  const table = new Table({
    head: ['模式', '标志', '说明'],
    style: { head: ['cyan'] },
    colWidths: [15, 15, 50]
  });

  Object.entries(PERMISSION_PRESETS).forEach(([key, preset]) => {
    table.push([preset.name, `--${key}`, preset.description]);
  });

  console.log(chalk.bold('可用权限模式:\n'));
  console.log(table.toString());
  console.log(chalk.gray('\n临时模式: ccem <mode>'));
  console.log(chalk.gray('永久模式: ccem setup perms --<mode>'));
};

/**
 * 以临时权限模式运行 Claude Code
 * 通过 --allowedTools 和 --disallowedTools 参数传递权限，不修改配置文件
 */
export const runWithTempPermissions = async (
  modeName: PermissionModeName,
  envConfig?: EnvConfig
): Promise<void> => {
  const preset = PERMISSION_PRESETS[modeName];
  if (!preset) {
    console.error(chalk.red(`未知的权限模式: ${modeName}`));
    console.log(chalk.yellow('可用模式: ' + getPermissionModeNames().join(', ')));
    process.exit(1);
  }

  // 构建 Claude CLI 参数（用引号包裹，避免 shell 解析括号）
  const args: string[] = [];

  if (preset.permissions.allow.length > 0) {
    const quoted = preset.permissions.allow.map(t => `"${t}"`).join(' ');
    args.push('--allowedTools', quoted);
  }

  if (preset.permissions.deny.length > 0) {
    const quoted = preset.permissions.deny.map(t => `"${t}"`).join(' ');
    args.push('--disallowedTools', quoted);
  }

  console.log(chalk.green(`已应用 ${preset.name}（临时）`));
  console.log(chalk.gray(`说明: ${preset.description}`));
  console.log('');

  // 构建环境变量
  const env = { ...process.env };
  if (envConfig) {
    if (envConfig.ANTHROPIC_BASE_URL) env.ANTHROPIC_BASE_URL = envConfig.ANTHROPIC_BASE_URL;
    if (envConfig.ANTHROPIC_API_KEY) env.ANTHROPIC_API_KEY = decrypt(envConfig.ANTHROPIC_API_KEY);
    if (envConfig.ANTHROPIC_MODEL) env.ANTHROPIC_MODEL = envConfig.ANTHROPIC_MODEL;
    if (envConfig.ANTHROPIC_SMALL_FAST_MODEL) env.ANTHROPIC_SMALL_FAST_MODEL = envConfig.ANTHROPIC_SMALL_FAST_MODEL;
  }

  // 启动 Claude Code
  return new Promise((resolve) => {
    const child = spawn('claude', args, {
      stdio: 'inherit',
      shell: true,
      env
    });

    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });

    child.on('error', (err) => {
      console.error(chalk.red(`启动 Claude Code 失败: ${err.message}`));
      process.exit(1);
    });
  });
};
