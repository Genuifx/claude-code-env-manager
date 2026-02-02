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

import type { EnvConfig, PermissionModeName } from '@ccem/core';
import { encrypt, decrypt, ENV_PRESETS, PERMISSION_PRESETS, getCcemConfigDir, ensureCcemDir, getCcemConfigPath, getLegacyConfigPath } from '@ccem/core';
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
  selectEnvWithKeys,
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
import type { UsageStats } from '@ccem/core';
import {
  addSkillFromGitHub,
  listInstalledSkills,
  removeSkill,
  installSkill,
} from './skills.js';
import { runSkillSelector } from './components/index.js';
import { loadFromRemote } from './remote.js';

const program = new Command();

// 确保配置目录存在
ensureCcemDir();

const config = new Conf({
  projectName: 'claude-code-env-manager',
  cwd: getCcemConfigDir(),  // 使用新路径
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
  .command('rename <old> <new>')
  .description('Rename an environment configuration')
  .action((oldName, newName) => {
    const registries = config.get('registries') as Record<string, EnvConfig>;

    if (!registries[oldName]) {
      console.log(chalk.red(`Environment '${oldName}' not found.`));
      return;
    }

    if (registries[newName]) {
      console.log(chalk.red(`Environment '${newName}' already exists.`));
      return;
    }

    if (oldName === 'official') {
      console.log(chalk.red(`Cannot rename default 'official' environment.`));
      return;
    }

    registries[newName] = registries[oldName];
    delete registries[oldName];
    config.set('registries', registries);

    const current = config.get('current');
    if (current === oldName) {
      config.set('current', newName);
    }

    console.log(chalk.green(`Environment '${oldName}' renamed to '${newName}'.`));
  });

program
  .command('cp <source> <target>')
  .description('Copy an environment configuration')
  .action(async (source, target) => {
    const registries = config.get('registries') as Record<string, EnvConfig>;

    if (!registries[source]) {
      console.log(chalk.red(`Environment '${source}' not found.`));
      return;
    }

    if (registries[target]) {
      console.log(chalk.red(`Environment '${target}' already exists.`));
      return;
    }

    registries[target] = { ...registries[source] };
    config.set('registries', registries);
    console.log(chalk.green(`Environment '${source}' copied to '${target}'.`));

    const { modify } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'modify',
        message: 'Do you want to modify the configuration?',
        default: false
      }
    ]);

    if (modify) {
      const current = registries[target];
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'ANTHROPIC_BASE_URL',
          message: 'ANTHROPIC_BASE_URL:',
          default: current.ANTHROPIC_BASE_URL
        },
        {
          type: 'password',
          name: 'ANTHROPIC_API_KEY',
          message: 'ANTHROPIC_API_KEY (leave empty to keep current):',
        },
        {
          type: 'input',
          name: 'ANTHROPIC_MODEL',
          message: 'ANTHROPIC_MODEL:',
          default: current.ANTHROPIC_MODEL
        },
        {
          type: 'input',
          name: 'ANTHROPIC_SMALL_FAST_MODEL',
          message: 'ANTHROPIC_SMALL_FAST_MODEL:',
          default: current.ANTHROPIC_SMALL_FAST_MODEL
        }
      ]);

      if (answers.ANTHROPIC_BASE_URL) current.ANTHROPIC_BASE_URL = answers.ANTHROPIC_BASE_URL;
      if (answers.ANTHROPIC_API_KEY) current.ANTHROPIC_API_KEY = encrypt(answers.ANTHROPIC_API_KEY);
      if (answers.ANTHROPIC_MODEL) current.ANTHROPIC_MODEL = answers.ANTHROPIC_MODEL;
      if (answers.ANTHROPIC_SMALL_FAST_MODEL) current.ANTHROPIC_SMALL_FAST_MODEL = answers.ANTHROPIC_SMALL_FAST_MODEL;

      registries[target] = current;
      config.set('registries', registries);
      console.log(chalk.green(`Environment '${target}' updated.`));
    }
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

setupCmd
  .command('migrate')
  .description('迁移旧版配置到 ~/.ccem/')
  .option('--clean', '迁移后删除旧配置文件')
  .option('--force', '强制重新迁移（覆盖现有配置）')
  .action(async function(this: any) {
    const options = this.opts();
    const newConfigPath = getCcemConfigPath();
    const legacyConfigPath = getLegacyConfigPath();

    console.log(chalk.cyan('\n🔄 配置迁移\n'));

    // 检查旧配置是否存在
    if (!fs.existsSync(legacyConfigPath)) {
      console.log(chalk.yellow('未找到旧版配置文件'));
      console.log(chalk.gray(`  旧路径: ${legacyConfigPath}`));
      return;
    }

    // 检查新配置是否存在
    if (fs.existsSync(newConfigPath) && !options.force) {
      console.log(chalk.green('✓ 配置已在新路径'));
      console.log(chalk.gray(`  路径: ${newConfigPath}`));
      console.log(chalk.gray('\n使用 --force 强制重新迁移'));
      return;
    }

    try {
      // 确保目录存在
      ensureCcemDir();

      // 复制配置
      fs.copyFileSync(legacyConfigPath, newConfigPath);
      console.log(chalk.green('✓ 配置已迁移'));
      console.log(chalk.gray(`  从: ${legacyConfigPath}`));
      console.log(chalk.gray(`  到: ${newConfigPath}`));

      // 清理旧文件
      if (options.clean) {
        fs.unlinkSync(legacyConfigPath);
        // 尝试删除空目录
        const legacyDir = path.dirname(legacyConfigPath);
        try {
          fs.rmdirSync(legacyDir);
        } catch {
          // 目录非空，忽略
        }
        console.log(chalk.green('✓ 已删除旧配置文件'));
      }
    } catch (err) {
      console.error(chalk.red(`✗ 迁移失败: ${err}`));
    }
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

    // 刷新界面函数 - 仅在菜单未显示时使用
    // 由于 inquirer 运行时无法安全刷新，这里不再使用回调刷新
    // usage stats 会在下一次循环时自动更新显示

    // 异步加载 usage stats（不传回调，避免与 inquirer 冲突）
    initUsageStats();

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
        const result = await selectEnvWithKeys(registries, current);

        if (result.action === 'select') {
          config.set('current', result.name);
        } else if (result.action === 'edit') {
          // 编辑环境配置
          const envToEdit = registries[result.name];
          console.log(chalk.yellow(`\nEditing environment '${result.name}'`));

          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'ANTHROPIC_BASE_URL',
              message: 'ANTHROPIC_BASE_URL:',
              default: envToEdit.ANTHROPIC_BASE_URL
            },
            {
              type: 'password',
              name: 'ANTHROPIC_API_KEY',
              message: 'ANTHROPIC_API_KEY (leave empty to keep current):',
            },
            {
              type: 'input',
              name: 'ANTHROPIC_MODEL',
              message: 'ANTHROPIC_MODEL:',
              default: envToEdit.ANTHROPIC_MODEL
            },
            {
              type: 'input',
              name: 'ANTHROPIC_SMALL_FAST_MODEL',
              message: 'ANTHROPIC_SMALL_FAST_MODEL:',
              default: envToEdit.ANTHROPIC_SMALL_FAST_MODEL
            }
          ]);

          if (answers.ANTHROPIC_BASE_URL) envToEdit.ANTHROPIC_BASE_URL = answers.ANTHROPIC_BASE_URL;
          if (answers.ANTHROPIC_API_KEY) envToEdit.ANTHROPIC_API_KEY = encrypt(answers.ANTHROPIC_API_KEY);
          if (answers.ANTHROPIC_MODEL) envToEdit.ANTHROPIC_MODEL = answers.ANTHROPIC_MODEL;
          if (answers.ANTHROPIC_SMALL_FAST_MODEL) envToEdit.ANTHROPIC_SMALL_FAST_MODEL = answers.ANTHROPIC_SMALL_FAST_MODEL;

          registries[result.name] = envToEdit;
          config.set('registries', registries);
          msg.success(`Environment '${result.name}' updated.`);
          await new Promise(resolve => setTimeout(resolve, 800));
        } else if (result.action === 'rename') {
          // 重命名环境
          if (result.name === 'official') {
            msg.error("Cannot rename default 'official' environment.");
            await new Promise(resolve => setTimeout(resolve, 800));
          } else {
            const { newName } = await inquirer.prompt([
              {
                type: 'input',
                name: 'newName',
                message: `Rename '${result.name}' to:`,
                validate: (input: string) => {
                  if (!input.trim()) return 'Name cannot be empty';
                  if (registries[input]) return `Environment '${input}' already exists`;
                  return true;
                }
              }
            ]);

            registries[newName] = registries[result.name];
            delete registries[result.name];
            config.set('registries', registries);

            if (current === result.name) {
              config.set('current', newName);
            }
            msg.success(`Environment '${result.name}' renamed to '${newName}'.`);
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        } else if (result.action === 'copy') {
          // 复制环境
          const { targetName } = await inquirer.prompt([
            {
              type: 'input',
              name: 'targetName',
              message: `Copy '${result.name}' to:`,
              validate: (input: string) => {
                if (!input.trim()) return 'Name cannot be empty';
                if (registries[input]) return `Environment '${input}' already exists`;
                return true;
              }
            }
          ]);

          registries[targetName] = { ...registries[result.name] };
          config.set('registries', registries);
          msg.success(`Environment '${result.name}' copied to '${targetName}'.`);

          const { modify } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'modify',
              message: 'Do you want to modify the configuration?',
              default: false
            }
          ]);

          if (modify) {
            const envToEdit = registries[targetName];
            const editAnswers = await inquirer.prompt([
              {
                type: 'input',
                name: 'ANTHROPIC_BASE_URL',
                message: 'ANTHROPIC_BASE_URL:',
                default: envToEdit.ANTHROPIC_BASE_URL
              },
              {
                type: 'password',
                name: 'ANTHROPIC_API_KEY',
                message: 'ANTHROPIC_API_KEY (leave empty to keep current):',
              },
              {
                type: 'input',
                name: 'ANTHROPIC_MODEL',
                message: 'ANTHROPIC_MODEL:',
                default: envToEdit.ANTHROPIC_MODEL
              },
              {
                type: 'input',
                name: 'ANTHROPIC_SMALL_FAST_MODEL',
                message: 'ANTHROPIC_SMALL_FAST_MODEL:',
                default: envToEdit.ANTHROPIC_SMALL_FAST_MODEL
              }
            ]);

            if (editAnswers.ANTHROPIC_BASE_URL) envToEdit.ANTHROPIC_BASE_URL = editAnswers.ANTHROPIC_BASE_URL;
            if (editAnswers.ANTHROPIC_API_KEY) envToEdit.ANTHROPIC_API_KEY = encrypt(editAnswers.ANTHROPIC_API_KEY);
            if (editAnswers.ANTHROPIC_MODEL) envToEdit.ANTHROPIC_MODEL = editAnswers.ANTHROPIC_MODEL;
            if (editAnswers.ANTHROPIC_SMALL_FAST_MODEL) envToEdit.ANTHROPIC_SMALL_FAST_MODEL = editAnswers.ANTHROPIC_SMALL_FAST_MODEL;

            registries[targetName] = envToEdit;
            config.set('registries', registries);
            msg.success(`Environment '${targetName}' updated.`);
          }
          await new Promise(resolve => setTimeout(resolve, 800));
        } else if (result.action === 'delete') {
          // 删除环境
          if (result.name === 'official') {
            msg.error("Cannot delete default 'official' environment.");
            await new Promise(resolve => setTimeout(resolve, 800));
          } else {
            const { confirm } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirm',
                message: `Are you sure you want to delete '${result.name}'?`,
                default: false
              }
            ]);

            if (confirm) {
              delete registries[result.name];
              config.set('registries', registries);

              if (current === result.name) {
                config.set('current', 'official');
                msg.warning(`Deleted current environment. Switched back to 'official'.`);
              } else {
                msg.success(`Environment '${result.name}' deleted.`);
              }
            }
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }
        // cancel: do nothing, return to main menu
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
