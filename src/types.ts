// 环境配置类型
export interface EnvConfig {
  ANTHROPIC_BASE_URL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  ANTHROPIC_SMALL_FAST_MODEL?: string;
}

// Claude Code 权限配置类型
export interface PermissionConfig {
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
  [key: string]: unknown; // 保留其他配置字段
}

// 权限预设类型
export interface PermissionPreset {
  name: string;
  description: string;
  permissions: {
    allow: string[];
    deny: string[];
  };
}

// 权限模式名称
export type PermissionModeName = 'yolo' | 'dev' | 'readonly' | 'safe' | 'ci' | 'audit';
