#!/usr/bin/env node
import { Command } from 'commander';
import Conf from 'conf';
import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import { spawn } from 'child_process';
import crypto from 'crypto';

const program = new Command();
const config = new Conf({
  projectName: 'claude-code-env-manager',
  defaults: {
    registries: {
      'official': {
        ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
        ANTHROPIC_MODEL: 'claude-3-opus-20240229',
        ANTHROPIC_SMALL_FAST_MODEL: 'claude-3-haiku-20240307'
      }
    },
    current: 'official'
  }
});

// Encryption setup
const ALGORITHM = 'aes-256-cbc';
// Derive a 32-byte key from a fixed secret. 
// Note: This is obfuscation, not secure storage, as the key is hardcoded/derived here.
// It prevents plain text reading of the config file.
const SECRET_KEY = crypto.scryptSync('claude-code-env-manager-secret', 'salt', 32);

const encrypt = (text: string): string => {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `enc:${iv.toString('hex')}:${encrypted}`;
};

const decrypt = (text: string): string => {
  if (!text || !text.startsWith('enc:')) return text;
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return text;
    const iv = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return text;
  }
};

interface EnvConfig {
  ANTHROPIC_BASE_URL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  ANTHROPIC_SMALL_FAST_MODEL?: string;
}

const PRESETS: Record<string, Omit<EnvConfig, 'ANTHROPIC_API_KEY'>> = {
  'GLM': {
    ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
    ANTHROPIC_MODEL: 'glm-4.6',
    ANTHROPIC_SMALL_FAST_MODEL: 'glm-4.5-air'
  },
  'KIMI': {
    ANTHROPIC_BASE_URL: 'https://api.moonshot.cn/anthropic',
    ANTHROPIC_MODEL: 'kimi-k2-thinking-turbo',
    ANTHROPIC_SMALL_FAST_MODEL: 'kimi-k2-turbo-preview'
  },
  'MiniMax': {
    ANTHROPIC_BASE_URL: 'https://api.minimaxi.com/anthropic',
    ANTHROPIC_MODEL: 'MiniMax-M2',
    ANTHROPIC_SMALL_FAST_MODEL: 'MiniMax-M2'
  },
  'DeepSeek': {
    ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
    ANTHROPIC_MODEL: 'deepseek-chat',
    ANTHROPIC_SMALL_FAST_MODEL: 'deepseek-chat'
  }
};

program
  .name('ccem')
  .description('Claude Code Environment Manager - Manage your Claude Code environment variables')
  .version('1.0.0');

const showCurrentEnv = () => {
  // If output is being captured (e.g. by eval $()), don't show the table
  if (!process.stdout.isTTY) return;

  const current = config.get('current') as string;
  const registries = config.get('registries') as Record<string, EnvConfig>;
  const env = registries[current];

  if (!env) return;

  const table = new Table({
    head: ['Current Environment', current],
    style: { head: ['green'] },
    colWidths: [30, 60]
  });

  if (env.ANTHROPIC_BASE_URL) table.push(['ANTHROPIC_BASE_URL', env.ANTHROPIC_BASE_URL]);
  if (env.ANTHROPIC_API_KEY) {
    const decryptedKey = decrypt(env.ANTHROPIC_API_KEY);
    table.push(['ANTHROPIC_API_KEY', decryptedKey ? '******' + decryptedKey.slice(-4) : '-']);
  }
  if (env.ANTHROPIC_MODEL) table.push(['ANTHROPIC_MODEL', env.ANTHROPIC_MODEL]);
  if (env.ANTHROPIC_SMALL_FAST_MODEL) table.push(['ANTHROPIC_SMALL_FAST_MODEL', env.ANTHROPIC_SMALL_FAST_MODEL]);

  console.log(table.toString());
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
    // Interactive mode: suggest commands
    console.log(chalk.yellow('\nTo apply to current shell immediately, run:'));
    console.log(chalk.cyan('eval $(ccem env)'));

    console.log(chalk.yellow('\nOr manually export:'));
    exportCmds.forEach(cmd => console.log(cmd));
  } else {
    // Scripting/Eval mode: output raw commands
    exportCmds.forEach(cmd => console.log(cmd));
  }
};

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
          choices: Object.keys(PRESETS)
        }
      ]);
      presetConfig = PRESETS[presetName];
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
        default: presetConfig.ANTHROPIC_MODEL || 'claude-3-opus-20240229'
      },
      {
        type: 'input',
        name: 'ANTHROPIC_SMALL_FAST_MODEL',
        message: 'Enter ANTHROPIC_SMALL_FAST_MODEL:',
        default: presetConfig.ANTHROPIC_SMALL_FAST_MODEL || 'claude-3-haiku-20240307'
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

// Helper to output env vars for eval
program
  .command('env')
  .description('Output environment variables for shell eval')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const registries = config.get('registries') as Record<string, EnvConfig>;
    const current = config.get('current') as string;
    const env = registries[current];

    if (!env) return;

    // Decrypt API key for output
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

program
  .action(async () => {
    while (true) {
      console.clear();
      showCurrentEnv();
      console.log('');

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '🚀 Start Claude Code', value: 'start' },
            { name: '🔄 Switch Environment', value: 'switch' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);

      if (action === 'start') {
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

        console.log(chalk.green('Starting Claude Code...'));
        const child = spawn('claude', [], {
          env,
          stdio: 'inherit',
          shell: true
        });

        child.on('exit', (code) => {
          process.exit(code ?? 0);
        });
        return;
      } else if (action === 'switch') {
        const registries = config.get('registries') as Record<string, EnvConfig>;
        const current = config.get('current') as string;
        
        const choices = Object.keys(registries).map(name => ({
            name: name === current ? `${name} ${chalk.green('(current)')}` : name,
            value: name
        }));

        const { selected } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selected',
                message: 'Select an environment:',
                choices,
                default: current
            }
        ]);

        config.set('current', selected);
        // Loop continues, refreshing the screen with new env
      } else {
        process.exit(0);
      }
    }
  });

program.parse(process.argv);
