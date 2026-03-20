import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
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
import { TooltipProvider } from '@/components/ui/tooltip';

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
const ChatAppPage = lazy(async () =>
  import('@/pages/ChatApp').then((m) => ({ default: m.ChatApp }))
);

function App() {
  const FOCUS_SYNC_INTERVAL_MS = 5000;
  const FOCUS_SYNC_DELAY_MS = 180;
  const WINDOW_EFFECT_RESTORE_MS = 320;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingEnvName, setEditingEnvName] = useState<string | undefined>();
  const [pendingDeleteEnv, setPendingDeleteEnv] = useState<string | null>(null);
  const lastFocusSyncAtRef = useRef(0);
  const [, startTransition] = useTransition();

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

  const preloadAnalyticsPage = useCallback(() => {
    void import('@/pages/Analytics').then((module) => {
      module.primeAnalyticsPage?.();
    });
  }, []);

  const preloadHistoryPage = useCallback(() => {
    void import('@/pages/History').then((module) => {
      module.primeHistoryPage?.();
    });
  }, []);

  const prefetchTab = useCallback((tab: string) => {
    if (tab === 'analytics') {
      preloadAnalyticsPage();
      return;
    }

    if (tab === 'history') {
      preloadHistoryPage();
    }
  }, [preloadAnalyticsPage, preloadHistoryPage]);

  const navigateToTab = useCallback((tab: string) => {
    prefetchTab(tab);
    startTransition(() => {
      setActiveTab(tab);
    });
  }, [prefetchTab, startTransition]);

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
          navigateToTab('settings');
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
  }, [navigateToTab, setCurrentEnv, setPermissionMode]);

  // Load all data from backend (reusable for both init and refresh)
  const refreshData = useCallback(async () => {
    const envPromise = loadEnvironments().catch(() => {
      // Fallback to presets if Tauri is not available (dev mode)
      const envList: Environment[] = Object.entries(ENV_PRESETS).map(([name, config]) => ({
        name,
        baseUrl: config.ANTHROPIC_BASE_URL || '',
        defaultOpusModel: config.ANTHROPIC_DEFAULT_OPUS_MODEL || '',
        defaultSonnetModel: config.ANTHROPIC_DEFAULT_SONNET_MODEL,
        defaultHaikuModel: config.ANTHROPIC_DEFAULT_HAIKU_MODEL,
        runtimeModel: config.ANTHROPIC_MODEL || 'opus',
      }));
      envList.unshift({
        name: 'official',
        baseUrl: 'https://api.anthropic.com',
        defaultOpusModel: 'claude-opus-4-1-20250805',
        defaultSonnetModel: 'claude-opus-4-1-20250805',
        defaultHaikuModel: 'claude-3-5-haiku-20241022',
        runtimeModel: 'opus',
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

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;
    let idleId: number | null = null;
    const requestIdle = window.requestIdleCallback?.bind(window);
    const cancelIdle = window.cancelIdleCallback?.bind(window);

    const preloadHeavyTabs = () => {
      if (cancelled) {
        return;
      }

      preloadAnalyticsPage();
      preloadHistoryPage();
    };

    if (requestIdle) {
      idleId = requestIdle(preloadHeavyTabs, { timeout: 1200 });
    } else {
      timeoutId = setTimeout(preloadHeavyTabs, 500);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && cancelIdle) {
        cancelIdle(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [preloadAnalyticsPage, preloadHistoryPage]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const isMacLike = /mac/i.test(navigator.platform) || /mac os/i.test(navigator.userAgent);
    if (!isMacLike) {
      root.dataset.windowState = 'active';
      return;
    }

    let restoreTimerId: number | null = null;

    const clearRestoreTimer = () => {
      if (restoreTimerId !== null) {
        clearTimeout(restoreTimerId);
        restoreTimerId = null;
      }
    };

    const setWindowState = (state: 'inactive' | 'activating' | 'active') => {
      root.dataset.windowState = state;
    };

    const promoteToActive = () => {
      clearRestoreTimer();
      restoreTimerId = window.setTimeout(() => {
        restoreTimerId = null;
        setWindowState('active');
      }, WINDOW_EFFECT_RESTORE_MS);
    };

    const handleFocusState = () => {
      setWindowState('activating');
      promoteToActive();
    };

    const handleBlurState = () => {
      clearRestoreTimer();
      setWindowState('inactive');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        handleFocusState();
        return;
      }

      handleBlurState();
    };

    if (document.visibilityState === 'visible' && document.hasFocus()) {
      handleFocusState();
    } else {
      handleBlurState();
    }

    window.addEventListener('focus', handleFocusState);
    window.addEventListener('blur', handleBlurState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearRestoreTimer();
      window.removeEventListener('focus', handleFocusState);
      window.removeEventListener('blur', handleBlurState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      delete root.dataset.windowState;
    };
  }, []);

  // Re-sync with CLI config when window regains focus
  // This ensures desktop stays in sync when user modifies env via `ccem add/del/use` in terminal
  // Skip environment reload when a dialog is open to avoid resetting in-progress edits
  useEffect(() => {
    let timeoutId: number | null = null;
    let idleId: number | null = null;
    const requestIdle = window.requestIdleCallback?.bind(window);
    const cancelIdle = window.cancelIdleCallback?.bind(window);

    const runFocusSync = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      loadCurrentEnv().catch(() => {});

      if (!dialogOpen) {
        loadEnvironments({ silent: true }).catch(() => {});
      }

      if (activeTab === 'dashboard' || activeTab === 'sessions') {
        loadSessions().catch(() => {});
      }
    };

    const scheduleFocusSync = () => {
      if (idleId !== null && cancelIdle) {
        cancelIdle(idleId);
        idleId = null;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        if (requestIdle) {
          idleId = requestIdle(() => {
            idleId = null;
            runFocusSync();
          }, { timeout: 800 });
          return;
        }

        runFocusSync();
      }, FOCUS_SYNC_DELAY_MS);
    };

    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFocusSyncAtRef.current < FOCUS_SYNC_INTERVAL_MS) {
        return;
      }
      lastFocusSyncAtRef.current = now;
      scheduleFocusSync();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (idleId !== null && cancelIdle) {
        cancelIdle(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [activeTab, loadEnvironments, loadCurrentEnv, loadSessions, dialogOpen]);

  // Handle launch
  const handleLaunch = useCallback(async () => {
    try {
      await launchClaudeCode(undefined, undefined, launchClient);
      if (launchClient === 'claude') {
        navigateToTab('sessions');
      }
    } catch (err) {
      console.error('Launch failed:', err);
    }
  }, [launchClaudeCode, launchClient, navigateToTab]);

  // Global keyboard shortcuts (Cmd+1..9 for tabs, Cmd+Enter/N for launch, Cmd+, for settings)
  const globalShortcuts = useMemo(() => ({
    'meta+1': () => navigateToTab('dashboard'),
    'meta+2': () => navigateToTab('sessions'),
    'meta+3': () => navigateToTab('environments'),
    'meta+4': () => navigateToTab('skills'),
    'meta+5': () => navigateToTab('history'),
    'meta+6': () => navigateToTab('cron'),
    'meta+7': () => navigateToTab('chat-app'),
    'meta+8': () => navigateToTab('analytics'),
    'meta+9': () => navigateToTab('proxy-debug'),
    'meta+enter': () => handleLaunch(),
    'meta+n': () => handleLaunch(),
    'meta+,': () => navigateToTab('settings'),
    'meta+q': () => invoke('quit_app'),
  }), [handleLaunch, navigateToTab]);

  useKeyboardShortcuts(globalShortcuts);

  // Handle launch with specific directory
  const handleLaunchWithDir = async (workingDir: string) => {
    try {
      await launchClaudeCode(workingDir, undefined, launchClient);
      if (launchClient === 'claude') {
        navigateToTab('sessions');
      }
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
            onNavigate={navigateToTab}
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
      case 'chat-app':
        return <ChatAppPage />;
      case 'proxy-debug':
        return <ProxyDebugPage />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={navigateToTab} onLaunch={handleLaunch} onLaunchWithDir={handleLaunchWithDir} />;
    }
  };

  return (
    <LocaleProvider>
      <TooltipProvider delayDuration={120}>
        <AppLayout
          activeTab={activeTab}
          onTabChange={navigateToTab}
          onTabPrefetch={prefetchTab}
          fullBleed={activeTab === 'history'}
        >
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
      </TooltipProvider>
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
