#!/usr/bin/env node
import { Command } from 'commander';
import Conf from 'conf';
import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import { spawn } from 'child_process';

import type { EnvConfig, PermissionModeName } from './types.js';
import { encrypt, decrypt } from './utils.js';
import { ENV_PRESETS, PERMISSION_PRESETS } from './presets.js';
import {
  renderCompactHeader,
  renderEnvPanel,
  getMainMenuChoices,
  getPermModeChoices,
  getEnvChoices,
  msg,
  renderStarting,
} from './ui.js';
import {
  applyPermissionMode,
  resetPermissions,
  showCurrentMode,
  listAvailableModes,
  runWithTempPermissions
} from './permissions.js';

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

program
  .name('ccem')
  .description('Claude Code Environment Manager - 管理 Claude Code 环境变量和权限')
  .version('1.1.0')
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

const showCurrentEnv = () => {
  if (!process.stdout.isTTY) return;

  const current = config.get('current') as string;
  const registries = config.get('registries') as Record<string, EnvConfig>;
  const env = registries[current];
  const defaultMode = config.get('defaultMode') as PermissionModeName | null;

  if (!env) return;

  // 使用新的 UI 组件
  console.log(renderCompactHeader());
  console.log('');
  console.log(renderEnvPanel(current, {
    ANTHROPIC_BASE_URL: env.ANTHROPIC_BASE_URL,
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY ? decrypt(env.ANTHROPIC_API_KEY) : undefined,
    ANTHROPIC_MODEL: env.ANTHROPIC_MODEL,
    ANTHROPIC_SMALL_FAST_MODEL: env.ANTHROPIC_SMALL_FAST_MODEL,
  }, defaultMode));
};

const switchEnvironment = (name: string) => {
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

  showCurrentEnv();

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
  .action((name) => {
    switchEnvironment(name);
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

    // 交互式菜单
    while (true) {
      console.clear();
      showCurrentEnv();
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
