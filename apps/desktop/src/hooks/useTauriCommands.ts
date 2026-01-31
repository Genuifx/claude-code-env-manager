import { invoke } from '@tauri-apps/api/core';
import { useAppStore, type Environment } from '@/store';
import { useCallback } from 'react';

interface TauriEnvConfig {
  base_url?: string;
  api_key?: string;
  model?: string;
  small_model?: string;
}

export function useTauriCommands() {
  const {
    setEnvironments,
    setCurrentEnv,
    setLoading,
    setError,
    addSession,
    currentEnv,
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
      await invoke('launch_claude_code', {
        envName: currentEnv,
        workingDir: workingDir || null,
      });

      // Add session to state
      addSession({
        id: crypto.randomUUID(),
        envName: currentEnv,
        workingDir: workingDir || process.cwd?.() || '~',
        startedAt: new Date(),
        status: 'running',
      });

      setError(null);
    } catch (err) {
      setError(`Failed to launch Claude Code: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [currentEnv, addSession, setLoading, setError]);

  return {
    loadEnvironments,
    loadCurrentEnv,
    switchEnvironment,
    launchClaudeCode,
  };
}
