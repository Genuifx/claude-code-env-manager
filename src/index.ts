#!/usr/bin/env node
import { Command } from 'commander';
import Conf from 'conf';
import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import { spawn } from 'child_process';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM 兼容：获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 package.json 版本号
const pkgPath = path.resolve(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

import type { EnvConfig, PermissionModeName } from './types.js';
import { encrypt, decrypt } from './utils.js';
import { ENV_PRESETS, PERMISSION_PRESETS } from './presets.js'; // SKILL_PRESETS removed
import {
  renderCompactHeader,
  renderEnvPanel,
  getMainMenuChoices,
  getPermModeChoices,
  getEnvChoices,
  msg,
  renderStarting,
  renderUsageDetail,
  renderLogoWithEnvPanel,
  renderUsageLine,
  startSpinner,
  stopSpinner,
} from './ui.js';
import {
  applyPermissionMode,
  resetPermissions,
  showCurrentMode,
  listAvailableModes,
  runWithTempPermissions
} from './permissions.js';
import { getUsageStats, getUsageStatsFromCache } from './usage.js';
import { runSetupInit } from './setup.js';
import type { UsageStats } from './types.js';
import {
  addSkillFromGitHub,
  listInstalledSkills,
  removeSkill,
  installSkill,
} from './skills.js';
import { runSkillSelector } from './components/index.js';
import { loadFromRemote } from './remote.js';

const program = new Command();
const config = new Conf({
  projectName: 'claude-code-env-manager',
  defaults: {
    registries: {
      'official': {
        ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
        ANTHROPIC_MODEL: 'claude-sonnet-4-5-20250929',
        ANTHROPIC_SMALL_FAST_MODEL: 'claude-haiku-4-5-20251001'
      }
    },
    current: 'official',
    defaultMode: null as string | null
  }
});

// 权限模式列表
const PERMISSION_MODES: PermissionModeName[] = ['yolo', 'dev', 'readonly', 'safe', 'ci', 'audit'];

// 缓存 usage stats
let usageStats: UsageStats | null = null;
let usageLoading = true;
let refreshCallback: (() => void) | null = null;
let usageAbortController: AbortController | null = null;

// 先从缓存快速加载，后台更新
const initUsageStats = (onUpdate?: () => void): void => {
  // 1. 先尝试从缓存快速加载（同步，很快）
  const cachedStats = getUsageStatsFromCache();
  if (cachedStats) {
    usageStats = cachedStats;
    usageLoading = false;
  } else {
    // 没有缓存，启动 spinner 动画
    if (onUpdate) {
      startSpinner(onUpdate);
    }
  }

  // 取消之前的请求
  if (usageAbortController) {
    usageAbortController.abort();
  }
  usageAbortController = new AbortController();
  const signal = usageAbortController.signal;

  // 2. 后台异步更新缓存
  getUsageStats(signal)
    .then(stats => {
      if (signal.aborted) return;

      const needRefresh = usageLoading ||
        (usageStats && stats && usageStats.lastUpdated !== stats.lastUpdated);
      usageStats = stats;
      usageLoading = false;
      stopSpinner();
      // 如果数据有更新，触发刷新回调
      if (needRefresh && onUpdate) {
        onUpdate();
      }
    })
    .catch((err) => {
      if (err.message === 'Aborted') return;

      usageLoading = false;
      stopSpinner();
    });
};

program
  .name('ccem')
  .description('Claude Code Environment Manager - 管理 Claude Code 环境变量和权限')
  .version(pkg.version)
  // 权限管理选项
  .option('--mode', '查看当前权限模式')
  .option('--list-modes', '列出所有可用权限模式');

// 临时权限模式命令（使用独立命令而非全局选项，避免与子命令冲突）
PERMISSION_MODES.forEach(mode => {
  const preset = PERMISSION_PRESETS[mode];
  program
    .command(mode)
    .description(`临时应用 ${preset.name}，退出后还原`)
    .action(async () => {
      const registries = config.get('registries') as Record<string, EnvConfig>;
      const current = config.get('current') as string;
      const envConfig = registries[current];
      await runWithTempPermissions(mode, envConfig);
    });
});

const showCurrentEnv = (usageStats: UsageStats | null, usageLoading: boolean) => {
  if (!process.stdout.isTTY) return;

  const current = config.get('current') as string;
  const registries = config.get('registries') as Record<string, EnvConfig>;
  const env = registries[current];
  const defaultMode = config.get('defaultMode') as PermissionModeName | null;

  if (!env) return;

  // 显示 Logo + 环境信息（横向布局）
  console.log(renderLogoWithEnvPanel(current, {
    ANTHROPIC_BASE_URL: env.ANTHROPIC_BASE_URL,
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY ? decrypt(env.ANTHROPIC_API_KEY) : undefined,
    ANTHROPIC_MODEL: env.ANTHROPIC_MODEL,
    ANTHROPIC_SMALL_FAST_MODEL: env.ANTHROPIC_SMALL_FAST_MODEL,
  }, defaultMode));

  // 分隔线
  console.log('');
  console.log(renderUsageLine(usageStats, usageLoading));
  console.log(renderCompactHeader());

  // 底部 Usage 信息行
  console.log('');
};

const switchEnvironment = async (name: string) => {
  const registries = config.get('registries') as Record<string, EnvConfig>;
  if (!registries[name]) {
    console.error(chalk.red(`Environment '${name}' not found.`));
    return;
  }

  config.set('current', name);
  if (process.stdout.isTTY) {
    console.log(chalk.green(`Switched to environment '${name}'`));
  } else {
    console.error(chalk.green(`Switched to environment '${name}'`));
  }

  showCurrentEnv(null, false);

  const env = registries[name];
  const exportCmds: string[] = [];
  if (env.ANTHROPIC_BASE_URL) exportCmds.push(`export ANTHROPIC_BASE_URL="${env.ANTHROPIC_BASE_URL}"`);
  if (env.ANTHROPIC_API_KEY) exportCmds.push(`export ANTHROPIC_API_KEY="${decrypt(env.ANTHROPIC_API_KEY)}"`);
  if (env.ANTHROPIC_MODEL) exportCmds.push(`export ANTHROPIC_MODEL="${env.ANTHROPIC_MODEL}"`);
  if (env.ANTHROPIC_SMALL_FAST_MODEL) exportCmds.push(`export ANTHROPIC_SMALL_FAST_MODEL="${env.ANTHROPIC_SMALL_FAST_MODEL}"`);

  if (process.stdout.isTTY) {
    console.log(chalk.yellow('\nTo apply to current shell immediately, run:'));
    console.log(chalk.cyan('eval $(ccem env)'));

    console.log(chalk.yellow('\nOr manually export:'));
    exportCmds.forEach(cmd => console.log(cmd));
  } else {
    exportCmds.forEach(cmd => console.log(cmd));
  }
};

// 环境管理命令
program
  .command('ls')
  .description('List all configured environments')
  .action(() => {
    const registries = config.get('registries') as Record<string, EnvConfig>;
    const current = config.get('current') as string;

    const table = new Table({
      head: ['Name', 'Base URL', 'Model'],
      style: { head: ['cyan'] }
    });

    Object.keys(registries).forEach(name => {
      const reg = registries[name];
      const prefix = name === current ? chalk.green('* ') : '  ';
      table.push([
        prefix + name,
        reg.ANTHROPIC_BASE_URL || '-',
        reg.ANTHROPIC_MODEL || '-'
      ]);
    });

    console.log(table.toString());
  });

program
  .command('use <name>')
  .description('Switch to a specific environment')
  .action(async (name) => {
    await switchEnvironment(name);
  });

program
  .command('add <name>')
  .description('Add a new environment configuration')
  .action(async (name) => {
    const registries = config.get('registries') as Record<string, EnvConfig>;
    if (registries[name]) {
      console.log(chalk.red(`Environment '${name}' already exists.`));
      return;
    }

    const { usePreset } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'usePreset',
        message: 'Do you want to use a preset configuration?',
        default: true
      }
    ]);

    let presetConfig: Partial<EnvConfig> = {};

    if (usePreset) {
      const { presetName } = await inquirer.prompt([
        {
          type: 'list',
          name: 'presetName',
          message: 'Select a preset:',
          choices: Object.keys(ENV_PRESETS)
        }
      ]);
      presetConfig = ENV_PRESETS[presetName];
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'ANTHROPIC_BASE_URL',
        message: 'Enter ANTHROPIC_BASE_URL:',
        default: presetConfig.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
      },
      {
        type: 'password',
        name: 'ANTHROPIC_API_KEY',
        message: 'Enter ANTHROPIC_API_KEY:',
      },
      {
        type: 'input',
        name: 'ANTHROPIC_MODEL',
        message: 'Enter ANTHROPIC_MODEL:',
        default: presetConfig.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929'
      },
      {
        type: 'input',
        name: 'ANTHROPIC_SMALL_FAST_MODEL',
        message: 'Enter ANTHROPIC_SMALL_FAST_MODEL:',
        default: presetConfig.ANTHROPIC_SMALL_FAST_MODEL || 'claude-haiku-4-5-20251001'
      }
    ]);

    if (answers.ANTHROPIC_API_KEY) {
      answers.ANTHROPIC_API_KEY = encrypt(answers.ANTHROPIC_API_KEY);
    }

    registries[name] = answers;
    config.set('registries', registries);
    console.log(chalk.green(`Environment '${name}' added successfully.`));
  });

program
  .command('del <name>')
  .description('Delete an environment configuration')
  .action((name) => {
    const registries = config.get('registries') as Record<string, EnvConfig>;
    if (!registries[name]) {
      console.log(chalk.red(`Environment '${name}' not found.`));
      return;
    }

    if (name === 'official') {
        console.log(chalk.red(`Cannot delete default 'official' environment.`));
        return;
    }

    delete registries[name];
    config.set('registries', registries);

    const current = config.get('current');
    if (current === name) {
        config.set('current', 'official');
        console.log(chalk.yellow(`Deleted current environment. Switched back to 'official'.`));
    }

    console.log(chalk.green(`Environment '${name}' deleted.`));
  });

program
  .command('current')
  .description('Show current environment name')
  .action(() => {
    const current = config.get('current');
    console.log(chalk.green(current));
  });

program
  .command('env')
  .description('Output environment variables for shell eval')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const registries = config.get('registries') as Record<string, EnvConfig>;
    const current = config.get('current') as string;
    const env = registries[current];

    if (!env) return;

    const outputEnv = { ...env };
    if (outputEnv.ANTHROPIC_API_KEY) {
        outputEnv.ANTHROPIC_API_KEY = decrypt(outputEnv.ANTHROPIC_API_KEY);
    }

    if (options.json) {
        console.log(JSON.stringify(outputEnv, null, 2));
    } else {
        if (outputEnv.ANTHROPIC_BASE_URL) console.log(`export ANTHROPIC_BASE_URL="${outputEnv.ANTHROPIC_BASE_URL}"`);
        if (outputEnv.ANTHROPIC_API_KEY) console.log(`export ANTHROPIC_API_KEY="${outputEnv.ANTHROPIC_API_KEY}"`);
        if (outputEnv.ANTHROPIC_MODEL) console.log(`export ANTHROPIC_MODEL="${outputEnv.ANTHROPIC_MODEL}"`);
        if (outputEnv.ANTHROPIC_SMALL_FAST_MODEL) console.log(`export ANTHROPIC_SMALL_FAST_MODEL="${outputEnv.ANTHROPIC_SMALL_FAST_MODEL}"`);
    }
  });

program
  .command('run <command...>')
  .description('Run a command with the current environment variables')
  .action((command) => {
    const registries = config.get('registries') as Record<string, EnvConfig>;
    const current = config.get('current') as string;
    const envConfig = registries[current];

    if (!envConfig) {
      console.error(chalk.red('No environment configuration found.'));
      process.exit(1);
    }

    const env = { ...process.env };
    if (envConfig.ANTHROPIC_BASE_URL) env.ANTHROPIC_BASE_URL = envConfig.ANTHROPIC_BASE_URL;
    if (envConfig.ANTHROPIC_API_KEY) env.ANTHROPIC_API_KEY = decrypt(envConfig.ANTHROPIC_API_KEY || '');
    if (envConfig.ANTHROPIC_MODEL) env.ANTHROPIC_MODEL = envConfig.ANTHROPIC_MODEL;
    if (envConfig.ANTHROPIC_SMALL_FAST_MODEL) env.ANTHROPIC_SMALL_FAST_MODEL = envConfig.ANTHROPIC_SMALL_FAST_MODEL;

    const [cmd, ...args] = command;
    const child = spawn(cmd, args, {
      env,
      stdio: 'inherit',
      shell: true
    });

    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });
  });

// setup 命令组（永久权限配置）
const setupCmd = program
  .command('setup')
  .description('Setup commands for permanent configurations');

setupCmd
  .command('perms')
  .description('永久配置权限模式')
  .option('--yolo', '应用 YOLO 模式（全部放开）')
  .option('--dev', '应用开发模式')
  .option('--readonly', '应用只读模式')
  .option('--safe', '应用安全模式')
  .option('--ci', '应用 CI/CD 模式')
  .option('--audit', '应用审计模式')
  .option('--reset', '重置权限配置')
  .action(function(this: any) {
    const options = this.opts();

    if (options.reset) {
      resetPermissions();
      return;
    }

    // 检查每个模式选项
    for (const mode of PERMISSION_MODES) {
      if (options[mode]) {
        applyPermissionMode(mode);
        return;
      }
    }

    console.log(chalk.yellow('请指定一个权限模式，例如: ccem setup perms --dev'));
    console.log(chalk.gray('可用模式: ' + PERMISSION_MODES.join(', ')));
    console.log(chalk.gray('重置权限: ccem setup perms --reset'));
  });

setupCmd
  .command('default-mode')
  .description('设置默认权限模式')
  .option('--yolo', 'YOLO 模式')
  .option('--dev', '开发模式')
  .option('--readonly', '只读模式')
  .option('--safe', '安全模式')
  .option('--ci', 'CI/CD 模式')
  .option('--audit', '审计模式')
  .option('--reset', '清除默认模式')
  .action(function(this: any) {
    const options = this.opts();

    if (options.reset) {
      config.set('defaultMode', null);
      console.log(chalk.green('已清除默认权限模式'));
      return;
    }

    for (const mode of PERMISSION_MODES) {
      if (options[mode]) {
        config.set('defaultMode', mode);
        console.log(chalk.green(`已设置默认权限模式: ${PERMISSION_PRESETS[mode].name}`));
        console.log(chalk.gray(`下次启动 ccem 时将默认使用此模式`));
        return;
      }
    }

    // 显示当前默认模式
    const currentDefault = config.get('defaultMode') as PermissionModeName | null;
    if (currentDefault && PERMISSION_PRESETS[currentDefault]) {
      console.log(chalk.green(`当前默认模式: ${PERMISSION_PRESETS[currentDefault].name}`));
    } else {
      console.log(chalk.yellow('未设置默认权限模式'));
    }
    console.log(chalk.gray('\n设置默认模式: ccem setup default-mode --dev'));
    console.log(chalk.gray('清除默认模式: ccem setup default-mode --reset'));
    console.log(chalk.gray('可用模式: ' + PERMISSION_MODES.join(', ')));
  });

setupCmd
  .command('init')
  .description('初始化 Claude Code 全局配置（跳过 onboarding、禁用遥测、安装 MCP 工具）')
  .action(async () => {
    await runSetupInit();
  });

// skill 命令组（管理 Claude Code skills）
const skillCmd = program
  .command('skill')
  .description('管理 Claude Code skills');

skillCmd
  .command('add [url]')
  .description('添加 skill（从官方预设或 GitHub URL）')
  .action(async (url?: string) => {
    if (url) {
      // 直接添加指定的 URL 或预设名
      addSkillFromGitHub(url);
    } else {
      // 交互式选择（使用 ink Tab 选择器）
      const result = await runSkillSelector();

      if (result.type === 'cancelled') {
        console.log(chalk.yellow('已取消'));
        return;
      }

      if (result.type === 'custom') {
        // 用户选择自定义 URL
        const { customUrl } = await inquirer.prompt([
          {
            type: 'input',
            name: 'customUrl',
            message: '输入 GitHub URL:',
            validate: (input: string) => {
              if (!input.trim()) return '请输入有效的 URL';
              if (!input.includes('github.com') && !/^[\w-]+\/[\w-]+$/.test(input)) {
                return '请输入有效的 GitHub URL 或 owner/repo 格式';
              }
              return true;
            }
          }
        ]);
        addSkillFromGitHub(customUrl);
      } else if (result.skill) {
        // 使用统一安装函数
        installSkill(result.skill);
      }
    }
  });

skillCmd
  .command('ls')
  .description('列出已安装的 skills')
  .action(() => {
    const skills = listInstalledSkills();

    if (skills.length === 0) {
      console.log(chalk.yellow('当前目录没有安装任何 skill'));
      console.log(chalk.gray('使用 ccem skill add 添加 skills'));
      return;
    }

    const table = new Table({
      head: ['Name', 'Path'],
      style: { head: ['cyan'] }
    });

    skills.forEach(skill => {
      table.push([chalk.green(skill.name), chalk.gray(skill.path)]);
    });

    console.log(table.toString());
  });

skillCmd
  .command('rm <name>')
  .description('删除已安装的 skill')
  .action((name: string) => {
    removeSkill(name);
  });

// load 命令 - 从远程加载环境配置
program
  .command('load <url>')
  .description('从远程服务器加载环境配置')
  .requiredOption('--secret <secret>', '解密密钥')
  .action(async (url: string, options: { secret: string }) => {
    await loadFromRemote(url, options.secret);
  });

// 默认交互式菜单
program
  .action(async (options) => {
    // 检查权限模式选项
    if (options.mode) {
      showCurrentMode();
      return;
    }

    if (options.listModes) {
      listAvailableModes();
      return;
    }

    // 刷新界面函数
    const refreshScreen = () => {
      // 移动光标到顶部并清屏
      readline.cursorTo(process.stdout, 0, 0);
      readline.clearScreenDown(process.stdout);
      showCurrentEnv(usageStats, usageLoading);
      console.log('');
      // 重新显示菜单提示
      const defaultMode = config.get('defaultMode') as PermissionModeName | null;
      console.log(chalk.gray('?') + ' ' + chalk.gray('Select action') + ' ' + chalk.cyan('(Use arrow keys)'));
      const choices = getMainMenuChoices(defaultMode);
      choices.forEach((choice, i) => {
        const prefix = i === 0 ? chalk.cyan('❯') : ' ';
        console.log(prefix + ' ' + choice.name);
      });
    };

    // 异步加载 usage stats，加载完成后刷新界面
    initUsageStats(refreshScreen);

    // 交互式菜单
    while (true) {
      console.clear();
      showCurrentEnv(usageStats, usageLoading);
      console.log('');

      // 获取默认模式
      const defaultMode = config.get('defaultMode') as PermissionModeName | null;
      const registries = config.get('registries') as Record<string, EnvConfig>;
      const current = config.get('current') as string;
      const envConfig = registries[current];

      // 构建 Start 选项文案
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: chalk.gray('Select action'),
          choices: getMainMenuChoices(defaultMode),
          prefix: chalk.gray('?'),
        }
      ]);

      if (action === 'start') {
        // 停止后台统计任务，释放资源
        if (usageAbortController) {
          usageAbortController.abort();
          usageAbortController = null;
        }
        stopSpinner();

        if (!envConfig) {
          msg.error('No environment configuration found.');
          process.exit(1);
        }

        if (defaultMode && PERMISSION_PRESETS[defaultMode]) {
          await runWithTempPermissions(defaultMode, envConfig);
        } else {
          const env = { ...process.env };
          if (envConfig.ANTHROPIC_BASE_URL) env.ANTHROPIC_BASE_URL = envConfig.ANTHROPIC_BASE_URL;
          if (envConfig.ANTHROPIC_API_KEY) env.ANTHROPIC_API_KEY = decrypt(envConfig.ANTHROPIC_API_KEY || '');
          if (envConfig.ANTHROPIC_MODEL) env.ANTHROPIC_MODEL = envConfig.ANTHROPIC_MODEL;
          if (envConfig.ANTHROPIC_SMALL_FAST_MODEL) env.ANTHROPIC_SMALL_FAST_MODEL = envConfig.ANTHROPIC_SMALL_FAST_MODEL;

          console.log(renderStarting());
          const child = spawn('claude', [], {
            env,
            stdio: 'inherit',
            shell: true
          });

          child.on('exit', (code) => {
            process.exit(code ?? 0);
          });
        }
        return;
      } else if (action === 'usage') {
        // 显示详细 usage 统计
        console.clear();
        if (usageStats) {
          console.log(renderUsageDetail(usageStats));
        } else {
          msg.warning('No usage data available');
        }
        await inquirer.prompt([
          {
            type: 'input',
            name: 'continue',
            message: chalk.gray('Press Enter to continue...'),
            prefix: '',
          }
        ]);
      } else if (action === 'switch') {
        const { selected } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selected',
                message: chalk.gray('Select environment'),
                choices: getEnvChoices(registries, current),
                prefix: chalk.gray('?'),
                default: current
            }
        ]);

        config.set('current', selected);
      } else if (action === 'perm') {
        const { permMode } = await inquirer.prompt([
          {
            type: 'list',
            name: 'permMode',
            message: chalk.gray('Select permission mode'),
            choices: getPermModeChoices(null, false),
            prefix: chalk.gray('?'),
          }
        ]);

        if (permMode !== 'back') {
          await runWithTempPermissions(permMode as PermissionModeName, envConfig);
          return;
        }
      } else if (action === 'setDefault') {
        const currentDefault = config.get('defaultMode') as PermissionModeName | null;

        const { selectedMode } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedMode',
            message: chalk.gray('Set default permission mode'),
            choices: getPermModeChoices(currentDefault, true),
            prefix: chalk.gray('?'),
          }
        ]);

        if (selectedMode === 'clear') {
          config.set('defaultMode', null);
          msg.success('Default mode cleared');
          await new Promise(resolve => setTimeout(resolve, 800));
        } else if (selectedMode !== 'back') {
          config.set('defaultMode', selectedMode);
          msg.success(`Default mode set: ${PERMISSION_PRESETS[selectedMode as PermissionModeName].name}`);
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } else {
        process.exit(0);
      }
    }
  });

program.parse(process.argv);
