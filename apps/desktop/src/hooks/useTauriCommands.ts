import { invoke } from '@tauri-apps/api/core';
import { useAppStore, type Environment, type Session } from '@/store';
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
  env_name: string;
  perm_mode: string;
  working_dir: string;
  start_time: string;
  status: string;  // "running" | "stopped" | "interrupted"
  terminal_type?: string;  // "iterm2" | "terminalapp"
  window_id?: string;      // iTerm2 window ID
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
  } = useAppStore();

  const loadEnvironments = useCallback(async () => {
    setLoading(true);
    try {
      const envs = await invoke<Record<string, TauriEnvConfig>>('get_environments');
      const envList: Environment[] = Object.entries(envs).map(([name, config]) => ({
        name,
        baseUrl: config.ANTHROPIC_BASE_URL || '',
        apiKey: config.ANTHROPIC_API_KEY,
        model: config.ANTHROPIC_MODEL || '',
        smallModel: config.ANTHROPIC_SMALL_FAST_MODEL,
      }));
      setEnvironments(envList);
      setError(null);
    } catch (err) {
      setError(`Failed to load environments: ${err}`);
    } finally {
      setLoading(false);
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
        base_url: env.baseUrl,
        api_key: env.apiKey,
        model: env.model,
        small_model: env.smallModel,
      });
      await loadEnvironments();
      setError(null);
    } catch (err) {
      setError(`Failed to add environment: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [loadEnvironments, setLoading, setError]);

  const updateEnvironment = useCallback(async (env: Environment) => {
    setLoading(true);
    try {
      await invoke('update_environment', {
        name: env.name,
        base_url: env.baseUrl,
        api_key: env.apiKey,
        model: env.model,
        small_model: env.smallModel,
      });
      await loadEnvironments();
      setError(null);
    } catch (err) {
      setError(`Failed to update environment: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [loadEnvironments, setLoading, setError]);

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

  const launchClaudeCode = useCallback(async (workingDir?: string) => {
    setLoading(true);
    try {
      const workDir = workingDir || selectedWorkingDir || null;
      const tauriSession = await invoke<TauriSession>('launch_claude_code', {
        envName: currentEnv,
        permMode: permissionMode,
        workingDir: workDir,
      });

      // Convert Tauri session to frontend session
      const session: Session = {
        id: tauriSession.id,
        envName: tauriSession.env_name,
        workingDir: tauriSession.working_dir,
        pid: tauriSession.pid,
        startedAt: new Date(tauriSession.start_time),
        status: tauriSession.status as 'running' | 'stopped' | 'interrupted' | 'error',
        terminalType: tauriSession.terminal_type,
        windowId: tauriSession.window_id,
      };

      addSession(session);

      // Add to recent projects if a working directory was used
      if (workDir) {
        await invoke('add_recent', { path: workDir });
      }

      setError(null);
    } catch (err) {
      setError(`Failed to launch Claude Code: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [currentEnv, permissionMode, selectedWorkingDir, addSession, setLoading, setError]);

  const loadSessions = useCallback(async () => {
    try {
      const tauriSessions = await invoke<TauriSession[]>('list_sessions');
      const sessions: Session[] = tauriSessions.map((s) => ({
        id: s.id,
        envName: s.env_name,
        workingDir: s.working_dir,
        pid: s.pid,
        startedAt: new Date(s.start_time),
        status: s.status as 'running' | 'stopped' | 'interrupted' | 'error',
        terminalType: s.terminal_type,
        windowId: s.window_id,
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
  }, [setFavorites, setRecent, setVSCodeProjects, setJetBrainsProjects]);

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
  };
}
