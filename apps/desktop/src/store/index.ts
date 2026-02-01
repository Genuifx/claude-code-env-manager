import { create } from 'zustand';
import type { PermissionModeName } from '@ccem/core/browser';

export interface Environment {
  name: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  smallModel?: string;
}

export interface Session {
  id: string;
  envName: string;
  workingDir: string;
  pid?: number;
  startedAt: Date;
  status: 'running' | 'stopped' | 'error';
}

interface AppState {
  // Environments
  environments: Environment[];
  currentEnv: string;
  setEnvironments: (envs: Environment[]) => void;
  setCurrentEnv: (name: string) => void;
  addEnvironment: (env: Environment) => void;
  removeEnvironment: (name: string) => void;

  // Permission Mode
  permissionMode: PermissionModeName;
  setPermissionMode: (mode: PermissionModeName) => void;

  // Sessions
  sessions: Session[];
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  removeSession: (id: string) => void;
  updateSessionStatus: (id: string, status: Session['status']) => void;

  // UI State
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Environments
  environments: [],
  currentEnv: 'official',
  setEnvironments: (envs) => set({ environments: envs }),
  setCurrentEnv: (name) => set({ currentEnv: name }),
  addEnvironment: (env) =>
    set((state) => ({ environments: [...state.environments, env] })),
  removeEnvironment: (name) =>
    set((state) => ({
      environments: state.environments.filter((e) => e.name !== name),
    })),

  // Permission Mode
  permissionMode: 'dev',
  setPermissionMode: (mode) => set({ permissionMode: mode }),

  // Sessions
  sessions: [],
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) =>
    set((state) => ({ sessions: [...state.sessions, session] })),
  removeSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
    })),
  updateSessionStatus: (id, status) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, status } : s
      ),
    })),

  // UI State
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  error: null,
  setError: (error) => set({ error }),
}));
