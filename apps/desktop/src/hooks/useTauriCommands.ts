import { invoke } from '@tauri-apps/api/core';
import { useAppStore, type Environment, type Session, type ArrangeLayout, type InstalledSkill, type CronTask, type CronTaskRun, type CronTemplate, type LaunchClient } from '@/store';
import { useCallback } from 'react';
import { toast } from 'sonner';

interface TauriEnvConfig {
  ANTHROPIC_BASE_URL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  ANTHROPIC_SMALL_FAST_MODEL?: string;
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
    currentEnv,
    permissionMode,
    setFavorites,
    setRecent,
    setVSCodeProjects,
    setJetBrainsProjects,
    selectedWorkingDir,
    setInstalledSkills,
    setCronTasks,
    setCronRuns,
    setLoadingCron,
    setDefaultWorkingDir,
  } = useAppStore();

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
        apiKey: config.ANTHROPIC_API_KEY,
        model: config.ANTHROPIC_MODEL || '',
        smallModel: config.ANTHROPIC_SMALL_FAST_MODEL,
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
        apiKey: env.apiKey,
        model: env.model,
        smallModel: env.smallModel,
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
        apiKey: env.apiKey,
        model: env.model,
        smallModel: env.smallModel,
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

  const launchClaudeCode = useCallback(async (
    workingDir?: string,
    resumeSessionId?: string,
    client: LaunchClient = 'claude',
  ) => {
    setLoading(true);
    try {
      const workDir = workingDir || selectedWorkingDir || null;
      const tauriSession = await invoke<TauriSession>('launch_claude_code', {
        envName: currentEnv,
        permMode: permissionMode,
        workingDir: workDir,
        resumeSessionId: resumeSessionId || null,
        client,
      });

      // Convert Tauri session to frontend session
      const session: Session = {
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

      addSession(session);

      // Add to recent projects if a working directory was used
      if (workDir) {
        await invoke('add_recent', { path: workDir });
        await loadAppConfig(); // Refresh store so UI shows the new recent entry
      }

      setError(null);
    } catch (err) {
      const clientLabel = client === 'codex' ? 'Codex' : 'Claude Code';
      setError(`Failed to launch ${clientLabel}: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [currentEnv, permissionMode, selectedWorkingDir, addSession, setLoading, setError]);

  const loadSessions = useCallback(async () => {
    try {
      const tauriSessions = await invoke<TauriSession[]>('list_sessions');
      const sessions: Session[] = tauriSessions.map((s) => ({
        id: s.id,
        client: normalizeLaunchClient(s.client),
        envName: s.env_name,
        workingDir: s.working_dir,
        pid: s.pid,
        startedAt: new Date(s.start_time),
        status: s.status as Session['status'],
        permMode: s.perm_mode,
        terminalType: s.terminal_type,
        windowId: s.window_id,
        itermSessionId: s.iterm_session_id,
      }));
      setSessions(sessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }, [setSessions]);

  const stopSession = useCallback(async (sessionId: string) => {
    try {
      await invoke('stop_session', { sessionId });
      updateSessionStatus(sessionId, 'stopped');
    } catch (err) {
      setError(`Failed to stop session: ${err}`);
    }
  }, [updateSessionStatus, setError]);

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
      await invoke('focus_session', { sessionId });
      toast.success('Session focused successfully');
    } catch (err) {
      toast.error(`Failed to focus session: ${err}`);
    }
  }, []);

  const closeSession = useCallback(async (sessionId: string) => {
    try {
      await invoke('close_session', { sessionId });
      removeSession(sessionId);
      toast.success('Session closed successfully');
    } catch (err) {
      toast.error(`Failed to close session: ${err}`);
    }
  }, [removeSession]);

  const minimizeSession = useCallback(async (sessionId: string) => {
    try {
      await invoke('minimize_session', { sessionId });
      toast.success('Session minimized successfully');
    } catch (err) {
      toast.error(`Failed to minimize session: ${err}`);
    }
  }, []);

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
    timeoutSecs?: number;
    templateId?: string;
  }) => {
    const task = await invoke<CronTask>('add_cron_task', {
      name: data.name,
      cronExpression: data.cronExpression,
      prompt: data.prompt,
      workingDir: data.workingDir,
      envName: data.envName || null,
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

  return {
    loadEnvironments,
    loadCurrentEnv,
    switchEnvironment,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    launchClaudeCode,
    loadSessions,
    stopSession,
    deleteSession,
    focusSession,
    closeSession,
    minimizeSession,
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
    getProxyDebugState,
    setProxyDebugEnabled,
    updateProxyDebugConfig,
    listProxyTraffic,
    getProxyTrafficDetail,
    clearProxyTraffic,
    openTextInVSCode,
  };
}
