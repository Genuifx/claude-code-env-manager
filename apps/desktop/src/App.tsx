import { useEffect, useState } from 'react';
import { ENV_PRESETS } from '@ccem/core/browser';
import { AppLayout } from '@/components/layout';
import { Dashboard, Environments, Permissions, Settings } from '@/pages';
import { useAppStore, type Environment } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { EnvironmentDialog } from '@/components/EnvironmentDialog';
import { Toaster } from 'sonner';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingEnvName, setEditingEnvName] = useState<string | undefined>();

  const {
    setEnvironments,
    setCurrentEnv,
    environments,
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

  // Initialize data on mount
  useEffect(() => {
    loadEnvironments().catch(() => {
      // Fallback to presets if Tauri is not available (dev mode)
      const envList: Environment[] = Object.entries(ENV_PRESETS).map(([name, config]) => ({
        name,
        baseUrl: config.ANTHROPIC_BASE_URL || '',
        model: config.ANTHROPIC_MODEL || '',
      }));
      // Add official preset
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
    // Load sessions on mount
    loadSessions().catch((err) => {
      console.error('Failed to load sessions:', err);
    });
    // Load app config on mount
    loadAppConfig().catch((err) => {
      console.error('Failed to load app config:', err);
    });
  }, []);

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
      case 'environments':
        return (
          <Environments
            onAddEnv={handleAddEnv}
            onEditEnv={handleEditEnv}
            onDeleteEnv={handleDeleteEnv}
          />
        );
      case 'permissions':
        return (
          <Permissions
            onLaunch={handleLaunch}
          />
        );
      case 'skills':
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
              <span className="text-4xl">✦</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Skills 功能</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
              管理 Claude Code 技能扩展，敬请期待...
            </p>
          </div>
        );
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
