/**
 * Skills 管理模块
 * 支持从 GitHub 仓库下载 skills 到当前目录的 .claude/skills/
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

// 分组类型
export type SkillGroup = 'official' | 'featured' | 'others';

// 安装方式类型
export type InstallMethod =
  | { type: 'preset'; name: string }
  | { type: 'github'; url: string }
  | { type: 'plugin'; marketplace: string; package: string };

// 分组元信息
export const SKILL_GROUPS: Record<SkillGroup, { label: string; icon: string }> = {
  official: { label: '官方', icon: '🏢' },
  featured: { label: '精选', icon: '⭐' },
  others: { label: '其他', icon: '📦' },
};

export interface SkillPreset {
  name: string;
  description: string;
  group: SkillGroup;
  install: InstallMethod;
}

// Skills 预设列表（按分组）
export const SKILL_PRESETS: SkillPreset[] = [
  // ===== 官方 (Official) =====
  {
    name: 'frontend-design',
    description: '创建高质量前端界面设计',
    group: 'official',
    install: { type: 'preset', name: 'frontend-design' },
  },
  {
    name: 'skill-creator',
    description: '创建新的 Claude Code skills',
    group: 'official',
    install: { type: 'preset', name: 'skill-creator' },
  },
  {
    name: 'web-artifacts-builder',
    description: '构建可交互的 Web 组件',
    group: 'official',
    install: { type: 'preset', name: 'web-artifacts-builder' },
  },
  {
    name: 'canvas-design',
    description: 'Canvas 绘图设计',
    group: 'official',
    install: { type: 'preset', name: 'canvas-design' },
  },
  {
    name: 'algorithmic-art',
    description: '算法艺术生成',
    group: 'official',
    install: { type: 'preset', name: 'algorithmic-art' },
  },
  {
    name: 'theme-factory',
    description: '主题工厂 - 创建 UI 主题',
    group: 'official',
    install: { type: 'preset', name: 'theme-factory' },
  },
  {
    name: 'mcp-builder',
    description: '构建 MCP 服务器',
    group: 'official',
    install: { type: 'preset', name: 'mcp-builder' },
  },
  {
    name: 'webapp-testing',
    description: 'Web 应用测试',
    group: 'official',
    install: { type: 'preset', name: 'webapp-testing' },
  },
  {
    name: 'pdf',
    description: 'PDF 文档处理',
    group: 'official',
    install: { type: 'preset', name: 'pdf' },
  },
  {
    name: 'docx',
    description: 'Word 文档处理',
    group: 'official',
    install: { type: 'preset', name: 'docx' },
  },
  {
    name: 'pptx',
    description: 'PowerPoint 演示文稿处理',
    group: 'official',
    install: { type: 'preset', name: 'pptx' },
  },
  {
    name: 'xlsx',
    description: 'Excel 表格处理',
    group: 'official',
    install: { type: 'preset', name: 'xlsx' },
  },
  {
    name: 'brand-guidelines',
    description: '品牌指南生成',
    group: 'official',
    install: { type: 'preset', name: 'brand-guidelines' },
  },
  {
    name: 'doc-coauthoring',
    description: '文档协作编写',
    group: 'official',
    install: { type: 'preset', name: 'doc-coauthoring' },
  },
  {
    name: 'internal-comms',
    description: '内部通信文档',
    group: 'official',
    install: { type: 'preset', name: 'internal-comms' },
  },
  {
    name: 'slack-gif-creator',
    description: 'Slack GIF 创建器',
    group: 'official',
    install: { type: 'preset', name: 'slack-gif-creator' },
  },

  // ===== 精选 (Featured) =====
  {
    name: 'superpowers',
    description: 'Claude Code Plan模式升级版，连续追问讨论确定开发方案',
    group: 'featured',
    install: {
      type: 'plugin',
      marketplace: 'obra/superpowers-marketplace',
      package: 'superpowers@superpowers-marketplace',
    },
  },
  {
    name: 'ui-ux-pro-max',
    description: '专业 UI/UX 设计',
    group: 'featured',
    install: {
      type: 'github',
      url: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/main/.claude/skills/ui-ux-pro-max',
    },
  },
  {
    name: 'Humanizer-zh',
    description: '去除文本中 AI 生成痕迹，改写得更自然、更像人类书写',
    group: 'featured',
    install: {
      type: 'github',
      url: 'https://github.com/op7418/Humanizer-zh',
    },
  },

  // ===== 其他 (Others) =====
  {
    name: 'skill-writer',
    description: '指导用户为 Claude Code 创建代理技能',
    group: 'others',
    install: {
      type: 'github',
      url: 'https://github.com/pytorch/pytorch/tree/main/.claude/skills/skill-writer',
    },
  },
];

/**
 * 按分组获取 skills
 */
export function getSkillsByGroup(group: SkillGroup): SkillPreset[] {
  return SKILL_PRESETS.filter(p => p.group === group);
}

/**
 * 获取所有分组（按顺序）
 */
export function getGroupOrder(): SkillGroup[] {
  return ['official', 'featured', 'others'];
}

/**
 * 解析 GitHub URL
 * 支持格式:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo/tree/branch/path
 * - owner/repo
 */
export function parseGitHubUrl(url: string): {
  owner: string;
  repo: string;
  branch: string;
  path: string;
} | null {
  // 处理简短格式 owner/repo
  if (/^[\w-]+\/[\w-]+$/.test(url)) {
    const [owner, repo] = url.split('/');
    return { owner, repo, branch: 'main', path: '' };
  }

  // 处理完整 GitHub URL
  const match = url.match(
    /github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+)(?:\/(.*))?)?/
  );

  if (!match) return null;

  const [, owner, repo, branch = 'main', repoPath = ''] = match;
  return {
    owner,
    repo: repo.replace(/\.git$/, ''),
    branch,
    path: repoPath,
  };
}

/**
 * 获取 skills 目录路径
 */
export function getSkillsDir(): string {
  return path.join(process.cwd(), '.claude', 'skills');
}

/**
 * 确保 skills 目录存在，并清理残留的临时目录
 */
export function ensureSkillsDir(): string {
  const skillsDir = getSkillsDir();
  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  } else {
    // 清理可能残留的临时目录
    cleanupTempDirs(skillsDir);
  }
  return skillsDir;
}

/**
 * 清理临时目录
 */
function cleanupTempDirs(skillsDir: string): void {
  try {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('.tmp-')) {
        const tmpPath = path.join(skillsDir, entry.name);
        fs.rmSync(tmpPath, { recursive: true });
      }
    }
  } catch {
    // 忽略清理错误
  }
}

/**
 * 使用 git sparse-checkout 下载指定目录
 */
export function downloadSkillWithGit(
  owner: string,
  repo: string,
  branch: string,
  repoPath: string,
  targetName: string
): boolean {
  const skillsDir = ensureSkillsDir();
  const targetDir = path.join(skillsDir, targetName);

  // 检查是否已存在
  if (fs.existsSync(targetDir)) {
    console.log(chalk.yellow(`Skill "${targetName}" already exists. Updating...`));
    fs.rmSync(targetDir, { recursive: true });
  }

  const repoUrl = `https://github.com/${owner}/${repo}.git`;
  const tempDir = path.join(skillsDir, `.tmp-${Date.now()}`);

  try {
    // 创建临时目录并初始化 sparse-checkout
    fs.mkdirSync(tempDir, { recursive: true });

    // 使用 git sparse-checkout 只下载指定目录
    execSync(`git init`, { cwd: tempDir, stdio: 'pipe' });
    execSync(`git remote add origin ${repoUrl}`, { cwd: tempDir, stdio: 'pipe' });
    execSync(`git config core.sparseCheckout true`, { cwd: tempDir, stdio: 'pipe' });

    // 配置 sparse-checkout
    const sparseFile = path.join(tempDir, '.git', 'info', 'sparse-checkout');
    fs.writeFileSync(sparseFile, repoPath ? `${repoPath}/\n` : '*\n');

    // 拉取指定分支
    execSync(`git pull --depth=1 origin ${branch}`, { cwd: tempDir, stdio: 'pipe' });

    // 移动目标目录到 skills
    const sourceDir = repoPath ? path.join(tempDir, repoPath) : tempDir;

    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Path "${repoPath}" not found in repository`);
    }

    // 复制文件（排除 .git）
    copyDir(sourceDir, targetDir);

    console.log(chalk.green(`Successfully installed skill "${targetName}"`));
    return true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Failed to download skill: ${errMsg}`));
    return false;
  } finally {
    // 清理临时目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  }
}

/**
 * 复制目录（排除 .git）
 */
function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git') continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 从 GitHub 添加 skill
 */
export function addSkillFromGitHub(urlOrPreset: string): boolean {
  // 检查是否是预设名称
  const preset = SKILL_PRESETS.find(p => p.name === urlOrPreset);
  if (preset) {
    // 根据安装方式处理
    if (preset.install.type === 'preset') {
      // 官方预设：从 anthropics/skills 仓库安装
      return downloadSkillWithGit(
        'anthropics',
        'skills',
        'main',
        `skills/${preset.install.name}`,
        preset.name
      );
    } else if (preset.install.type === 'github') {
      // GitHub URL 安装
      const parsed = parseGitHubUrl(preset.install.url);
      if (!parsed) {
        console.error(chalk.red(`Invalid GitHub URL in preset: ${preset.install.url}`));
        return false;
      }
      return downloadSkillWithGit(
        parsed.owner,
        parsed.repo,
        parsed.branch,
        parsed.path,
        preset.name
      );
    } else if (preset.install.type === 'plugin') {
      // Plugin 安装（暂不支持，提示用户）
      console.error(chalk.yellow(`Plugin installation not yet supported for "${preset.name}"`));
      console.log(chalk.gray(`Marketplace: ${preset.install.marketplace}`));
      console.log(chalk.gray(`Package: ${preset.install.package}`));
      return false;
    }
  }

  // 解析 GitHub URL
  const parsed = parseGitHubUrl(urlOrPreset);
  if (!parsed) {
    console.error(chalk.red('Invalid GitHub URL or preset name'));
    console.log(chalk.gray('Examples:'));
    console.log(chalk.gray('  ccem skill add frontend-design'));
    console.log(chalk.gray('  ccem skill add https://github.com/owner/repo'));
    console.log(chalk.gray('  ccem skill add https://github.com/owner/repo/tree/main/path'));
    return false;
  }

  // 确定 skill 名称
  let skillName: string;
  if (parsed.path) {
    // 使用路径最后一部分作为名称
    skillName = path.basename(parsed.path);
  } else {
    // 使用仓库名作为名称
    skillName = parsed.repo;
  }

  return downloadSkillWithGit(
    parsed.owner,
    parsed.repo,
    parsed.branch,
    parsed.path,
    skillName
  );
}

/**
 * 列出已安装的 skills
 */
export function listInstalledSkills(): { name: string; path: string }[] {
  const skillsDir = getSkillsDir();

  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => ({
      name: entry.name,
      path: path.join(skillsDir, entry.name),
    }));
}

/**
 * 删除已安装的 skill
 */
export function removeSkill(name: string): boolean {
  const skillsDir = getSkillsDir();
  const targetDir = path.join(skillsDir, name);

  if (!fs.existsSync(targetDir)) {
    console.error(chalk.red(`Skill "${name}" not found`));
    return false;
  }

  fs.rmSync(targetDir, { recursive: true });
  console.log(chalk.green(`Removed skill "${name}"`));
  return true;
}

/**
 * 从 Plugin Marketplace 安装 skill
 */
export function installFromPluginMarketplace(
  marketplace: string,
  packageName: string
): boolean {
  try {
    console.log(chalk.cyan(`Adding marketplace: ${marketplace}...`));
    execSync(`claude plugin marketplace add ${marketplace}`, { stdio: 'inherit' });

    console.log(chalk.cyan(`Installing package: ${packageName}...`));
    execSync(`claude plugin install ${packageName}`, { stdio: 'inherit' });

    console.log(chalk.green(`Successfully installed ${packageName}`));
    return true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Failed to install from marketplace: ${errMsg}`));
    return false;
  }
}

/**
 * 统一安装入口 - 根据 InstallMethod 类型选择安装方式
 */
export function installSkill(preset: SkillPreset): boolean {
  console.log(chalk.cyan(`Installing ${preset.name}...`));

  switch (preset.install.type) {
    case 'preset':
      // 官方预设：使用现有的 GitHub 下载逻辑
      const officialPreset = {
        repo: 'anthropics/skills',
        path: `skills/${preset.install.name}`,
        branch: 'main',
      };
      const [owner, repo] = officialPreset.repo.split('/');
      return downloadSkillWithGit(
        owner,
        repo,
        officialPreset.branch,
        officialPreset.path,
        preset.name
      );

    case 'github':
      // GitHub URL：直接使用 URL 安装
      return addSkillFromGitHub(preset.install.url);

    case 'plugin':
      // Plugin Marketplace：使用 claude 命令安装
      return installFromPluginMarketplace(
        preset.install.marketplace,
        preset.install.package
      );
  }
}
