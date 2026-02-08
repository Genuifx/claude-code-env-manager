import { useState, useRef, useCallback, useEffect } from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProjectList } from '@/components/projects';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useCountUp } from '@/hooks/useCountUp';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import { useLocale } from '../locales';
import { DashboardSkeleton } from '@/components/ui/skeleton-states';

function AmberDot({ value, hasLaunched }: { value: number; hasLaunched: boolean }) {
  if (value !== 0 || hasLaunched) return null;
  return <span className="w-1 h-1 bg-primary rounded-full inline-block ml-1.5 align-middle" />;
}

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onLaunch: () => void;
  onLaunchWithDir: (dir: string) => void;
}

export function Dashboard({ onNavigate, onLaunch, onLaunchWithDir }: DashboardProps) {
  const { t } = useLocale();

  const {
    currentEnv,
    environments,
    permissionMode,
    setPermissionMode,
    selectedWorkingDir,
    sessions,
    usageStats,
    setSelectedWorkingDir,
    isLoadingEnvs,
    isLoadingStats,
  } = useAppStore();

  const { openDirectoryPicker, switchEnvironment } = useTauriCommands();

  // FTUE flags — read synchronously from localStorage at mount
  const [hasLaunched, setHasLaunched] = useState(
    () => localStorage.getItem('ccem-ftue-launched') === 'true'
  );

  // Launch success feedback — "Launched ✓" for 1 second
  const [launched, setLaunched] = useState(false);
  const launchedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear launch feedback timer on unmount
  useEffect(() => {
    return () => {
      if (launchedTimerRef.current) {
        clearTimeout(launchedTimerRef.current);
      }
    };
  }, []);

  // Whether to show the "Add more environments" link
  // Reactive via Zustand (environments.length), with localStorage as fallback
  const showAddEnvsLink = environments.length <= 1 && !localStorage.getItem('ccem-ftue-envs-added');

  const handleSelectDirectory = async () => {
    try {
      const dir = await openDirectoryPicker();
      if (dir) {
        setSelectedWorkingDir(dir);
      }
    } catch (err) {
      console.error('Failed to open directory dialog:', err);
    }
  };

  // Compute raw stat values before skeleton check so useCountUp hooks can be called unconditionally
  const todayTokensRaw = (usageStats?.today.inputTokens ?? 0) + (usageStats?.today.outputTokens ?? 0);
  const todayCostRaw = usageStats?.today.cost ?? 0;

  // Count-up animation for stat card values (hooks must be called before conditional returns)
  const animatedSessions = useCountUp(sessions.length);
  const animatedTokens = useCountUp(todayTokensRaw);
  const animatedCostCents = useCountUp(Math.round(todayCostRaw * 100));

  const handleLaunchClick = useCallback(() => {
    if (selectedWorkingDir) {
      onLaunchWithDir(selectedWorkingDir);
    } else {
      onLaunch();
    }
    // Set FTUE launched flag
    localStorage.setItem('ccem-ftue-launched', 'true');
    setHasLaunched(true);

    // Show "Launched ✓" feedback for 1 second
    // Clear any existing timer to avoid stale state
    if (launchedTimerRef.current) {
      clearTimeout(launchedTimerRef.current);
    }
    setLaunched(true);
    launchedTimerRef.current = setTimeout(() => {
      setLaunched(false);
      launchedTimerRef.current = null;
    }, 1000);
  }, [selectedWorkingDir, onLaunch, onLaunchWithDir]);

  // Show skeleton when environments or stats are loading
  if (isLoadingEnvs || isLoadingStats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-transition-enter space-y-5">
      {/* Status Bar */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t('dashboard.currentEnv')}</span>
        <span className="px-2 py-1 rounded bg-chart-2/15 text-chart-2 font-medium">
          {currentEnv}
        </span>
        <span>·</span>
        <span>{t('dashboard.permissions')}</span>
        <span className="px-2 py-1 rounded bg-chart-4/15 text-chart-4 font-medium">
          {permissionMode}
        </span>
        <span>·</span>
        <span>{sessions.length} {t('dashboard.sessionsRunning')}</span>
      </div>

      {/* Launch Center */}
      <div className="flex flex-col items-center justify-center py-6">
        <Button
          size="xl"
          onClick={handleLaunchClick}
          className="h-13 px-8 text-lg font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-md transition-all duration-150"
        >
          {launched ? t('dashboard.launched') : t('dashboard.launch')}
        </Button>

        {/* Quick Actions */}
        <div className="flex items-center gap-4 mt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('dashboard.environment')}</span>
            <select
              value={currentEnv}
              onChange={(e) => {
                switchEnvironment(e.target.value);
              }}
              className="px-3 py-2 rounded-lg border border-border bg-card text-foreground"
            >
              {environments.length > 0 ? (
                environments.map((env) => (
                  <option key={env.name} value={env.name}>{env.name}</option>
                ))
              ) : (
                <option value={currentEnv}>{currentEnv}</option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('dashboard.permissions')}</span>
            <select
              value={permissionMode}
              onChange={(e) => {
                setPermissionMode(e.target.value as PermissionModeName);
              }}
              className="px-3 py-2 rounded-lg border border-border bg-card text-foreground"
            >
              {Object.keys(PERMISSION_PRESETS).map((mode) => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </div>

          <Button variant="outline" onClick={handleSelectDirectory}>
            <FolderOpen className="w-4 h-4 mr-2" />
            {selectedWorkingDir ? t('dashboard.changeDir') : t('dashboard.selectDir')}
          </Button>
        </div>

        {selectedWorkingDir && (
          <div className="mt-4 text-sm text-muted-foreground">
            {t('dashboard.workingDir')} {selectedWorkingDir}
          </div>
        )}

        {/* FTUE: Add more environments link */}
        {showAddEnvsLink && (
          <button
            className="mt-3 text-sm text-primary hover:underline cursor-pointer bg-transparent border-0 p-0"
            onClick={() => onNavigate('environments')}
          >
            {t('dashboard.addMoreEnvs')}
          </button>
        )}
      </div>

      {/* Today's Usage Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('sessions')}
        >
          <div className="text-sm text-muted-foreground mb-1">
            {t('dashboard.runningSessions')}
          </div>
          <div className="text-2xl font-bold text-foreground">
            {animatedSessions}
            <AmberDot value={sessions.length} hasLaunched={hasLaunched} />
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('analytics')}
        >
          <div className="text-sm text-muted-foreground mb-1">
            {t('dashboard.todayTokens')}
          </div>
          <div className="text-2xl font-bold text-foreground">
            {(animatedTokens / 1000).toFixed(1)}K
            <AmberDot value={todayTokensRaw} hasLaunched={hasLaunched} />
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('analytics')}
        >
          <div className="text-sm text-muted-foreground mb-1">
            {t('dashboard.todayCost')}
          </div>
          <div className="text-2xl font-bold text-foreground">
            ${(animatedCostCents / 100).toFixed(2)}
            <AmberDot value={todayCostRaw} hasLaunched={hasLaunched} />
          </div>
        </Card>
      </div>

      {/* Recent Projects */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t('dashboard.recentProjects')}
        </h3>
        <ProjectList onLaunch={onLaunchWithDir} />
      </div>
    </div>
  );
}
