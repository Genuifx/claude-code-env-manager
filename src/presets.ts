import type { EnvConfig, PermissionPreset, PermissionModeName } from './types.js';

// 环境预设（API 提供商）
export const ENV_PRESETS: Record<string, Omit<EnvConfig, 'ANTHROPIC_API_KEY'>> = {
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

// 权限预设
export const PERMISSION_PRESETS: Record<PermissionModeName, PermissionPreset> = {
  'yolo': {
    name: 'YOLO 模式',
    description: '全部放开，无任何限制',
    permissions: {
      allow: [
        'Bash(*)',
        'Read(*)',
        'Edit(*)',
        'Write(*)',
        'WebFetch(*)',
        'WebSearch(*)',
        'Glob(*)',
        'Grep(*)',
        'LSP(*)',
        'NotebookEdit(*)'
      ],
      deny: []
    }
  },

  'dev': {
    name: '开发模式',
    description: '日常开发权限，保护敏感文件',
    permissions: {
      allow: [
        'Read(*)',
        'Edit(*)',
        'Write(*)',
        'Glob(*)',
        'Grep(*)',
        'LSP(*)',
        'NotebookEdit(*)',
        'Bash(npm:*)',
        'Bash(pnpm:*)',
        'Bash(yarn:*)',
        'Bash(bun:*)',
        'Bash(node:*)',
        'Bash(npx:*)',
        'Bash(git:*)',
        'Bash(tsc:*)',
        'Bash(tsx:*)',
        'Bash(eslint:*)',
        'Bash(prettier:*)',
        'Bash(jest:*)',
        'Bash(vitest:*)',
        'Bash(cargo:*)',
        'Bash(python:*)',
        'Bash(pip:*)',
        'Bash(go:*)',
        'Bash(make:*)',
        'Bash(cmake:*)',
        'Bash(ls:*)',
        'Bash(cat:*)',
        'Bash(head:*)',
        'Bash(tail:*)',
        'Bash(find:*)',
        'Bash(wc:*)',
        'Bash(mkdir:*)',
        'Bash(cp:*)',
        'Bash(mv:*)',
        'Bash(touch:*)',
        'WebSearch'
      ],
      deny: [
        'Read(.env)',
        'Read(.env.*)',
        'Read(**/secrets/**)',
        'Read(**/*.pem)',
        'Read(**/*.key)',
        'Read(**/*credential*)',
        'Bash(rm -rf:*)',
        'Bash(sudo:*)',
        'Bash(chmod:*)',
        'Bash(chown:*)'
      ]
    }
  },

  'readonly': {
    name: '只读模式',
    description: '仅允许读取和搜索，禁止任何修改',
    permissions: {
      allow: [
        'Read(*)',
        'Glob(*)',
        'Grep(*)',
        'LSP(*)',
        'Bash(git status:*)',
        'Bash(git log:*)',
        'Bash(git diff:*)',
        'Bash(git branch:*)',
        'Bash(git show:*)',
        'Bash(ls:*)',
        'Bash(cat:*)',
        'Bash(head:*)',
        'Bash(tail:*)',
        'Bash(find:*)',
        'Bash(wc:*)',
        'Bash(file:*)',
        'WebSearch'
      ],
      deny: [
        'Edit(*)',
        'Write(*)',
        'NotebookEdit(*)',
        'Bash(rm:*)',
        'Bash(mv:*)',
        'Bash(cp:*)',
        'Bash(mkdir:*)',
        'Bash(touch:*)',
        'Bash(git add:*)',
        'Bash(git commit:*)',
        'Bash(git push:*)',
        'Bash(git checkout:*)',
        'Bash(git reset:*)',
        'Bash(npm install:*)',
        'Bash(pnpm install:*)',
        'Bash(yarn add:*)'
      ]
    }
  },

  'safe': {
    name: '安全模式',
    description: '保守权限，适合不熟悉的代码库',
    permissions: {
      allow: [
        'Read(*)',
        'Glob(*)',
        'Grep(*)',
        'LSP(*)',
        'Bash(git status:*)',
        'Bash(git log:*)',
        'Bash(git diff:*)',
        'Bash(ls:*)',
        'Bash(cat:*)',
        'Bash(head:*)',
        'Bash(tail:*)',
        'Bash(find:*)',
        'Bash(wc:*)'
      ],
      deny: [
        'Read(.env)',
        'Read(.env.*)',
        'Read(**/secrets/**)',
        'Read(**/*.pem)',
        'Read(**/*.key)',
        'Read(**/*credential*)',
        'Read(**/*password*)',
        'Edit(*)',
        'Write(*)',
        'NotebookEdit(*)',
        'Bash(curl:*)',
        'Bash(wget:*)',
        'Bash(ssh:*)',
        'Bash(scp:*)',
        'Bash(rm:*)',
        'Bash(mv:*)',
        'WebFetch(*)'
      ]
    }
  },

  'ci': {
    name: 'CI/CD 模式',
    description: '适合自动化流水线的权限',
    permissions: {
      allow: [
        'Read(*)',
        'Edit(*)',
        'Write(*)',
        'Glob(*)',
        'Grep(*)',
        'LSP(*)',
        'Bash(npm:*)',
        'Bash(pnpm:*)',
        'Bash(yarn:*)',
        'Bash(node:*)',
        'Bash(git:*)',
        'Bash(docker:*)',
        'Bash(make:*)',
        'Bash(cargo:*)',
        'Bash(go:*)',
        'Bash(python:*)',
        'Bash(pip:*)',
        'Bash(pytest:*)',
        'Bash(jest:*)',
        'Bash(vitest:*)'
      ],
      deny: [
        'Read(.env.local)',
        'Read(**/secrets/**)',
        'Bash(sudo:*)',
        'Bash(ssh:*)',
        'Bash(scp:*)',
        'WebFetch(*)',
        'WebSearch'
      ]
    }
  },

  'audit': {
    name: '审计模式',
    description: '仅读取和搜索，用于安全审计',
    permissions: {
      allow: [
        'Read(*)',
        'Glob(*)',
        'Grep(*)',
        'LSP(*)',
        'Bash(git log:*)',
        'Bash(git blame:*)',
        'Bash(git show:*)',
        'Bash(git diff:*)',
        'Bash(ls:*)',
        'Bash(find:*)',
        'Bash(wc:*)',
        'Bash(file:*)',
        'Bash(stat:*)'
      ],
      deny: [
        'Edit(*)',
        'Write(*)',
        'NotebookEdit(*)',
        'Bash(rm:*)',
        'Bash(mv:*)',
        'Bash(cp:*)',
        'Bash(curl:*)',
        'Bash(wget:*)',
        'Bash(ssh:*)',
        'WebFetch(*)'
      ]
    }
  }
};

// 获取所有权限模式名称
export const getPermissionModeNames = (): PermissionModeName[] => {
  return Object.keys(PERMISSION_PRESETS) as PermissionModeName[];
};

// 权限模式图标
const MODE_ICONS: Record<PermissionModeName, string> = {
  yolo: '🔓',
  dev: '💻',
  readonly: '👀',
  safe: '🛡️',
  ci: '🔧',
  audit: '🔍'
};

/**
 * 获取权限模式图标
 */
export const getModeIcon = (modeName: PermissionModeName): string => {
  return MODE_ICONS[modeName] || '📋';
};

/**
 * 简化工具列表显示
 * 将 Bash(npm:*), Bash(git:*) 等合并为 Bash(npm/git/...)
 */
const summarizeTools = (tools: string[], maxLength: number = 50): string => {
  if (tools.length === 0) return '无';

  // 分组 Bash 命令
  const bashTools: string[] = [];
  const otherTools: string[] = [];

  tools.forEach(tool => {
    const bashMatch = tool.match(/^Bash\(([^:]+):\*\)$/);
    if (bashMatch) {
      bashTools.push(bashMatch[1]);
    } else if (tool.startsWith('Bash(')) {
      // 处理其他 Bash 格式如 Bash(*)
      otherTools.push(tool);
    } else {
      otherTools.push(tool);
    }
  });

  const parts: string[] = [];

  // 添加其他工具
  otherTools.forEach(tool => {
    parts.push(tool);
  });

  // 合并 Bash 命令
  if (bashTools.length > 0) {
    if (bashTools.length <= 3) {
      parts.push(`Bash(${bashTools.join('/')})`);
    } else {
      parts.push(`Bash(${bashTools.slice(0, 3).join('/')}...)`);
    }
  }

  // 截断过长的结果
  let result = parts.join(', ');
  if (result.length > maxLength) {
    // 找到合适的截断点
    const truncated = result.substring(0, maxLength);
    const lastComma = truncated.lastIndexOf(', ');
    if (lastComma > 0) {
      result = truncated.substring(0, lastComma) + '...';
    } else {
      result = truncated + '...';
    }
  }

  return result;
};

/**
 * 生成权限模式的详细描述（用于交互菜单）
 */
export const formatPermissionDescription = (modeName: PermissionModeName): string => {
  const preset = PERMISSION_PRESETS[modeName];

  const allowSummary = summarizeTools(preset.permissions.allow);
  const denySummary = preset.permissions.deny.length > 0
    ? summarizeTools(preset.permissions.deny)
    : '无限制';

  return `✅ ${allowSummary}\n     ❌ ${denySummary}`;
};
