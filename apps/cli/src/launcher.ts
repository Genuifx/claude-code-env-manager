import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import type { EnvConfig, PermissionModeName } from '@ccem/core';
import { decrypt, PERMISSION_PRESETS, ensureCcemDir } from '@ccem/core';
import { renderStarting } from './ui.js';

export interface LaunchOptions {
  envConfig?: EnvConfig;
  permMode?: PermissionModeName;
  workingDir?: string;
  sessionId?: string;
  /** Resume an existing Claude session by its ID */
  resumeSessionId?: string;
  /** Skip UI output (used by hidden launch command) */
  silent?: boolean;
}

/**
 * Build environment variables from an EnvConfig, decrypting the API key.
 */
function buildEnvVars(envConfig: EnvConfig): Record<string, string> {
  const vars: Record<string, string> = {};
  if (envConfig.ANTHROPIC_BASE_URL) vars.ANTHROPIC_BASE_URL = envConfig.ANTHROPIC_BASE_URL;
  if (envConfig.ANTHROPIC_API_KEY) vars.ANTHROPIC_API_KEY = decrypt(envConfig.ANTHROPIC_API_KEY);
  if (envConfig.ANTHROPIC_MODEL) vars.ANTHROPIC_MODEL = envConfig.ANTHROPIC_MODEL;
  if (envConfig.ANTHROPIC_SMALL_FAST_MODEL) vars.ANTHROPIC_SMALL_FAST_MODEL = envConfig.ANTHROPIC_SMALL_FAST_MODEL;
  return vars;
}

/**
 * Build Claude CLI args for a permission mode preset.
 */
function buildPermArgs(modeName: PermissionModeName): string[] {
  const preset = PERMISSION_PRESETS[modeName];
  if (!preset) return [];

  const args: string[] = ['--permission-mode', preset.permissionMode];

  if (preset.permissions.allow.length > 0) {
    const quoted = preset.permissions.allow.map(t => `"${t}"`).join(' ');
    args.push('--allowedTools', quoted);
  }

  if (preset.permissions.deny.length > 0) {
    const quoted = preset.permissions.deny.map(t => `"${t}"`).join(' ');
    args.push('--disallowedTools', quoted);
  }

  return args;
}

/**
 * Ensure ~/.ccem/sessions/ directory exists.
 */
function ensureSessionsDir(): string {
  const dir = path.join(ensureCcemDir(), 'sessions');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Unified entry point for launching Claude Code.
 *
 * Used by:
 * - Interactive menu "start" action
 * - `ccem <mode>` temporary permission commands
 * - `ccem launch` hidden command (called by Desktop app)
 */
export async function launchClaude(options: LaunchOptions): Promise<void> {
  const { envConfig, permMode, workingDir, sessionId, resumeSessionId, silent } = options;

  // Build env
  const env = { ...process.env };
  if (envConfig) {
    Object.assign(env, buildEnvVars(envConfig));
  }
  // Prevent nested session detection
  delete env.CLAUDECODE;

  // Build args
  const args: string[] = [];
  if (permMode) {
    const preset = PERMISSION_PRESETS[permMode];
    if (preset) {
      if (!silent) {
        console.log(chalk.green(`已应用 ${preset.name}（临时）`));
        console.log(chalk.gray(`说明: ${preset.description}`));
        console.log('');
      }
      args.push(...buildPermArgs(permMode));
    }
  }

  // Resume an existing session
  if (resumeSessionId) {
    args.push('--resume', resumeSessionId);
  }

  // Change working directory if specified
  if (workingDir) {
    process.chdir(workingDir);
  }

  if (!silent && !permMode) {
    console.log(renderStarting());
  }

  // Ensure sessions dir exists for exit tracking
  const sessionsDir = ensureSessionsDir();

  return new Promise((resolve) => {
    const child = spawn('claude', args, {
      stdio: 'inherit',
      shell: true,
      env,
    });

    child.on('exit', (code) => {
      // Write exit code file if sessionId provided (Desktop tracking)
      if (sessionId) {
        try {
          fs.writeFileSync(
            path.join(sessionsDir, `${sessionId}.exit`),
            String(code ?? 0),
          );
        } catch {
          // Best effort — don't fail the process
        }
      }
      process.exit(code ?? 0);
    });

    child.on('error', (err) => {
      console.error(chalk.red(`启动 Claude Code 失败: ${err.message}`));
      process.exit(1);
    });
  });
}
