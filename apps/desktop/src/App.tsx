import { useEffect, useState } from 'react';
import { ENV_PRESETS, PERMISSION_PRESETS, type PermissionModeName } from '@ccem/core/browser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore, type Environment } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { EnvironmentDialog } from '@/components/EnvironmentDialog';
import { SettingsDialog } from '@/components/SettingsDialog';

function App() {
  const {
    environments,
    currentEnv,
    permissionMode,
    setPermissionMode,
    isLoading,
    error,
    sessions,
    setEnvironments,
    setCurrentEnv,
  } = useAppStore();

  const {
    loadEnvironments,
    loadCurrentEnv,
    switchEnvironment,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    launchClaudeCode,
    loadSessions,
    stopSession,
    deleteSession,
  } = useTauriCommands();

  // Dialog state for environment CRUD
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingEnv, setEditingEnv] = useState<Environment | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    // Try to load from Tauri backend first
    loadEnvironments().catch(() => {
      // Fallback to presets if Tauri is not available (dev mode)
      const envs = Object.entries(ENV_PRESETS).map(([name, config]) => ({
        name,
        baseUrl: config.ANTHROPIC_BASE_URL || '',
        model: config.ANTHROPIC_MODEL || '',
      }));
      setEnvironments(envs);
    });
    loadCurrentEnv().catch(() => {
      setCurrentEnv('official');
    });
    loadSessions().catch(() => {
      // Sessions will be empty in dev mode
    });
  }, []);

  const handleEnvSelect = async (name: string) => {
    try {
      await switchEnvironment(name);
    } catch {
      // Fallback for dev mode
      setCurrentEnv(name);
    }
  };

  const handleModeSelect = (mode: PermissionModeName) => {
    setPermissionMode(mode);
  };

  const handleLaunch = async () => {
    try {
      await launchClaudeCode();
    } catch (err) {
      console.error('Launch failed:', err);
    }
  };

  // Handler functions for environment CRUD
  const handleAddClick = () => {
    setDialogMode('add');
    setEditingEnv(undefined);
    setDialogOpen(true);
  };

  const handleEditClick = (env: Environment) => {
    setDialogMode('edit');
    setEditingEnv(env);
    setDialogOpen(true);
  };

  const handleDeleteClick = async (name: string) => {
    if (confirm(`Are you sure you want to delete the environment "${name}"?`)) {
      try {
        await deleteEnvironment(name);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const handleSaveEnvironment = async (env: Environment) => {
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

  const getModeIcon = (mode: PermissionModeName): string => {
    const icons: Record<PermissionModeName, string> = {
      yolo: '🔓',
      dev: '💻',
      readonly: '👀',
      safe: '🛡️',
      ci: '🔧',
      audit: '🔍',
    };
    return icons[mode];
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">CCEM Desktop</h1>
            <p className="text-muted-foreground text-sm mt-1">Claude Code Environment Manager</p>
          </div>
          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                {sessions.length} active
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
              ⚙️ Settings
            </Button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      <main className="space-y-6">
        {/* Environment Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Environments</CardTitle>
              <CardDescription>Select an environment to use with Claude Code</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddClick}>
              ➕ Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
            {environments.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                {isLoading ? 'Loading...' : 'No environments configured'}
              </div>
            ) : (
              environments.map((env) => (
                <div
                  key={env.name}
                  className={`group p-3 rounded-lg cursor-pointer transition-all border ${
                    currentEnv === env.name
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-muted/30 border-transparent hover:bg-muted/50'
                  }`}
                  onClick={() => handleEnvSelect(env.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg ${currentEnv === env.name ? 'text-primary' : 'text-muted-foreground'}`}>
                        {currentEnv === env.name ? '✓' : '○'}
                      </span>
                      <div>
                        <span className="font-medium text-foreground">{env.name}</span>
                        <p className="text-muted-foreground text-xs mt-0.5 truncate max-w-[280px]">
                          {env.baseUrl}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {env.model}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(env);
                          }}
                        >
                          ✏️
                        </Button>
                        {env.name !== 'official' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(env.name);
                            }}
                          >
                            🗑️
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Permission Modes Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🛡️ Permission Mode
            </CardTitle>
            <CardDescription>
              Current: <span className="font-medium">{getModeIcon(permissionMode)} {permissionMode}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PERMISSION_PRESETS) as PermissionModeName[]).map((mode) => (
                <Button
                  key={mode}
                  variant={permissionMode === mode ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start"
                  onClick={() => handleModeSelect(mode)}
                >
                  <span className="mr-2">{getModeIcon(mode)}</span>
                  {mode}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sessions Card */}
        {sessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Sessions</CardTitle>
              <CardDescription>{sessions.length} Claude Code instance(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm">{session.envName}</span>
                    <p className="text-xs text-muted-foreground truncate">{session.workingDir}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      session.status === 'running' ? 'bg-green-100 text-green-700' :
                      session.status === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {session.status}
                    </span>
                    {session.status === 'running' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => stopSession(session.id)}
                      >
                        ⏹
                      </Button>
                    )}
                    {session.status === 'stopped' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => deleteSession(session.id)}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            className="flex-1"
            size="lg"
            onClick={handleLaunch}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Launching...' : '▶️ Launch Claude Code'}
          </Button>
        </div>

        {/* Status Bar */}
        <div className="text-center text-xs text-muted-foreground">
          <span>Environment: {currentEnv}</span>
          <span className="mx-2">•</span>
          <span>Mode: {permissionMode}</span>
          {sessions.length > 0 && (
            <>
              <span className="mx-2">•</span>
              <span>Sessions: {sessions.length}</span>
            </>
          )}
        </div>
      </main>

      {/* Environment Dialog */}
      <EnvironmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        environment={editingEnv}
        onSave={handleSaveEnvironment}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}

export default App;
