import { useState, useEffect } from 'react';
import { ENV_PRESETS, PERMISSION_PRESETS, type PermissionModeName } from '@ccem/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Environment {
  name: string;
  baseUrl: string;
  model: string;
  isActive: boolean;
}

function App() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [currentEnv, setCurrentEnv] = useState<string>('official');
  const [currentMode, setCurrentMode] = useState<PermissionModeName>('dev');

  useEffect(() => {
    // Load environment presets
    const envs: Environment[] = Object.entries(ENV_PRESETS).map(([name, config]) => ({
      name,
      baseUrl: config.ANTHROPIC_BASE_URL || '',
      model: config.ANTHROPIC_MODEL || '',
      isActive: name === currentEnv,
    }));
    setEnvironments(envs);
  }, [currentEnv]);

  const handleEnvSelect = (name: string) => {
    setCurrentEnv(name);
  };

  const handleModeSelect = (mode: PermissionModeName) => {
    setCurrentMode(mode);
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
          <Button variant="ghost" size="sm">
            ⚙️ Settings
          </Button>
        </div>
      </header>

      <main className="space-y-6">
        {/* Environment Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Environments</CardTitle>
            <CardDescription>Select an environment to use with Claude Code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {environments.map((env) => (
              <div
                key={env.name}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  currentEnv === env.name
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-muted/30 border-transparent hover:bg-muted/50'
                }`}
                onClick={() => handleEnvSelect(env.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {currentEnv === env.name ? '✓' : '○'}
                    </span>
                    <div>
                      <span className="font-medium text-foreground">{env.name}</span>
                      <p className="text-muted-foreground text-xs mt-0.5 truncate max-w-[300px]">
                        {env.baseUrl}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {env.model}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Permission Modes Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🛡️ Permission Mode
            </CardTitle>
            <CardDescription>
              Current: <span className="font-medium">{getModeIcon(currentMode)} {currentMode}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PERMISSION_PRESETS) as PermissionModeName[]).map((mode) => (
                <Button
                  key={mode}
                  variant={currentMode === mode ? 'default' : 'outline'}
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

        {/* Actions */}
        <div className="flex gap-3">
          <Button className="flex-1" size="lg">
            ▶️ Launch Claude Code
          </Button>
        </div>

        {/* Status Bar */}
        <div className="text-center text-xs text-muted-foreground">
          <span>Environment: {currentEnv}</span>
          <span className="mx-2">•</span>
          <span>Mode: {currentMode}</span>
        </div>
      </main>
    </div>
  );
}

export default App;
