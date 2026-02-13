import { useCallback, useEffect, useMemo, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { ENV_PRESETS } from '@ccem/core/browser';
import { AppLayout } from '@/components/layout';
import { Dashboard, Environments, Sessions, Analytics, Settings, Skills, History } from '@/pages';
import { useAppStore, type Environment } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { EnvironmentDialog } from '@/components/EnvironmentDialog';
import { Toaster, toast } from 'sonner';
import { LocaleProvider, useLocale } from '@/locales';
import type { UsageStats } from '@/types/analytics';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingEnvName, setEditingEnvName] = useState<string | undefined>();
  const [pendingDeleteEnv, setPendingDeleteEnv] = useState<string | null>(null);

  const {
    setEnvironments,
    setCurrentEnv,
    setPermissionMode,
    setUsageStats,
    environments,
    error,
    setError,
  } = useAppStore();

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

    const setupListeners = async () => {
      try {
        unlisteners.push(await listen('tray-launch-claude', () => {
          handleLaunch();
        }));

        unlisteners.push(await listen('navigate-to-settings', () => {
          setActiveTab('settings');
        }));

        unlisteners.push(await listen<{ env: string }>('env-changed', (event) => {
          setCurrentEnv(event.payload.env);
        }));

        unlisteners.push(await listen<{ perm: string }>('perm-changed', (event) => {
          setPermissionMode(event.payload.perm as any);
        }));
      } catch (err) {
        console.error('Failed to setup tray event listeners:', err);
      }
    };

    setupListeners();

    return () => {
      unlisteners.forEach(fn => fn());
    };
  }, []);

  // Load all data from backend (reusable for both init and refresh)
  const refreshData = async () => {
    loadEnvironments().catch(() => {
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
    loadCurrentEnv().catch(() => {
      setCurrentEnv('official');
    });
    loadSessions().catch((err) => {
      console.error('Failed to load sessions:', err);
    });
    loadAppConfig().catch((err) => {
      console.error('Failed to load app config:', err);
    });
    loadInstalledSkills().catch((err) => {
      console.error('Failed to load installed skills:', err);
    });
    try {
      const stats = await invoke('get_usage_stats');
      if (stats) {
        setUsageStats(stats as UsageStats);
      }
    } catch {
      console.debug('Usage stats not available from backend, will use mock data when Analytics tab is opened');
    }
  };

  // Initialize data on mount
  useEffect(() => {
    refreshData();
  }, []);

  // Re-sync with CLI config when window regains focus
  // This ensures desktop stays in sync when user modifies env via `ccem add/del/use` in terminal
  useEffect(() => {
    const handleFocus = () => {
      loadEnvironments().catch(() => {});
      loadCurrentEnv().catch(() => {});
      loadSessions().catch(() => {});
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadEnvironments, loadCurrentEnv, loadSessions]);

  // Handle launch
  const handleLaunch = useCallback(async () => {
    try {
      await launchClaudeCode();
    } catch (err) {
      console.error('Launch failed:', err);
    }
  }, [launchClaudeCode]);

  // Global keyboard shortcuts (Cmd+1..6 for tabs, Cmd+Enter/N for launch, Cmd+, for settings)
  const globalShortcuts = useMemo(() => ({
    'meta+1': () => setActiveTab('dashboard'),
    'meta+2': () => setActiveTab('sessions'),
    'meta+3': () => setActiveTab('environments'),
    'meta+4': () => setActiveTab('analytics'),
    'meta+5': () => setActiveTab('skills'),
    'meta+6': () => setActiveTab('history'),
    'meta+7': () => setActiveTab('settings'),
    'meta+enter': () => handleLaunch(),
    'meta+n': () => handleLaunch(),
    'meta+,': () => setActiveTab('settings'),
  }), [handleLaunch]);

  useKeyboardShortcuts(globalShortcuts);

  // Handle launch with specific directory
  const handleLaunchWithDir = async (workingDir: string) => {
    try {
      await launchClaudeCode(workingDir);
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

  // Derive page title from active tab
  const pageTitleMap: Record<string, string> = {
    dashboard: 'Home',
    sessions: 'Sessions',
    environments: 'Environments',
    analytics: 'Analytics',
    skills: 'Skills',
    history: 'History',
    settings: 'Settings',
  };
  const pageTitle = pageTitleMap[activeTab] || 'Home';

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
        return <Analytics />;
      case 'skills':
        return <Skills />;
      case 'history':
        return <History />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={setActiveTab} onLaunch={handleLaunch} onLaunchWithDir={handleLaunchWithDir} />;
    }
  };

  return (
    <LocaleProvider>
      <AppLayout activeTab={activeTab} onTabChange={setActiveTab} pageTitle={pageTitle}>
        <div key={activeTab}>
          {renderPage()}
        </div>
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
