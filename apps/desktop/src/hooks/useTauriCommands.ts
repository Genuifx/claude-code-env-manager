import { invoke } from '@tauri-apps/api/core';
import { useAppStore, type Environment, type Session, type ArrangeLayout, type InstalledSkill, type CronTask, type CronTaskRun, type CronTemplate, type LaunchClient } from '@/store';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { shallow } from 'zustand/shallow';
import type {
  ChannelKind,
  HeadlessSessionSummary,
  InteractiveReplayBatch,
  ManagedSessionSummary,
  ReplayBatch,
  RuntimeInput,
  RuntimeRecoveryCandidate,
  TelegramBridgeStatus,
  TelegramForumTopic,
  TelegramSettings,
  TelegramTopicBinding,
  WeixinBridgeStatus,
  WeixinLoginSession,
  WeixinSettings,
  TmuxAttachTerminalInfo,
  TmuxAttachTerminalType,
  UnifiedSessionDebugComparison,
  UnifiedSessionInfo,
} from '@/lib/tauri-ipc';

interface TauriEnvConfig {
  ANTHROPIC_BASE_URL?: string;
  ANTHROPIC_AUTH_TOKEN?: string;
  ANTHROPIC_DEFAULT_OPUS_MODEL?: string;
  ANTHROPIC_DEFAULT_SONNET_MODEL?: string;
  ANTHROPIC_DEFAULT_HAIKU_MODEL?: string;
  ANTHROPIC_MODEL?: string;
  CLAUDE_CODE_SUBAGENT_MODEL?: string;
}

interface TauriSession {
  id: string;
  pid?: number;
  client?: string;
  env_name: string;
  perm_mode: string;
  working_dir: string;
  start_time: string;
  status: string;  // "running" | "stopped" | "interrupted"
  terminal_type?: string;  // "iterm2" | "terminalapp"
  window_id?: string;      // iTerm2 window ID
  iterm_session_id?: string; // iTerm2 session unique ID for arrange
}

interface TauriFavoriteProject {
  path: string;
  name: string;
}

interface TauriRecentProject {
  path: string;
  lastUsed: string;
}

interface TauriVSCodeProject {
  path: string;
  syncedAt: string;
}

interface TauriJetBrainsProject {
  path: string;
  ide: string;
  syncedAt: string;
}

interface TauriAppConfig {
  favorites: TauriFavoriteProject[];
  recent: TauriRecentProject[];
  vscodeProjects: TauriVSCodeProject[];
  jetbrainsProjects: TauriJetBrainsProject[];
}

interface ProxyDebugState {
  enabled: boolean;
  running: boolean;
  listenPort?: number;
  baseUrl?: string;
  codexUpstreamBaseUrl: string;
  logMaxBytes: number;
  recordMode: string;
  routeCount: number;
  metrics: {
    totalRequests: number;
    successRequests: number;
    failedRequests: number;
    routeNotFoundRequests: number;
    avgResponseMs: number;
    activeConnections: number;
  };
}

interface ProxyTrafficItem {
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
  reduced?: {
    finalText: string;
    finishReason?: string;
    streamStatus: string;
    firstTokenMs?: number;
    totalStreamMs?: number;
  };
}

interface ProxyTrafficPage {
  items: ProxyTrafficItem[];
  nextCursor?: string;
}

interface ProxyTrafficDetail {
  item: ProxyTrafficItem;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  reduced?: ProxyTrafficItem['reduced'];
}

function normalizeLaunchClient(client?: string): LaunchClient {
  return client?.toLowerCase() === 'codex' ? 'codex' : 'claude';
}

function toFrontendSession(tauriSession: TauriSession): Session {
  return {
    id: tauriSession.id,
    client: normalizeLaunchClient(tauriSession.client),
    envName: tauriSession.env_name,
    workingDir: tauriSession.working_dir,
    pid: tauriSession.pid,
    startedAt: new Date(tauriSession.start_time),
    status: tauriSession.status as Session['status'],
    permMode: tauriSession.perm_mode,
    terminalType: tauriSession.terminal_type,
    windowId: tauriSession.window_id,
    itermSessionId: tauriSession.iterm_session_id,
  };
}

export function useTauriCommands() {
  const {
    setEnvironments,
    setCurrentEnv,
    setLoading,
    setError,
    addSession,
    setSessions,
    removeSession,
    updateSessionStatus,
    setFavorites,
    setRecent,
    setVSCodeProjects,
    setJetBrainsProjects,
    setInstalledSkills,
    setCronTasks,
    setCronRuns,
    setLoadingCron,
    setDefaultWorkingDir,
  } = useAppStore(
    (state) => ({
      setEnvironments: state.setEnvironments,
      setCurrentEnv: state.setCurrentEnv,
      setLoading: state.setLoading,
      setError: state.setError,
      addSession: state.addSession,
      setSessions: state.setSessions,
      removeSession: state.removeSession,
      updateSessionStatus: state.updateSessionStatus,
      setFavorites: state.setFavorites,
      setRecent: state.setRecent,
      setVSCodeProjects: state.setVSCodeProjects,
      setJetBrainsProjects: state.setJetBrainsProjects,
      setInstalledSkills: state.setInstalledSkills,
      setCronTasks: state.setCronTasks,
      setCronRuns: state.setCronRuns,
      setLoadingCron: state.setLoadingCron,
      setDefaultWorkingDir: state.setDefaultWorkingDir,
    }),
    shallow
  );

  const getSessionDefaults = useCallback(() => {
    const { currentEnv, permissionMode, selectedWorkingDir } = useAppStore.getState();
    return { currentEnv, permissionMode, selectedWorkingDir };
  }, []);

  const loadEnvironments = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
    }
    try {
      const envs = await invoke<Record<string, TauriEnvConfig>>('get_environments');
      const envList: Environment[] = Object.entries(envs).map(([name, config]) => ({
        name,
        baseUrl: config.ANTHROPIC_BASE_URL || '',
        authToken: config.ANTHROPIC_AUTH_TOKEN,
        defaultOpusModel: config.ANTHROPIC_DEFAULT_OPUS_MODEL || '',
        defaultSonnetModel: config.ANTHROPIC_DEFAULT_SONNET_MODEL,
        defaultHaikuModel: config.ANTHROPIC_DEFAULT_HAIKU_MODEL,
        runtimeModel: config.ANTHROPIC_MODEL || 'opus',
        subagentModel: config.CLAUDE_CODE_SUBAGENT_MODEL,
      }));
      envList.sort((a, b) => a.name.localeCompare(b.name));
      setEnvironments(envList);
      setError(null);
    } catch (err) {
      setError(`Failed to load environments: ${err}`);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [setEnvironments, setLoading, setError]);

  const loadCurrentEnv = useCallback(async () => {
    try {
      const current = await invoke<string>('get_current_env');
      setCurrentEnv(current);
    } catch (err) {
      console.error('Failed to load current env:', err);
    }
  }, [setCurrentEnv]);

  const switchEnvironment = useCallback(async (name: string) => {
    setLoading(true);
    try {
      await invoke('set_current_env', { name });
      setCurrentEnv(name);
      setError(null);
    } catch (err) {
      setError(`Failed to switch environment: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [setCurrentEnv, setLoading, setError]);

  const addEnvironment = useCallback(async (env: Environment) => {
    setLoading(true);
    try {
      await invoke('add_environment', {
        name: env.name,
        baseUrl: env.baseUrl,
        authToken: env.authToken,
        defaultOpusModel: env.defaultOpusModel,
        defaultSonnetModel: env.defaultSonnetModel,
        defaultHaikuModel: env.defaultHaikuModel,
        runtimeModel: env.runtimeModel,
        subagentModel: env.subagentModel,
      });
      await loadEnvironments();
      setError(null);
    } catch (err) {
      setError(`Failed to add environment: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [loadEnvironments, setLoading, setError]);

  const updateEnvironment = useCallback(async (env: Environment, oldName?: string) => {
    setLoading(true);
    try {
      await invoke('update_environment', {
        oldName: oldName ?? env.name,
        name: env.name,
        baseUrl: env.baseUrl,
        authToken: env.authToken,
        defaultOpusModel: env.defaultOpusModel,
        defaultSonnetModel: env.defaultSonnetModel,
        defaultHaikuModel: env.defaultHaikuModel,
        runtimeModel: env.runtimeModel,
        subagentModel: env.subagentModel,
      });
      await loadEnvironments();
      await loadCurrentEnv();
      setError(null);
    } catch (err) {
      setError(`Failed to update environment: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [loadEnvironments, loadCurrentEnv, setLoading, setError]);

  const deleteEnvironment = useCallback(async (name: string) => {
    setLoading(true);
    try {
      await invoke('delete_environment', { name });
      await loadEnvironments();
      setError(null);
    } catch (err) {
      setError(`Failed to delete environment: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [loadEnvironments, setLoading, setError]);

  const syncInteractiveSessions = useCallback(async (): Promise<Session[]> => {
    const tauriSessions = await invoke<TauriSession[]>('list_interactive_sessions');
    const sessions = tauriSessions.map(toFrontendSession);
    setSessions(sessions);
    return sessions;
  }, [setSessions]);

  const loadAppConfig = useCallback(async () => {
    try {
      const config = await invoke<TauriAppConfig>('get_app_config');
      setFavorites(config.favorites);
      setRecent(config.recent);
      setVSCodeProjects(config.vscodeProjects);
      setJetBrainsProjects(config.jetbrainsProjects || []);
    } catch (err) {
      console.error('Failed to load app config:', err);
    }
    // Also load default working dir
    try {
      const dir = await invoke<string | null>('get_default_working_dir');
      setDefaultWorkingDir(dir);
    } catch {
      // ignore
    }
  }, [setFavorites, setRecent, setVSCodeProjects, setJetBrainsProjects, setDefaultWorkingDir]);

  const createInteractiveSession = useCallback(async (options: {
    envName?: string;
    permMode?: string;
    workingDir?: string | null;
    resumeSessionId?: string | null;
    client?: LaunchClient;
  } = {}): Promise<Session> => {
    setLoading(true);
    try {
      const { currentEnv, permissionMode, selectedWorkingDir } = getSessionDefaults();
      const workDir = options.workingDir ?? selectedWorkingDir ?? null;
      const tauriSession = await invoke<TauriSession>('create_interactive_session', {
        envName: options.envName ?? currentEnv,
        permMode: options.permMode ?? permissionMode,
        workingDir: workDir,
        resumeSessionId: options.resumeSessionId ?? null,
        client: options.client ?? 'claude',
      });
      const session = toFrontendSession(tauriSession);

      addSession(session);

      // Add to recent projects if a working directory was used
      if (workDir) {
        await invoke('add_recent', { path: workDir });
        await loadAppConfig(); // Refresh store so UI shows the new recent entry
      }

      setError(null);

      if (session.terminalType === 'embedded') {
        try {
          await invoke('open_interactive_session_in_terminal', {
            sessionId: session.id,
            terminalType: null,
          });
          await syncInteractiveSessions();
        } catch (openErr) {
          console.error('Interactive session created but failed to open terminal:', openErr);
          toast.error(`Session created, but failed to open terminal: ${openErr}`);
        }
      }

      return session;
    } catch (err) {
      const clientLabel = options.client === 'codex' ? 'Codex' : 'Claude Code';
      setError(`Failed to launch ${clientLabel}: ${err}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [
    addSession,
    getSessionDefaults,
    loadAppConfig,
    setLoading,
    setError,
    syncInteractiveSessions,
  ]);

  const launchClaudeCode = useCallback(async (
    workingDir?: string,
    resumeSessionId?: string,
    client: LaunchClient = 'claude',
  ) => {
    await createInteractiveSession({
      workingDir: workingDir ?? null,
      resumeSessionId: resumeSessionId ?? null,
      client,
    });
  }, [createInteractiveSession]);

  const listInteractiveSessions = useCallback(async (): Promise<Session[]> => {
    return syncInteractiveSessions();
  }, [syncInteractiveSessions]);

  const listRuntimeRecoveryCandidates = useCallback(async (): Promise<RuntimeRecoveryCandidate[]> => {
    return invoke<RuntimeRecoveryCandidate[]>('list_runtime_recovery_candidates');
  }, []);

  const dismissRuntimeRecoveryCandidate = useCallback(async (runtimeId: string): Promise<void> => {
    await invoke('dismiss_runtime_recovery_candidate', { runtimeId });
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      await listInteractiveSessions();
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }, [listInteractiveSessions]);

  const stopInteractiveSession = useCallback(async (sessionId: string) => {
    try {
      await invoke('stop_interactive_session', { sessionId });
      updateSessionStatus(sessionId, 'stopped');
    } catch (err) {
      setError(`Failed to stop session: ${err}`);
    }
  }, [updateSessionStatus, setError]);

  const stopSession = useCallback(async (sessionId: string) => {
    await stopInteractiveSession(sessionId);
  }, [stopInteractiveSession]);

  const writeInteractiveInput = useCallback(async (sessionId: string, data: string): Promise<void> => {
    await invoke('write_interactive_input', { sessionId, data });
  }, []);

  const getInteractiveSessionOutput = useCallback(async (
    sessionId: string,
    sinceSeq?: number | null,
  ): Promise<InteractiveReplayBatch> => {
    return invoke<InteractiveReplayBatch>('get_interactive_session_output', {
      sessionId,
      sinceSeq: sinceSeq ?? null,
    });
  }, []);

  const getInteractiveSessionEvents = useCallback(async (
    sessionId: string,
    sinceSeq?: number | null,
  ): Promise<ReplayBatch> => {
    return invoke<ReplayBatch>('get_interactive_session_events', {
      sessionId,
      sinceSeq: sinceSeq ?? null,
    });
  }, []);

  const listUnifiedSessions = useCallback(async (): Promise<UnifiedSessionInfo[]> => {
    return invoke<UnifiedSessionInfo[]>('list_unified_sessions');
  }, []);

  const getSessionEvents = useCallback(async (
    runtimeId: string,
    sinceSeq?: number | null,
  ): Promise<ReplayBatch> => {
    return invoke<ReplayBatch>('get_session_events', {
      runtimeId,
      sinceSeq: sinceSeq ?? null,
    });
  }, []);

  const sendSessionInput = useCallback(async (
    runtimeId: string,
    input: RuntimeInput,
  ): Promise<void> => {
    await invoke('send_session_input', { runtimeId, input });
  }, []);

  const stopUnifiedSession = useCallback(async (runtimeId: string): Promise<void> => {
    await invoke('stop_unified_session', { runtimeId });
  }, []);

  const attachChannel = useCallback(async (
    runtimeId: string,
    channel: ChannelKind,
  ): Promise<void> => {
    await invoke('attach_channel', { runtimeId, channel });
  }, []);

  const detachChannel = useCallback(async (
    runtimeId: string,
    channel: ChannelKind,
  ): Promise<void> => {
    await invoke('detach_channel', { runtimeId, channel });
  }, []);

  const debugCompareSessions = useCallback(async (): Promise<UnifiedSessionDebugComparison> => {
    return invoke<UnifiedSessionDebugComparison>('debug_compare_sessions');
  }, []);

  const resizeInteractiveSession = useCallback(async (
    sessionId: string,
    cols: number,
    rows: number,
  ): Promise<void> => {
    await invoke('resize_interactive_session', { sessionId, cols, rows });
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await invoke('remove_session', { sessionId });
      removeSession(sessionId);
    } catch (err) {
      setError(`Failed to remove session: ${err}`);
    }
  }, [removeSession, setError]);

  const focusSession = useCallback(async (sessionId: string) => {
    try {
      await invoke('focus_interactive_session', { sessionId });
      toast.success('Session focused successfully');
    } catch (err) {
      toast.error(`Failed to focus session: ${err}`);
    }
  }, []);

  const listTmuxAttachTerminals = useCallback(async (): Promise<TmuxAttachTerminalInfo[]> => {
    return invoke<TmuxAttachTerminalInfo[]>('list_tmux_attach_terminals');
  }, []);

  const openInteractiveSessionInTerminal = useCallback(async (
    sessionId: string,
    terminalType?: TmuxAttachTerminalType,
  ) => {
    try {
      await invoke('open_interactive_session_in_terminal', {
        sessionId,
        terminalType: terminalType ?? null,
      });
      await syncInteractiveSessions();
    } catch (err) {
      toast.error(`Failed to open session in terminal: ${err}`);
      throw err;
    }
  }, [syncInteractiveSessions]);

  const closeSession = useCallback(async (sessionId: string) => {
    try {
      await invoke('close_interactive_session', { sessionId });
      removeSession(sessionId);
      toast.success('Session closed successfully');
    } catch (err) {
      toast.error(`Failed to close session: ${err}`);
    }
  }, [removeSession]);

  const createHeadlessSession = useCallback(async (
    options: {
      envName?: string;
      permMode?: string;
      workingDir?: string | null;
      resumeSessionId?: string | null;
      initialPrompt?: string | null;
    } = {},
  ): Promise<HeadlessSessionSummary> => {
    const { currentEnv, permissionMode, selectedWorkingDir } = getSessionDefaults();
    return invoke<HeadlessSessionSummary>('create_headless_session', {
      envName: options.envName ?? currentEnv,
      permMode: options.permMode ?? permissionMode,
      workingDir: options.workingDir ?? selectedWorkingDir ?? null,
      resumeSessionId: options.resumeSessionId ?? null,
      initialPrompt: options.initialPrompt ?? null,
    });
  }, [getSessionDefaults]);

  const createManagedSession = useCallback(async (
    options: {
      envName?: string;
      permMode?: string;
      workingDir?: string | null;
      resumeSessionId?: string | null;
      initialPrompt?: string | null;
    } = {},
  ): Promise<ManagedSessionSummary> => {
    return createHeadlessSession(options);
  }, [createHeadlessSession]);

  const listHeadlessSessions = useCallback(async (): Promise<HeadlessSessionSummary[]> => {
    return invoke<HeadlessSessionSummary[]>('list_headless_sessions');
  }, []);

  const listManagedSessions = useCallback(async (): Promise<ManagedSessionSummary[]> => {
    return listHeadlessSessions();
  }, [listHeadlessSessions]);

  const sendToHeadlessSession = useCallback(async (runtimeId: string, text: string): Promise<void> => {
    await invoke('send_to_headless_session', { runtimeId, text });
  }, []);

  const sendToManagedSession = useCallback(async (runtimeId: string, text: string): Promise<void> => {
    await sendToHeadlessSession(runtimeId, text);
  }, [sendToHeadlessSession]);

  const getHeadlessSessionEvents = useCallback(async (
    runtimeId: string,
    sinceSeq?: number | null,
  ): Promise<ReplayBatch> => {
    return invoke<ReplayBatch>('get_headless_session_events', {
      runtimeId,
      sinceSeq: sinceSeq ?? null,
    });
  }, []);

  const getManagedSessionEvents = useCallback(async (
    runtimeId: string,
    sinceSeq?: number | null,
  ): Promise<ReplayBatch> => {
    return getHeadlessSessionEvents(runtimeId, sinceSeq);
  }, [getHeadlessSessionEvents]);

  const stopHeadlessSession = useCallback(async (runtimeId: string): Promise<void> => {
    await invoke('stop_headless_session', { runtimeId });
  }, []);

  const stopManagedSession = useCallback(async (runtimeId: string): Promise<void> => {
    await stopHeadlessSession(runtimeId);
  }, [stopHeadlessSession]);

  const respondHeadlessPermission = useCallback(async (
    requestId: string,
    approved: boolean,
    responder = 'desktop',
  ): Promise<void> => {
    await invoke('respond_headless_permission', {
      requestId,
      approved,
      responder,
    });
  }, []);

  const removeHeadlessSession = useCallback(async (runtimeId: string): Promise<void> => {
    await invoke('remove_headless_session', { runtimeId });
  }, []);

  const removeManagedSession = useCallback(async (runtimeId: string): Promise<void> => {
    await removeHeadlessSession(runtimeId);
  }, [removeHeadlessSession]);

  const minimizeSession = useCallback(async (sessionId: string) => {
    try {
      await invoke('minimize_interactive_session', { sessionId });
      toast.success('Session minimized successfully');
    } catch (err) {
      toast.error(`Failed to minimize session: ${err}`);
    }
  }, []);

  const addFavoriteProject = useCallback(async (path: string, name: string) => {
    try {
      await invoke('add_favorite', { path, name });
      await loadAppConfig();
    } catch (err) {
      setError(`Failed to add favorite: ${err}`);
    }
  }, [loadAppConfig, setError]);

  const removeFavoriteProject = useCallback(async (path: string) => {
    try {
      await invoke('remove_favorite', { path });
      await loadAppConfig();
    } catch (err) {
      setError(`Failed to remove favorite: ${err}`);
    }
  }, [loadAppConfig, setError]);

  const openDirectoryPicker = useCallback(async (): Promise<string | null> => {
    try {
      const path = await invoke<string | null>('open_directory_dialog');
      return path;
    } catch (err) {
      setError(`Failed to open directory picker: ${err}`);
      return null;
    }
  }, [setError]);

  const syncVSCodeProjects = useCallback(async () => {
    try {
      await invoke('sync_vscode_projects');
      await loadAppConfig();
    } catch (err) {
      setError(`Failed to sync VS Code projects: ${err}`);
    }
  }, [loadAppConfig, setError]);

  const syncJetBrainsProjects = useCallback(async () => {
    try {
      await invoke('sync_jetbrains_projects');
      await loadAppConfig();
    } catch (err) {
      setError(`Failed to sync JetBrains projects: ${err}`);
    }
  }, [loadAppConfig, setError]);

  const loadFromRemote = useCallback(async (url: string, secret: string) => {
    const result = await invoke<{
      count: number;
      environments: Array<{ name: string; original_name: string; renamed: boolean }>;
    }>('load_from_remote', { url, secret });
    await loadEnvironments();
    return result;
  }, [loadEnvironments]);

  const arrangeSessions = useCallback(async (sessionIds: string[], layout: ArrangeLayout) => {
    try {
      const result = await invoke<string>('arrange_sessions', {
        request: { session_ids: sessionIds, layout },
      });
      await loadSessions();
      return result;
    } catch (err) {
      throw err;
    }
  }, [loadSessions]);

  const checkArrangeSupport = useCallback(async (): Promise<boolean> => {
    try {
      return await invoke<boolean>('check_arrange_support');
    } catch {
      return false;
    }
  }, []);

  const checkCodexInstalled = useCallback(async (): Promise<boolean> => {
    try {
      return await invoke<boolean>('check_codex_installed');
    } catch {
      return false;
    }
  }, []);

  const checkTmuxInstalled = useCallback(async (): Promise<boolean> => {
    try {
      return await invoke<boolean>('check_tmux_installed');
    } catch {
      return false;
    }
  }, []);

  const loadInstalledSkills = useCallback(async () => {
    try {
      const skills = await invoke<InstalledSkill[]>('list_installed_skills');
      setInstalledSkills(skills);
    } catch (err) {
      console.error('Failed to load installed skills:', err);
    }
  }, [setInstalledSkills]);

  // Cron commands
  const loadCronTasks = useCallback(async () => {
    setLoadingCron(true);
    try {
      const tasks = await invoke<CronTask[]>('list_cron_tasks');
      setCronTasks(tasks);
    } finally {
      setLoadingCron(false);
    }
  }, [setCronTasks, setLoadingCron]);

  const addCronTask = useCallback(async (data: {
    name: string;
    cronExpression: string;
    prompt: string;
    workingDir: string;
    envName?: string;
    executionProfile?: 'conservative' | 'standard' | 'autonomous';
    maxBudgetUsd?: number | null;
    allowedTools?: string[];
    disallowedTools?: string[];
    timeoutSecs?: number;
    templateId?: string;
  }) => {
    const task = await invoke<CronTask>('add_cron_task', {
      name: data.name,
      cronExpression: data.cronExpression,
      prompt: data.prompt,
      workingDir: data.workingDir,
      envName: data.envName || null,
      executionProfile: data.executionProfile || 'conservative',
      maxBudgetUsd: data.maxBudgetUsd ?? null,
      allowedTools: data.allowedTools ?? [],
      disallowedTools: data.disallowedTools ?? [],
      timeoutSecs: data.timeoutSecs || 300,
      templateId: data.templateId || null,
    });
    const tasks = await invoke<CronTask[]>('list_cron_tasks');
    setCronTasks(tasks);
    return task;
  }, [setCronTasks]);

  const updateCronTask = useCallback(async (data: {
    id: string;
    name?: string;
    cronExpression?: string;
    prompt?: string;
    workingDir?: string;
    envName?: string;
    executionProfile?: 'conservative' | 'standard' | 'autonomous';
    maxBudgetUsd?: number | null;
    allowedTools?: string[];
    disallowedTools?: string[];
    timeoutSecs?: number;
  }) => {
    const task = await invoke<CronTask>('update_cron_task', data);
    const tasks = await invoke<CronTask[]>('list_cron_tasks');
    setCronTasks(tasks);
    return task;
  }, [setCronTasks]);

  const deleteCronTask = useCallback(async (id: string) => {
    await invoke('delete_cron_task', { id });
    const tasks = await invoke<CronTask[]>('list_cron_tasks');
    setCronTasks(tasks);
  }, [setCronTasks]);

  const toggleCronTask = useCallback(async (id: string) => {
    await invoke('toggle_cron_task', { id });
    const tasks = await invoke<CronTask[]>('list_cron_tasks');
    setCronTasks(tasks);
  }, [setCronTasks]);

  const loadCronTaskRuns = useCallback(async (taskId: string) => {
    const runs = await invoke<CronTaskRun[]>('get_cron_task_runs', { taskId });
    setCronRuns(taskId, runs);
  }, [setCronRuns]);

  const retryCronTask = useCallback(async (id: string) => {
    await invoke('retry_cron_task', { id });
  }, []);

  const getCronNextRuns = useCallback(async (cronExpression: string, count?: number) => {
    return invoke<string[]>('get_cron_next_runs', { cronExpression, count: count || 5 });
  }, []);

  const listCronTemplates = useCallback(async () => {
    return invoke<CronTemplate[]>('list_cron_templates');
  }, []);

  const generateCronTaskStream = useCallback(async (query: string) => {
    await invoke('generate_cron_task_stream', { query });
  }, []);

  const saveDefaultWorkingDir = useCallback(async (path: string | null) => {
    try {
      await invoke('set_default_working_dir', { path });
      setDefaultWorkingDir(path);
    } catch (err) {
      console.error('Failed to save default working dir:', err);
    }
  }, [setDefaultWorkingDir]);

  const getProxyDebugState = useCallback(async (): Promise<ProxyDebugState> => {
    return invoke<ProxyDebugState>('get_proxy_debug_state');
  }, []);

  const getTelegramSettings = useCallback(async (): Promise<TelegramSettings> => {
    return invoke<TelegramSettings>('get_telegram_settings');
  }, []);

  const saveTelegramSettings = useCallback(async (settings: TelegramSettings): Promise<void> => {
    await invoke('save_telegram_settings', { settings });
  }, []);

  const getTelegramBridgeStatus = useCallback(async (): Promise<TelegramBridgeStatus> => {
    return invoke<TelegramBridgeStatus>('get_telegram_bridge_status');
  }, []);

  const startTelegramBridge = useCallback(async (): Promise<TelegramBridgeStatus> => {
    return invoke<TelegramBridgeStatus>('start_telegram_bridge');
  }, []);

  const stopTelegramBridge = useCallback(async (): Promise<TelegramBridgeStatus> => {
    return invoke<TelegramBridgeStatus>('stop_telegram_bridge');
  }, []);

  const getTelegramForumTopics = useCallback(async (): Promise<TelegramForumTopic[]> => {
    return invoke<TelegramForumTopic[]>('get_telegram_forum_topics');
  }, []);

  const getWeixinSettings = useCallback(async (): Promise<WeixinSettings> => {
    return invoke<WeixinSettings>('get_weixin_settings');
  }, []);

  const saveWeixinSettings = useCallback(async (settings: WeixinSettings): Promise<void> => {
    await invoke('save_weixin_settings', { settings });
  }, []);

  const getWeixinBridgeStatus = useCallback(async (): Promise<WeixinBridgeStatus> => {
    return invoke<WeixinBridgeStatus>('get_weixin_bridge_status');
  }, []);

  const startWeixinBridge = useCallback(async (): Promise<WeixinBridgeStatus> => {
    return invoke<WeixinBridgeStatus>('start_weixin_bridge');
  }, []);

  const stopWeixinBridge = useCallback(async (): Promise<WeixinBridgeStatus> => {
    return invoke<WeixinBridgeStatus>('stop_weixin_bridge');
  }, []);

  const startWeixinLogin = useCallback(async (): Promise<WeixinLoginSession> => {
    return invoke<WeixinLoginSession>('start_weixin_login');
  }, []);

  const pollWeixinLogin = useCallback(async (sessionKey: string): Promise<WeixinLoginSession> => {
    return invoke<WeixinLoginSession>('poll_weixin_login', { sessionKey });
  }, []);

  const bindTelegramTopic = useCallback(async (options: {
    projectDir: string;
    envName?: string | null;
    permMode?: string | null;
    threadId?: number | null;
    createNewTopic: boolean;
  }): Promise<TelegramTopicBinding> => {
    return invoke<TelegramTopicBinding>('bind_telegram_topic', {
      projectDir: options.projectDir,
      envName: options.envName ?? null,
      permMode: options.permMode ?? null,
      threadId: options.threadId ?? null,
      createNewTopic: options.createNewTopic,
    });
  }, []);

  const setProxyDebugEnabled = useCallback(async (enabled: boolean): Promise<ProxyDebugState> => {
    return invoke<ProxyDebugState>('set_proxy_debug_enabled', { enabled });
  }, []);

  const updateProxyDebugConfig = useCallback(async (
    codexUpstreamBaseUrl: string,
    recordMode?: string,
  ): Promise<ProxyDebugState> => {
    return invoke<ProxyDebugState>('update_proxy_debug_config', {
      codexUpstreamBaseUrl,
      recordMode: recordMode ?? null,
    });
  }, []);

  const listProxyTraffic = useCallback(async (
    limit: number,
    cursor?: string | null,
  ): Promise<ProxyTrafficPage> => {
    return invoke<ProxyTrafficPage>('list_proxy_traffic', {
      limit,
      cursor: cursor ?? null,
    });
  }, []);

  const getProxyTrafficDetail = useCallback(async (id: string): Promise<ProxyTrafficDetail> => {
    return invoke<ProxyTrafficDetail>('get_proxy_traffic_detail', { id });
  }, []);

  const clearProxyTraffic = useCallback(async (): Promise<void> => {
    await invoke('clear_proxy_traffic');
  }, []);

  const openTextInVSCode = useCallback(async (
    content: string,
    suggestedName?: string,
  ): Promise<string> => {
    return invoke<string>('open_text_in_vscode', {
      content,
      suggestedName: suggestedName ?? null,
    });
  }, []);

  const setSessionTitle = useCallback(async (source: string, sessionId: string, title: string): Promise<void> => {
    await invoke('set_session_title', { source, sessionId, title });
  }, []);

  return {
    loadEnvironments,
    loadCurrentEnv,
    switchEnvironment,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    launchClaudeCode,
    createInteractiveSession,
    loadSessions,
    listInteractiveSessions,
    listRuntimeRecoveryCandidates,
    dismissRuntimeRecoveryCandidate,
    stopSession,
    stopInteractiveSession,
    writeInteractiveInput,
    getInteractiveSessionOutput,
    getInteractiveSessionEvents,
    listUnifiedSessions,
    getSessionEvents,
    sendSessionInput,
    stopUnifiedSession,
    attachChannel,
    detachChannel,
    debugCompareSessions,
    resizeInteractiveSession,
    deleteSession,
    focusSession,
    listTmuxAttachTerminals,
    openInteractiveSessionInTerminal,
    closeSession,
    minimizeSession,
    createHeadlessSession,
    createManagedSession,
    listHeadlessSessions,
    listManagedSessions,
    sendToHeadlessSession,
    sendToManagedSession,
    getHeadlessSessionEvents,
    getManagedSessionEvents,
    stopHeadlessSession,
    stopManagedSession,
    respondHeadlessPermission,
    removeHeadlessSession,
    removeManagedSession,
    loadAppConfig,
    addFavoriteProject,
    removeFavoriteProject,
    openDirectoryPicker,
    syncVSCodeProjects,
    syncJetBrainsProjects,
    loadFromRemote,
    arrangeSessions,
    checkArrangeSupport,
    checkCodexInstalled,
    checkTmuxInstalled,
    loadInstalledSkills,
    loadCronTasks,
    addCronTask,
    updateCronTask,
    deleteCronTask,
    toggleCronTask,
    loadCronTaskRuns,
    retryCronTask,
    getCronNextRuns,
    listCronTemplates,
    generateCronTaskStream,
    saveDefaultWorkingDir,
    getTelegramSettings,
    saveTelegramSettings,
    getTelegramBridgeStatus,
    startTelegramBridge,
    stopTelegramBridge,
    getTelegramForumTopics,
    bindTelegramTopic,
    getWeixinSettings,
    saveWeixinSettings,
    getWeixinBridgeStatus,
    startWeixinBridge,
    stopWeixinBridge,
    startWeixinLogin,
    pollWeixinLogin,
    getProxyDebugState,
    setProxyDebugEnabled,
    updateProxyDebugConfig,
    listProxyTraffic,
    getProxyTrafficDetail,
    clearProxyTraffic,
    openTextInVSCode,
    setSessionTitle,
  };
}
