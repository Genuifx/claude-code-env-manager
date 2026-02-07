import { create } from 'zustand';
import type { PermissionModeName } from '@ccem/core/browser';
import type { UsageStats, Milestone } from '@/types/analytics';

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
  status: 'running' | 'stopped' | 'idle' | 'interrupted' | 'error';
  permMode: string;
  terminalType?: string;  // "iterm2" | "terminalapp"
  windowId?: string;      // iTerm2 window ID
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
  defaultMode: PermissionModeName | null;
  setPermissionMode: (mode: PermissionModeName) => void;
  setDefaultMode: (mode: PermissionModeName | null) => void;

  // Sessions
  sessions: Session[];
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  removeSession: (id: string) => void;
  updateSessionStatus: (id: string, status: Session['status']) => void;

  // Projects
  favorites: FavoriteProject[];
  recent: RecentProject[];
  vscodeProjects: VSCodeProject[];
  jetbrainsProjects: JetBrainsProject[];
  selectedWorkingDir: string | null;
  setFavorites: (favorites: FavoriteProject[]) => void;
  setRecent: (recent: RecentProject[]) => void;
  setVSCodeProjects: (projects: VSCodeProject[]) => void;
  setJetBrainsProjects: (projects: JetBrainsProject[]) => void;
  addFavorite: (project: FavoriteProject) => void;
  removeFavorite: (path: string) => void;
  setSelectedWorkingDir: (dir: string | null) => void;

  // Analytics
  usageStats: UsageStats | null;
  milestones: Milestone[];
  continuousUsageDays: number;
  setUsageStats: (stats: UsageStats) => void;
  setMilestones: (milestones: Milestone[]) => void;
  setContinuousUsageDays: (days: number) => void;

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
  defaultMode: null,
  setPermissionMode: (mode) => set({ permissionMode: mode }),
  setDefaultMode: (mode) => set({ defaultMode: mode }),

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

  // Projects
  favorites: [],
  recent: [],
  vscodeProjects: [],
  jetbrainsProjects: [],
  selectedWorkingDir: null,
  setFavorites: (favorites) => set({ favorites }),
  setRecent: (recent) => set({ recent }),
  setVSCodeProjects: (projects) => set({ vscodeProjects: projects }),
  setJetBrainsProjects: (projects) => set({ jetbrainsProjects: projects }),
  addFavorite: (project) =>
    set((state) => ({ favorites: [...state.favorites, project] })),
  removeFavorite: (path) =>
    set((state) => ({
      favorites: state.favorites.filter((f) => f.path !== path),
    })),
  setSelectedWorkingDir: (dir) => set({ selectedWorkingDir: dir }),

  // Analytics
  usageStats: null,
  milestones: [],
  continuousUsageDays: 0,
  setUsageStats: (stats) => set({ usageStats: stats }),
  setMilestones: (milestones) => set({ milestones }),
  setContinuousUsageDays: (days) => set({ continuousUsageDays: days }),

  // UI State
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  error: null,
  setError: (error) => set({ error }),
}));
