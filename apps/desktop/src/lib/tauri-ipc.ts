/**
 * Tauri IPC 类型映射
 *
 * 这个文件定义了前端与 Rust 后端之间的 IPC 契约。
 * 每个命令都有明确的输入和输出类型。
 *
 * 格式：[输入类型, 输出类型]
 */

import type { Environment, Session } from '@/store';

// ============================================
// Environment Commands
// ============================================

export interface TauriCommands {
  // 环境管理
  get_environments: [void, Record<string, Environment>];
  get_current_env: [void, string | null];
  set_current_env: [{ name: string }, void];
  add_environment: [
    {
      name: string;
      baseUrl: string;
      apiKey?: string;
      model: string;
      smallModel?: string;
    },
    void
  ];
  update_environment: [
    {
      oldName: string;
      name: string;
      baseUrl: string;
      apiKey?: string;
      model: string;
      smallModel?: string;
    },
    void
  ];
  delete_environment: [{ name: string }, void];

  // 应用配置
  get_app_config: [void, AppConfig];
  add_favorite: [{ path: string; name: string }, void];
  remove_favorite: [{ path: string }, void];
  add_recent: [{ path: string }, void];
  save_settings: [{ settings: DesktopSettings }, void];

  // 会话管理
  launch_claude_code: [
    {
      envName: string;
      permMode?: string;
      workingDir?: string;
      resumeSessionId?: string;
    },
    Session
  ];
  list_sessions: [void, Session[]];
  stop_session: [{ sessionId: string }, void];  // 修正：后端参数是 session_id
  remove_session: [{ id: string }, void];
  focus_session: [{ id: string }, void];
  close_session: [{ id: string }, void];
  minimize_session: [{ id: string }, void];
  arrange_sessions: [{ layout: string }, void];
  check_arrange_support: [void, boolean];

  // 使用统计
  get_usage_stats: [void, UsageStats];
  get_usage_history: [{ days: number }, UsageHistoryEntry[]];
  get_continuous_usage_days: [void, number];

  // 历史记录
  get_conversation_history: [void, ConversationHistoryEntry[]];
  get_conversation_messages: [{ projectId: string }, ConversationMessage[]];
  get_conversation_segments: [
    { projectId: string },
    ConversationSegment[]
  ];

  // Skills
  search_skills_stream: [{ query: string }, void];
  list_installed_skills: [void, InstalledSkill[]];
  install_skill: [{ packageId: string; global: boolean }, void];  // 修正：后端参数是 package_id + global
  uninstall_skill: [{ name: string }, void];

  // Cron 任务
  list_cron_tasks: [void, CronTask[]];
  add_cron_task: [
    {
      name: string;
      schedule: string;
      command: string;
      enabled: boolean;
    },
    void
  ];
  update_cron_task: [
    {
      id: string;
      name: string;
      schedule: string;
      command: string;
      enabled: boolean;
    },
    void
  ];
  delete_cron_task: [{ id: string }, void];
  toggle_cron_task: [{ id: string }, void];
  get_cron_task_runs: [{ taskId: string }, CronTaskRun[]];
  retry_cron_task: [{ id: string }, void];
  get_cron_run_detail: [{ runId: string }, CronRunDetail];
  list_cron_templates: [void, CronTemplate[]];
  get_cron_next_runs: [{ schedule: string; count: number }, string[]];
  generate_cron_task_stream: [{ prompt: string }, void];

  // 终端
  detect_terminals: [void, TerminalInfo[]];
  get_preferred_terminal: [void, string | null];
  set_preferred_terminal: [{ terminalType: string }, void];

  // IDE 同步
  sync_vscode_projects: [void, VSCodeProject[]];
  sync_jetbrains_projects: [void, JetBrainsProject[]];
  open_directory_dialog: [void, string | null];

  // 远程加载
  load_from_remote: [
    { url: string; secret: string },
    LoadResult
  ];

  // 其他
  check_ccem_installed: [void, boolean];
  get_default_working_dir: [void, string | null];
}

// ============================================
// 类型定义
// ============================================

export interface AppConfig {
  favorites: FavoriteProject[];
  recent: RecentProject[];
  vscodeProjects: VSCodeProject[];
  jetbrainsProjects: JetBrainsProject[];
  defaultWorkingDir?: string;
}

export interface FavoriteProject {
  path: string;
  name: string;
}

export interface RecentProject {
  path: string;
  lastUsed: string;
}

export interface VSCodeProject {
  path: string;
  syncedAt: string;
}

export interface JetBrainsProject {
  path: string;
  ide: string;
  syncedAt: string;
}

export interface DesktopSettings {
  theme: string;
  autoStart: boolean;
  startMinimized: boolean;
  closeToTray: boolean;
  defaultMode?: string;
}

export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface UsageHistoryEntry {
  date: string;
  tokens: number;
  cost: number;
}

export interface ConversationHistoryEntry {
  projectId: string;
  projectName: string;
  lastModified: string;
  messageCount: number;
}

export interface ConversationMessage {
  role: string;
  content: string;
  timestamp: string;
}

export interface ConversationSegment {
  index: number;
  startMessage: number;
  endMessage: number;
  messageCount: number;
}

export interface InstalledSkill {
  name: string;
  description?: string;
  version?: string;
}

export interface CronTask {
  id: string;
  name: string;
  schedule: string;
  command: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

export interface CronTaskRun {
  id: string;
  taskId: string;
  startTime: string;
  endTime?: string;
  status: string;
  exitCode?: number;
}

export interface CronRunDetail {
  id: string;
  taskId: string;
  startTime: string;
  endTime?: string;
  status: string;
  exitCode?: number;
  output: string;
}

export interface CronTemplate {
  name: string;
  description: string;
  schedule: string;
  command: string;
}

export interface TerminalInfo {
  terminalType: string;
  displayName: string;
  available: boolean;
}

export interface LoadResult {
  count: number;
  environments: LoadedEnv[];
}

export interface LoadedEnv {
  name: string;
  originalName: string;
  renamed: boolean;
}
