import { create } from 'zustand';
import type { PermissionModeName } from '@ccem/core/browser';

export interface EnvConfig {
  ANTHROPIC_BASE_URL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  ANTHROPIC_SMALL_FAST_MODEL?: string;
}

export interface Session {
  pid: number;
  envName: string;
  permMode: PermissionModeName;
  startTime: Date;
  terminalType: 'terminal' | 'iterm2' | 'warp' | 'ghostty';
  workingDir?: string;
  status: 'running' | 'stopped' | 'error';
}

interface EnvState {
  // Environments
  environments: Record<string, EnvConfig>;
  currentEnv: string;

  // Permission mode
  defaultMode: PermissionModeName | null;
  currentMode: PermissionModeName;

  // Active sessions
  sessions: Session[];

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions
  setEnvironments: (envs: Record<string, EnvConfig>) => void;
  setCurrentEnv: (name: string) => void;
  setDefaultMode: (mode: PermissionModeName | null) => void;
  setCurrentMode: (mode: PermissionModeName) => void;
  addSession: (session: Session) => void;
  removeSession: (pid: number) => void;
  updateSessionStatus: (pid: number, status: Session['status']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useEnvStore = create<EnvState>((set) => ({
  environments: {},
  currentEnv: 'official',
  defaultMode: null,
  currentMode: 'dev',
  sessions: [],
  isLoading: false,
  error: null,

  setEnvironments: (envs) => set({ environments: envs }),
  setCurrentEnv: (name) => set({ currentEnv: name }),
  setDefaultMode: (mode) => set({ defaultMode: mode }),
  setCurrentMode: (mode) => set({ currentMode: mode }),
  addSession: (session) =>
    set((state) => ({ sessions: [...state.sessions, session] })),
  removeSession: (pid) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.pid !== pid),
    })),
  updateSessionStatus: (pid, status) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.pid === pid ? { ...s, status } : s
      ),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
