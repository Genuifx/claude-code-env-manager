import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { ENV_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import { AppLayout } from '@/components/layout';
import { Dashboard } from '@/pages/Dashboard';
import { Environments } from '@/pages/Environments';
import { Sessions } from '@/pages/Sessions';
import { Settings } from '@/pages/Settings';
import { useAppStore, type Environment } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { EnvironmentDialog } from '@/components/EnvironmentDialog';
import { Toaster, toast } from 'sonner';
import { LocaleProvider, useLocale } from '@/locales';
import type { UsageStats } from '@/types/analytics';
import { shallow } from 'zustand/shallow';

const AnalyticsPage = lazy(async () =>
  import('@/pages/Analytics').then((m) => ({ default: m.Analytics }))
);
const SkillsPage = lazy(async () =>
  import('@/pages/Skills').then((m) => ({ default: m.Skills }))
);
const HistoryPage = lazy(async () =>
  import('@/pages/History').then((m) => ({ default: m.History }))
);
const CronTasksPage = lazy(async () =>
  import('@/pages/CronTasks').then((m) => ({ default: m.CronTasks }))
);
const ProxyDebugPage = lazy(async () =>
  import('@/pages/ProxyDebug').then((m) => ({ default: m.ProxyDebug }))
);

function App() {
  const FOCUS_SYNC_INTERVAL_MS = 5000;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingEnvName, setEditingEnvName] = useState<string | undefined>();
  const [pendingDeleteEnv, setPendingDeleteEnv] = useState<string | null>(null);
  const lastFocusSyncAtRef = useRef(0);

  const { setEnvironments, setCurrentEnv, setPermissionMode, setUsageStats, environments, launchClient, error, setError } = useAppStore(
    (state) => ({
      setEnvironments: state.setEnvironments,
      setCurrentEnv: state.setCurrentEnv,
      setPermissionMode: state.setPermissionMode,
      setUsageStats: state.setUsageStats,
      environments: state.environments,
      launchClient: state.launchClient,
      error: state.error,
      setError: state.setError,
    }),
    shallow
  );

  const {
    loadEnvironments,
    loadCurrentEnv,
    loadSessions,
    loadAppConfig,
    launchClaudeCode,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    loadFromRemote,
    loadInstalledSkills,
  } = useTauriCommands();

  // Show global errors as toast notifications
  useEffect(() => {
    if (error) {
      toast.error(error);
      // Clear error after showing toast to prevent re-triggering
      setError(null);
    }
  }, [error, setError]);

  // Listen for tray menu events
  useEffect(() => {
    const unlisteners: (() => void)[] = [];
    let cancelled = false;

    const setupListeners = async () => {
      try {
        const listener1 = await listen('tray-launch-claude', () => {
          handleLaunch();
        });
        if (cancelled) {
          listener1();
          return;
        }
        unlisteners.push(listener1);

        const listener2 = await listen('navigate-to-settings', () => {
          setActiveTab('settings');
        });
        if (cancelled) {
          listener2();
          return;
        }
        unlisteners.push(listener2);

        const listener3 = await listen<{ env: string }>('env-changed', (event) => {
          setCurrentEnv(event.payload.env);
        });
        if (cancelled) {
          listener3();
          return;
        }
        unlisteners.push(listener3);

        const listener4 = await listen<{ perm: string }>('perm-changed', (event) => {
          setPermissionMode(event.payload.perm as PermissionModeName);
        });
        if (cancelled) {
          listener4();
          return;
        }
        unlisteners.push(listener4);
      } catch (err) {
        console.error('Failed to setup tray event listeners:', err);
      }
    };

    setupListeners();

    return () => {
      cancelled = true;
      unlisteners.forEach(fn => fn());
    };
  }, []);

  // Load all data from backend (reusable for both init and refresh)
  const refreshData = useCallback(async () => {
    const envPromise = loadEnvironments().catch(() => {
      // Fallback to presets if Tauri is not available (dev mode)
      const envList: Environment[] = Object.entries(ENV_PRESETS).map(([name, config]) => ({
        name,
        baseUrl: config.ANTHROPIC_BASE_URL || '',
        model: config.ANTHROPIC_MODEL || '',
      }));
      envList.unshift({
        name: 'official',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-sonnet-4-5-20250929',
      });
      setEnvironments(envList);
    });
    const currentEnvPromise = loadCurrentEnv().catch(() => {
      setCurrentEnv('official');
    });
    const sessionsPromise = loadSessions().catch((err) => {
      console.error('Failed to load sessions:', err);
    });
    const appConfigPromise = loadAppConfig().catch((err) => {
      console.error('Failed to load app config:', err);
    });
    const skillsPromise = loadInstalledSkills().catch((err) => {
      console.error('Failed to load installed skills:', err);
    });
    const statsPromise = invoke<UsageStats>('get_usage_stats')
      .then((stats) => {
        if (stats) {
          setUsageStats(stats);
        }
      })
      .catch(() => {
        console.debug('Usage stats not available from backend, will use mock data when Analytics tab is opened');
      });

    await Promise.allSettled([
      envPromise,
      currentEnvPromise,
      sessionsPromise,
      appConfigPromise,
      skillsPromise,
      statsPromise,
    ]);
  }, [
    loadEnvironments,
    loadCurrentEnv,
    loadSessions,
    loadAppConfig,
    loadInstalledSkills,
    setEnvironments,
    setCurrentEnv,
    setUsageStats,
  ]);

  // Initialize data on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Re-sync with CLI config when window regains focus
  // This ensures desktop stays in sync when user modifies env via `ccem add/del/use` in terminal
  // Skip environment reload when a dialog is open to avoid resetting in-progress edits
  useEffect(() => {
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFocusSyncAtRef.current < FOCUS_SYNC_INTERVAL_MS) {
        return;
      }
      lastFocusSyncAtRef.current = now;

      if (!dialogOpen) {
        loadEnvironments({ silent: true }).catch(() => {});
      }
      loadCurrentEnv().catch(() => {});
      loadSessions().catch(() => {});
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadEnvironments, loadCurrentEnv, loadSessions, dialogOpen]);

  // Handle launch
  const handleLaunch = useCallback(async () => {
    try {
      await launchClaudeCode(undefined, undefined, launchClient);
    } catch (err) {
      console.error('Launch failed:', err);
    }
  }, [launchClaudeCode, launchClient]);

  // Global keyboard shortcuts (Cmd+1..9 for tabs, Cmd+Enter/N for launch, Cmd+, for settings)
  const globalShortcuts = useMemo(() => ({
    'meta+1': () => setActiveTab('dashboard'),
    'meta+2': () => setActiveTab('sessions'),
    'meta+3': () => setActiveTab('environments'),
    'meta+4': () => setActiveTab('skills'),
    'meta+5': () => setActiveTab('history'),
    'meta+6': () => setActiveTab('cron'),
    'meta+7': () => setActiveTab('analytics'),
    'meta+8': () => setActiveTab('proxy-debug'),
    'meta+9': () => setActiveTab('settings'),
    'meta+enter': () => handleLaunch(),
    'meta+n': () => handleLaunch(),
    'meta+,': () => setActiveTab('settings'),
    'meta+q': () => invoke('quit_app'),
  }), [handleLaunch]);

  useKeyboardShortcuts(globalShortcuts);

  // Handle launch with specific directory
  const handleLaunchWithDir = async (workingDir: string) => {
    try {
      await launchClaudeCode(workingDir, undefined, launchClient);
    } catch (err) {
      console.error('Launch failed:', err);
    }
  };

  // Environment CRUD handlers
  const handleAddEnv = () => {
    setDialogMode('add');
    setEditingEnvName(undefined);
    setDialogOpen(true);
  };

  const handleEditEnv = (name: string) => {
    setDialogMode('edit');
    setEditingEnvName(name);
    setDialogOpen(true);
  };

  const handleDeleteEnv = (name: string) => {
    setPendingDeleteEnv(name);
  };

  const confirmDeleteEnv = async () => {
    if (!pendingDeleteEnv) return;
    try {
      await deleteEnvironment(pendingDeleteEnv);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setPendingDeleteEnv(null);
    }
  };

  const handleSaveEnv = async (env: Environment) => {
    try {
      if (dialogMode === 'add') {
        await addEnvironment(env);
      } else {
        await updateEnvironment(env, editingEnvName);
      }
      setDialogOpen(false);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  // Get editing environment for dialog
  const getEditingEnv = (): Environment | undefined => {
    if (!editingEnvName) return undefined;
    const env = environments.find(e => e.name === editingEnvName);
    return env;
  };

  // Render page based on active tab
  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={setActiveTab}
            onLaunch={handleLaunch}
            onLaunchWithDir={handleLaunchWithDir}
          />
        );
      case 'sessions':
        return <Sessions onLaunch={handleLaunch} onLaunchWithDir={handleLaunchWithDir} />;
      case 'environments':
        return (
          <Environments
            onAddEnv={handleAddEnv}
            onEditEnv={handleEditEnv}
            onDeleteEnv={handleDeleteEnv}
          />
        );
      case 'analytics':
        return <AnalyticsPage />;
      case 'skills':
        return <SkillsPage />;
      case 'history':
        return <HistoryPage />;
      case 'cron':
        return <CronTasksPage />;
      case 'proxy-debug':
        return <ProxyDebugPage />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={setActiveTab} onLaunch={handleLaunch} onLaunchWithDir={handleLaunchWithDir} />;
    }
  };

  return (
    <LocaleProvider>
      <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
        <Suspense fallback={<PageFallback />}>
          {renderPage()}
        </Suspense>
      </AppLayout>

      {/* Environment Dialog */}
      <EnvironmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        environment={getEditingEnv()}
        onSave={handleSaveEnv}
        onServerSync={loadFromRemote}
      />

      {/* Delete Environment Confirmation Dialog */}
      {pendingDeleteEnv && (
        <DeleteEnvConfirmDialog
          envName={pendingDeleteEnv}
          onConfirm={confirmDeleteEnv}
          onCancel={() => setPendingDeleteEnv(null)}
        />
      )}

      {/* Toast notifications */}
      <Toaster position="top-center" richColors />
    </LocaleProvider>
  );
}

function PageFallback() {
  return (
    <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
      Loading...
    </div>
  );
}

/** Inline confirmation dialog for environment deletion — rendered inside LocaleProvider */
function DeleteEnvConfirmDialog({
  envName,
  onConfirm,
  onCancel,
}: {
  envName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const message = t('environments.confirmDelete').replace('{name}', envName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="frosted-panel glass-noise rounded-xl p-6 max-w-sm w-full mx-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-foreground text-sm">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 text-sm rounded-lg glass-outline-btn text-foreground transition-colors"
            onClick={onCancel}
          >
            {t('common.cancel')}
          </button>
          <button
            className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            onClick={onConfirm}
          >
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
