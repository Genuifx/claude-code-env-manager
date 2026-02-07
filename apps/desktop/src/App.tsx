import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { ENV_PRESETS } from '@ccem/core/browser';
import { AppLayout } from '@/components/layout';
import { Dashboard, Environments, Sessions, Analytics, Settings, Skills } from '@/pages';
import { useAppStore, type Environment } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { EnvironmentDialog } from '@/components/EnvironmentDialog';
import { Toaster, toast } from 'sonner';
import type { UsageStats } from '@/types/analytics';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingEnvName, setEditingEnvName] = useState<string | undefined>();

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
  const handleLaunch = async () => {
    try {
      await launchClaudeCode();
    } catch (err) {
      console.error('Launch failed:', err);
    }
  };

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

  const handleDeleteEnv = async (name: string) => {
    if (confirm(`确定要删除环境 "${name}" 吗？`)) {
      try {
        await deleteEnvironment(name);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const handleSaveEnv = async (env: Environment) => {
    try {
      if (dialogMode === 'add') {
        await addEnvironment(env);
      } else {
        await updateEnvironment(env);
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
        return <Sessions onLaunch={handleLaunch} />;
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
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={setActiveTab} onLaunch={handleLaunch} onLaunchWithDir={handleLaunchWithDir} />;
    }
  };

  return (
    <>
      <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderPage()}
      </AppLayout>

      {/* Environment Dialog */}
      <EnvironmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        environment={getEditingEnv()}
        onSave={handleSaveEnv}
      />

      {/* Toast notifications */}
      <Toaster position="top-center" richColors />
    </>
  );
}

export default App;
