import { invoke } from '@tauri-apps/api/core';
import { useAppStore, type Environment, type Session } from '@/store';
import { useCallback } from 'react';

interface TauriEnvConfig {
  base_url?: string;
  api_key?: string;
  model?: string;
  small_model?: string;
}

interface TauriSession {
  id: string;
  pid?: number;
  env_name: string;
  perm_mode: string;
  working_dir: string;
  start_time: string;
  status: string;
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
  } = useAppStore();

  const loadEnvironments = useCallback(async () => {
    setLoading(true);
    try {
      const envs = await invoke<Record<string, TauriEnvConfig>>('get_environments');
      const envList: Environment[] = Object.entries(envs).map(([name, config]) => ({
        name,
        baseUrl: config.base_url || '',
        apiKey: config.api_key,
        model: config.model || '',
        smallModel: config.small_model,
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

  const launchClaudeCode = useCallback(async (workingDir?: string) => {
    setLoading(true);
    try {
      const tauriSession = await invoke<TauriSession>('launch_claude_code', {
        envName: currentEnv,
        permMode: permissionMode,
        workingDir: workingDir || null,
      });

      // Convert Tauri session to frontend session
      const session: Session = {
        id: tauriSession.id,
        envName: tauriSession.env_name,
        workingDir: tauriSession.working_dir,
        pid: tauriSession.pid,
        startedAt: new Date(tauriSession.start_time),
        status: tauriSession.status as 'running' | 'stopped' | 'error',
      };

      addSession(session);
      setError(null);
    } catch (err) {
      setError(`Failed to launch Claude Code: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [currentEnv, permissionMode, addSession, setLoading, setError]);

  const loadSessions = useCallback(async () => {
    try {
      const tauriSessions = await invoke<TauriSession[]>('list_sessions');
      const sessions: Session[] = tauriSessions.map((s) => ({
        id: s.id,
        envName: s.env_name,
        workingDir: s.working_dir,
        pid: s.pid,
        startedAt: new Date(s.start_time),
        status: s.status as 'running' | 'stopped' | 'error',
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

  return {
    loadEnvironments,
    loadCurrentEnv,
    switchEnvironment,
    launchClaudeCode,
    loadSessions,
    stopSession,
    deleteSession,
  };
}
