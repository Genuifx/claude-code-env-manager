import fs from 'fs';
import chalk from 'chalk';
import { spawn } from 'child_process';
import {
  getGlobalClaudeConfigPath,
  getGlobalClaudeSettingsPath,
  ensureGlobalClaudeDir
} from './utils.js';

/**
 * 读取 JSON 文件，如果不存在返回空对象
 */
const readJsonFile = (filePath: string): Record<string, unknown> => {
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      console.warn(chalk.yellow(`警告: 无法解析 ${filePath}`));
      return {};
    }
  }
  return {};
};

/**
 * 写入 JSON 文件
 */
const writeJsonFile = (filePath: string, data: Record<string, unknown>): void => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
};

/**
 * 步骤 1: 设置 hasCompletedOnboarding
 */
const setupOnboarding = (): boolean => {
  const configPath = getGlobalClaudeConfigPath();

  try {
    const config = readJsonFile(configPath);

    if (config.hasCompletedOnboarding === true) {
      console.log(chalk.gray('  ✓ hasCompletedOnboarding 已设置'));
      return true;
    }

    config.hasCompletedOnboarding = true;
    writeJsonFile(configPath, config);
    console.log(chalk.green('  ✓ 已设置 hasCompletedOnboarding: true'));
    return true;
  } catch (err) {
    console.error(chalk.red(`  ✗ 设置 hasCompletedOnboarding 失败: ${err}`));
    return false;
  }
};

/**
 * 步骤 2: 设置环境变量禁用遥测
 */
const setupEnvSettings = (): boolean => {
  const settingsPath = getGlobalClaudeSettingsPath();

  try {
    ensureGlobalClaudeDir();
    const settings = readJsonFile(settingsPath);

    // 确保 env 字段存在
    if (!settings.env || typeof settings.env !== 'object') {
      settings.env = {};
    }

    const env = settings.env as Record<string, unknown>;
    const envVars = {
      'DISABLE_BUG_COMMAND': '1',
      'DISABLE_ERROR_REPORTING': '1',
      'DISABLE_TELEMETRY': '1'
    };

    let changed = false;
    for (const [key, value] of Object.entries(envVars)) {
      if (env[key] !== value) {
        env[key] = value;
        changed = true;
      }
    }

    if (!changed) {
      console.log(chalk.gray('  ✓ 环境变量已配置'));
      return true;
    }

    writeJsonFile(settingsPath, settings);
    console.log(chalk.green('  ✓ 已配置环境变量:'));
    console.log(chalk.gray('      DISABLE_BUG_COMMAND=1'));
    console.log(chalk.gray('      DISABLE_ERROR_REPORTING=1'));
    console.log(chalk.gray('      DISABLE_TELEMETRY=1'));
    return true;
  } catch (err) {
    console.error(chalk.red(`  ✗ 设置环境变量失败: ${err}`));
    return false;
  }
};

/**
 * 步骤 3: 添加 chrome-devtools MCP 工具
 */
const setupMcpTool = (): Promise<boolean> => {
  return new Promise((resolve) => {
    console.log(chalk.cyan('  → 正在添加 chrome-devtools MCP 工具...'));

    const child = spawn('claude', [
      'mcp', 'add',
      'chrome-devtools',
      'npx', 'chrome-devtools-mcp@latest',
      '--scope', 'user'
    ], {
      stdio: 'pipe',
      shell: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(chalk.green('  ✓ 已添加 chrome-devtools MCP 工具'));
        resolve(true);
      } else {
        // 检查是否已存在
        if (stderr.includes('already exists') || stdout.includes('already exists')) {
          console.log(chalk.gray('  ✓ chrome-devtools MCP 工具已存在'));
          resolve(true);
        } else {
          console.error(chalk.red(`  ✗ 添加 MCP 工具失败 (code: ${code})`));
          if (stderr) console.error(chalk.gray(`      ${stderr.trim()}`));
          resolve(false);
        }
      }
    });

    child.on('error', (err) => {
      console.error(chalk.red(`  ✗ 执行 claude 命令失败: ${err.message}`));
      console.log(chalk.yellow('      请确保已安装 Claude Code CLI'));
      resolve(false);
    });
  });
};

/**
 * 执行完整的 setup init 流程
 */
export const runSetupInit = async (): Promise<void> => {
  console.log(chalk.bold('\n🔧 Claude Code 初始化设置\n'));

  // 步骤 1
  console.log(chalk.cyan('1. 设置 onboarding 状态'));
  const step1 = setupOnboarding();

  // 步骤 2
  console.log(chalk.cyan('\n2. 配置隐私设置'));
  const step2 = setupEnvSettings();

  // 步骤 3
  console.log(chalk.cyan('\n3. 安装 MCP 工具'));
  const step3 = await setupMcpTool();

  // 总结
  console.log('');
  if (step1 && step2 && step3) {
    console.log(chalk.green.bold('✅ 初始化完成！'));
  } else {
    console.log(chalk.yellow.bold('⚠️  部分步骤未完成，请检查上述错误'));
  }

  console.log(chalk.gray('\n配置文件位置:'));
  console.log(chalk.gray(`  - ${getGlobalClaudeConfigPath()}`));
  console.log(chalk.gray(`  - ${getGlobalClaudeSettingsPath()}`));
  console.log('');
};
