import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Encryption setup
const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.scryptSync('claude-code-env-manager-secret', 'salt', 32);

export const encrypt = (text: string): string => {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `enc:${iv.toString('hex')}:${encrypted}`;
};

export const decrypt = (text: string): string => {
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
  } catch {
    return text;
  }
};

/**
 * 查找项目根目录（包含 .git 或 package.json 的目录）
 */
export const findProjectRoot = (): string => {
  let currentDir = process.cwd();
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    if (
      fs.existsSync(path.join(currentDir, '.git')) ||
      fs.existsSync(path.join(currentDir, 'package.json'))
    ) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  // 未找到项目标记，使用当前目录
  return process.cwd();
};

/**
 * 获取 Claude Code settings 文件路径
 */
export const getSettingsPath = (useLocal: boolean = true): string => {
  const projectRoot = findProjectRoot();
  const claudeDir = path.join(projectRoot, '.claude');
  const filename = useLocal ? 'settings.local.json' : 'settings.json';
  return path.join(claudeDir, filename);
};

/**
 * 确保 .claude 目录存在
 */
export const ensureClaudeDir = (): string => {
  const projectRoot = findProjectRoot();
  const claudeDir = path.join(projectRoot, '.claude');
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }
  return claudeDir;
};

/**
 * 获取用户主目录
 */
export const getHomeDir = (): string => {
  return process.env.HOME || process.env.USERPROFILE || '';
};

/**
 * 获取全局 Claude 配置文件路径 (~/.claude.json)
 */
export const getGlobalClaudeConfigPath = (): string => {
  return path.join(getHomeDir(), '.claude.json');
};

/**
 * 获取全局 Claude settings 文件路径 (~/.claude/settings.json)
 */
export const getGlobalClaudeSettingsPath = (): string => {
  return path.join(getHomeDir(), '.claude', 'settings.json');
};

/**
 * 确保全局 ~/.claude 目录存在
 */
export const ensureGlobalClaudeDir = (): string => {
  const claudeDir = path.join(getHomeDir(), '.claude');
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }
  return claudeDir;
};

/**
 * CCEM 配置目录路径 (~/.ccem/)
 */
export const getCcemConfigDir = (): string => {
  return path.join(getHomeDir(), '.ccem');
};

/**
 * CCEM 主配置文件路径 (~/.ccem/config.json)
 */
export const getCcemConfigPath = (): string => {
  return path.join(getCcemConfigDir(), 'config.json');
};

/**
 * 确保 ~/.ccem 目录存在
 */
export const ensureCcemDir = (): string => {
  const ccemDir = getCcemConfigDir();
  if (!fs.existsSync(ccemDir)) {
    fs.mkdirSync(ccemDir, { recursive: true });
  }
  return ccemDir;
};

/**
 * 获取旧配置路径 (conf 包默认路径)
 * macOS: ~/Library/Preferences/claude-code-env-manager-nodejs/config.json
 * Linux: ~/.config/claude-code-env-manager-nodejs/config.json
 */
export const getLegacyConfigPath = (): string => {
  const home = getHomeDir();
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Preferences', 'claude-code-env-manager-nodejs', 'config.json');
  }
  return path.join(home, '.config', 'claude-code-env-manager-nodejs', 'config.json');
};
