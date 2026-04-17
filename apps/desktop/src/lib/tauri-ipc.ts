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
      authToken?: string;
      defaultOpusModel: string;
      defaultSonnetModel?: string;
      defaultHaikuModel?: string;
      runtimeModel?: string;
      subagentModel?: string;
    },
    void
  ];
  update_environment: [
    {
      oldName: string;
      name: string;
      baseUrl: string;
      authToken?: string;
      defaultOpusModel: string;
      defaultSonnetModel?: string;
      defaultHaikuModel?: string;
      runtimeModel?: string;
      subagentModel?: string;
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
  get_telegram_settings: [void, TelegramSettings];
  save_telegram_settings: [{ settings: TelegramSettings }, void];
  get_telegram_bridge_status: [void, TelegramBridgeStatus];
  start_telegram_bridge: [void, TelegramBridgeStatus];
  stop_telegram_bridge: [void, TelegramBridgeStatus];
  get_weixin_settings: [void, WeixinSettings];
  save_weixin_settings: [{ settings: WeixinSettings }, void];
  get_weixin_bridge_status: [void, WeixinBridgeStatus];
  start_weixin_bridge: [void, WeixinBridgeStatus];
  stop_weixin_bridge: [void, WeixinBridgeStatus];
  start_weixin_login: [void, WeixinLoginSession];
  poll_weixin_login: [{ sessionKey: string }, WeixinLoginSession];
  get_telegram_forum_topics: [void, TelegramForumTopic[]];
  bind_telegram_topic: [
    {
      projectDir: string;
      envName?: string | null;
      permMode?: string | null;
      threadId?: number | null;
      createNewTopic: boolean;
    },
    TelegramTopicBinding
  ];
  get_proxy_debug_state: [void, ProxyDebugState];
  set_proxy_debug_enabled: [{ enabled: boolean }, ProxyDebugState];
  update_proxy_debug_config: [
    { codexUpstreamBaseUrl: string; recordMode?: string | null },
    ProxyDebugState
  ];
  list_proxy_traffic: [{ limit: number; cursor?: string | null }, ProxyTrafficPage];
  get_proxy_traffic_detail: [{ id: string }, ProxyTrafficDetail];
  clear_proxy_traffic: [void, void];
  open_text_in_vscode: [{ content: string; suggestedName?: string | null }, string];
  window_control: [
    {
      action: 'close' | 'minimize' | 'toggle-fullscreen' | 'exit-fullscreen';
    },
    void
  ];

  // 会话管理
  launch_claude_code: [
    {
      envName: string;
      permMode?: string;
      workingDir?: string;
      resumeSessionId?: string;
      client?: 'claude' | 'codex' | 'opencode' | null;
    },
    Session
  ];
  create_interactive_session: [
    {
      envName: string;
      permMode?: string | null;
      workingDir?: string | null;
      resumeSessionId?: string | null;
      client?: 'claude' | 'codex' | 'opencode' | null;
    },
    Session
  ];
  list_interactive_sessions: [void, Session[]];
  list_runtime_recovery_candidates: [void, RuntimeRecoveryCandidate[]];
  dismiss_runtime_recovery_candidate: [{ runtimeId: string }, void];
  stop_interactive_session: [{ sessionId: string }, void];
  focus_interactive_session: [{ sessionId: string }, void];
  open_interactive_session_in_terminal: [
    { sessionId: string; terminalType?: TmuxAttachTerminalType | null },
    void
  ];
  close_interactive_session: [{ sessionId: string }, void];
  minimize_interactive_session: [{ sessionId: string }, void];
  write_interactive_input: [{ sessionId: string; data: string }, void];
  get_interactive_session_output: [
    { sessionId: string; sinceSeq?: number | null },
    InteractiveReplayBatch
  ];
  get_interactive_session_events: [
    { sessionId: string; sinceSeq?: number | null },
    ReplayBatch
  ];
  list_unified_sessions: [void, UnifiedSessionInfo[]];
  get_session_events: [
    { runtimeId: string; sinceSeq?: number | null },
    ReplayBatch
  ];
  send_session_input: [
    { runtimeId: string; input: RuntimeInput },
    void
  ];
  stop_unified_session: [{ runtimeId: string }, void];
  attach_channel: [{ runtimeId: string; channel: ChannelKind }, void];
  detach_channel: [{ runtimeId: string; channel: ChannelKind }, void];
  debug_compare_sessions: [void, UnifiedSessionDebugComparison];
  resize_interactive_session: [{ sessionId: string; cols: number; rows: number }, void];
  create_managed_session: [
    {
      envName: string;
      permMode?: string | null;
      workingDir?: string | null;
      resumeSessionId?: string | null;
      initialPrompt?: string | null;
    },
    ManagedSessionSummary
  ];
  create_headless_session: [
    {
      envName: string;
      permMode?: string | null;
      workingDir?: string | null;
      resumeSessionId?: string | null;
      initialPrompt?: string | null;
    },
    HeadlessSessionSummary
  ];
  list_managed_sessions: [void, ManagedSessionSummary[]];
  list_headless_sessions: [void, HeadlessSessionSummary[]];
  send_to_managed_session: [
    {
      runtimeId: string;
      text: string;
    },
    void
  ];
  send_to_headless_session: [
    {
      runtimeId: string;
      text: string;
    },
    void
  ];
  get_managed_session_events: [
    {
      runtimeId: string;
      sinceSeq?: number | null;
    },
    ReplayBatch
  ];
  get_headless_session_events: [
    {
      runtimeId: string;
      sinceSeq?: number | null;
    },
    ReplayBatch
  ];
  stop_managed_session: [
    {
      runtimeId: string;
    },
    void
  ];
  remove_managed_session: [
    {
      runtimeId: string;
    },
    void
  ];
  stop_headless_session: [
    {
      runtimeId: string;
    },
    void
  ];
  respond_headless_permission: [
    {
      requestId: string;
      approved: boolean;
      responder?: string | null;
    },
    void
  ];
  remove_headless_session: [
    {
      runtimeId: string;
    },
    void
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
  check_ccem_installed: [void, boolean];
  check_claude_installed: [void, boolean];
  check_codex_installed: [void, boolean];
  check_opencode_installed: [void, boolean];
  check_tmux_installed: [void, boolean];

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
      cronExpression: string;
      prompt: string;
      workingDir: string;
      envName?: string | null;
      executionProfile?: 'conservative' | 'standard' | 'autonomous' | null;
      maxBudgetUsd?: number | null;
      allowedTools?: string[] | null;
      disallowedTools?: string[] | null;
      timeoutSecs?: number;
      templateId?: string | null;
    },
    CronTask
  ];
  update_cron_task: [
    {
      id: string;
      name?: string;
      cronExpression?: string;
      prompt?: string;
      workingDir?: string;
      envName?: string | null;
      executionProfile?: 'conservative' | 'standard' | 'autonomous' | null;
      maxBudgetUsd?: number | null;
      allowedTools?: string[] | null;
      disallowedTools?: string[] | null;
      timeoutSecs?: number;
    },
    CronTask
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
  list_tmux_attach_terminals: [void, TmuxAttachTerminalInfo[]];
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
  desktopNotificationsEnabled?: boolean;
  notifyOnTaskCompleted?: boolean;
  notifyOnTaskFailed?: boolean;
  notifyOnActionRequired?: boolean;
  defaultMode?: string;
  proxyDebugEnabled?: boolean;
  proxyDebugCodexUpstreamBaseUrl?: string;
  proxyDebugLogMaxBytes?: number;
  proxyDebugRecordMode?: string;
}

export interface TelegramSettings {
  enabled: boolean;
  botToken?: string | null;
  allowedUserIds?: number[];
  allowedChatId?: number | null;
  notificationsChatId?: number | null;
  notificationsThreadId?: number | null;
  defaultEnvName?: string | null;
  defaultPermMode?: string | null;
  defaultWorkingDir?: string | null;
  topicBindings?: TelegramTopicBinding[];
  useChannelMonitor?: boolean;
  preferences?: TelegramBridgePreferences;
}

export interface TelegramTopicBinding {
  threadId: number;
  projectDir: string;
  preferredEnv?: string | null;
  preferredPermMode?: string | null;
  activeRuntimeId?: string | null;
  lastClaudeSessionId?: string | null;
  createdAt: string;
}

export interface TelegramBridgePreferences {
  showToolCalls: boolean;
  showLowRiskTools: boolean;
  flushIntervalMs: number;
}

export interface TelegramBridgeStatus {
  configured: boolean;
  running: boolean;
  botUsername?: string | null;
  lastError?: string | null;
  allowedChatId?: number | null;
}

export interface TelegramForumTopic {
  threadId: number;
  name: string;
  iconColor?: number | null;
  isBound: boolean;
  boundProject?: string | null;
}

export interface WeixinSettings {
  enabled: boolean;
  apiBaseUrl: string;
  botToken?: string | null;
  botAccountId?: string | null;
  allowedPeerIds?: string[];
  defaultEnvName?: string | null;
  defaultPermMode?: string | null;
  defaultWorkingDir?: string | null;
  flushIntervalMs: number;
}

export interface WeixinBridgeStatus {
  configured: boolean;
  running: boolean;
  botAccountId?: string | null;
  lastError?: string | null;
}

export interface WeixinLoginSession {
  sessionKey: string;
  status: 'pending' | 'scanned' | 'confirmed' | 'expired' | 'failed' | string;
  qrCodeUrl?: string | null;
  message: string;
  botAccountId?: string | null;
  expiresAt?: string | null;
}

export interface ProxyDebugState {
  enabled: boolean;
  running: boolean;
  listenPort?: number;
  baseUrl?: string;
  codexUpstreamBaseUrl: string;
  logMaxBytes: number;
  recordMode: string;
  routeCount: number;
  metrics: ProxyMetrics;
}

export interface ProxyMetrics {
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  routeNotFoundRequests: number;
  avgResponseMs: number;
  activeConnections: number;
}

export interface ManagedSessionSummary {
  runtime_id: string;
  claude_session_id?: string | null;
  pid?: number | null;
  project_dir: string;
  env_name: string;
  perm_mode: string;
  source: ManagedSessionSource;
  status: string;
  created_at: string;
  is_active: boolean;
  last_event_seq?: number | null;
}

export type ManagedSessionSource =
  | { type: 'desktop' }
  | { type: 'telegram'; chat_id: number; thread_id: number }
  | { type: 'weixin'; peer_id: string }
  | { type: 'cron'; task_id: string };

export interface RuntimeRecoveryCandidate {
  runtime_id: string;
  runtime_kind: 'interactive' | 'headless';
  claude_session_id: string;
  project_dir: string;
  env_name: string;
  perm_mode: string;
  source: ManagedSessionSource;
  saved_at: string;
}

export interface InteractiveReplayBatch {
  gap_detected: boolean;
  oldest_available_seq?: number | null;
  newest_available_seq?: number | null;
  chunks: InteractiveOutputChunk[];
}

export interface InteractiveOutputChunk {
  session_id: string;
  seq: number;
  occurred_at: string;
  data: string;
}

export type HeadlessSessionSummary = ManagedSessionSummary;

export type ChannelKind =
  | { kind: 'desktop_ui' }
  | { kind: 'telegram'; chat_id: number; thread_id?: number | null }
  | { kind: 'weixin'; peer_id: string };

export interface AttachedChannelInfo {
  kind: ChannelKind;
  connected_at: string;
  label?: string | null;
}

export type RuntimeInput =
  | { type: 'message'; text: string }
  | { type: 'approval'; approved: boolean; responder?: string | null }
  | { type: 'raw_terminal'; data: string };

export interface UnifiedSessionInfo {
  id: string;
  runtime_kind: 'interactive' | 'headless';
  source: ManagedSessionSource;
  status: string;
  project_dir: string;
  env_name: string;
  perm_mode: string;
  created_at: string;
  is_active: boolean;
  pid?: number | null;
  claude_session_id?: string | null;
  tmux_target?: string | null;
  client?: string | null;
  channels: AttachedChannelInfo[];
}

export interface UnifiedSessionDebugComparison {
  headless_count: number;
  interactive_count: number;
  unified_count: number;
  matched: boolean;
}

export interface ReplayBatch {
  gap_detected: boolean;
  oldest_available_seq?: number | null;
  newest_available_seq?: number | null;
  events: SessionEventRecord[];
}

export interface SessionEventRecord {
  runtime_id: string;
  seq: number;
  occurred_at: string;
  payload: SessionEventPayload;
}

export type UserInputKind = 'question' | 'plan_entry' | 'plan_exit';

export type ToolCategory =
  | { category: 'user_input'; kind: UserInputKind; raw_name: string }
  | { category: 'file_op'; raw_name: string }
  | { category: 'execution'; raw_name: string }
  | { category: 'search'; raw_name: string }
  | { category: 'task_mgmt'; raw_name: string }
  | { category: 'unknown'; raw_name: string };

export interface ToolQuestionOption {
  label: string;
  description?: string | null;
  preview?: string | null;
}

export interface ToolQuestionPrompt {
  question: string;
  header?: string | null;
  multiSelect: boolean;
  options: ToolQuestionOption[];
}

export type InteractiveToolPrompt =
  | { prompt_type: 'ask_user_question'; questions: ToolQuestionPrompt[] }
  | { prompt_type: 'plan_entry' }
  | {
      prompt_type: 'plan_exit';
      allowed_prompts?: string[];
      plan_summary?: string | null;
    };

export type TerminalPromptKind = 'permission';

export type SessionEventPayload =
  | { type: 'system_message'; message: string }
  | { type: 'lifecycle'; stage: string; detail: string }
  | { type: 'claude_json'; message_type?: string | null; raw_json: string }
  | { type: 'stderr_line'; line: string }
  | { type: 'assistant_chunk'; text: string }
  | {
      type: 'tool_use_started';
      tool_use_id: string;
      category: ToolCategory;
      raw_name: string;
      input_summary: string;
      needs_response: boolean;
      prompt?: InteractiveToolPrompt | null;
    }
  | {
      type: 'tool_use_completed';
      tool_use_id: string;
      raw_name: string;
      result_summary: string;
      success: boolean;
    }
  | { type: 'permission_required'; request_id: string; tool_name: string }
  | { type: 'permission_responded'; request_id: string; approved: boolean; responder: string }
  | { type: 'terminal_prompt_required'; prompt_kind: TerminalPromptKind; prompt_text: string }
  | { type: 'terminal_prompt_resolved'; prompt_kind: TerminalPromptKind; approved: boolean }
  | { type: 'session_completed'; reason: string }
  | { type: 'gap_notification'; last_seen_seq: number; oldest_available_seq: number };

export interface ProxyTrafficPage {
  items: ProxyTrafficItem[];
  nextCursor?: string;
}

export interface ProxyTrafficItem {
  id: string;
  timestamp: number;
  client: string;
  sessionId: string;
  envName: string;
  method: string;
  path: string;
  query?: string;
  status: number;
  durationMs: number;
  requestBodySize: number;
  responseBodySize: number;
  promptPreview?: string;
  logDropped: boolean;
  responseIncomplete: boolean;
  logPartial: boolean;
  logDroppedBytes: number;
  reduced?: ReducedStreamLog;
}

export interface ProxyTrafficDetail {
  item: ProxyTrafficItem;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  reduced?: ReducedStreamLog;
}

export interface ReducedStreamLog {
  finalText: string;
  finishReason?: string;
  streamStatus: string;
  firstTokenMs?: number;
  totalStreamMs?: number;
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
  cronExpression: string;
  prompt: string;
  workingDir: string;
  envName?: string | null;
  executionProfile: 'conservative' | 'standard' | 'autonomous';
  maxBudgetUsd?: number | null;
  allowedTools?: string[];
  disallowedTools?: string[];
  enabled: boolean;
  timeoutSecs: number;
  templateId?: string | null;
  triggerType: string;
  parentTaskId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CronTaskRun {
  id: string;
  taskId: string;
  startedAt: string;
  finishedAt?: string | null;
  status: string;
  exitCode?: number | null;
  stdout?: string;
  stderr?: string;
  durationMs?: number | null;
  runtimeId?: string | null;
  runtimeKind?: string | null;
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

export type TmuxAttachTerminalType = 'terminalapp' | 'iterm2' | 'ghostty';

export interface TmuxAttachTerminalInfo {
  terminal_type: TmuxAttachTerminalType;
  name: string;
  installed: boolean;
  preferred: boolean;
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
