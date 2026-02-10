import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  FolderOpen,
  Play,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Zap,
  DollarSign,
  Flame,
  Shield,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProjectList } from '@/components/projects';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useCountUp } from '@/hooks/useCountUp';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import { useLocale } from '../locales';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { DashboardSkeleton } from '@/components/ui/skeleton-states';

/* ── Permission mode color mapping ── */
const PERM_COLORS: Record<string, string> = {
  yolo: 'bg-destructive/15 text-destructive border-destructive/30',
  dev: 'bg-success/15 text-success border-success/30',
  safe: 'bg-primary/15 text-primary border-primary/30',
  readonly: 'bg-info/15 text-info border-info/30',
  ci: 'bg-chart-4/15 text-chart-4 border-chart-4/30',
  audit: 'bg-accent/15 text-accent border-accent/30',
};

const PERM_ICONS: Record<string, string> = {
  yolo: 'Unrestricted',
  dev: 'Development',
  safe: 'Conservative',
  readonly: 'Read Only',
  ci: 'CI/CD',
  audit: 'Audit',
};

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
    continuousUsageDays,
    setSelectedWorkingDir,
    isLoadingEnvs,
    isLoadingStats,
  } = useAppStore();

  const { openDirectoryPicker, switchEnvironment } = useTauriCommands();

  // FTUE flags
  const [hasLaunched, setHasLaunched] = useState(
    () => localStorage.getItem('ccem-ftue-launched') === 'true'
  );

  // Launch feedback
  const [launched, setLaunched] = useState(false);
  const launchedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dropdown states
  const [envDropdownOpen, setEnvDropdownOpen] = useState(false);
  const [permDropdownOpen, setPermDropdownOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (launchedTimerRef.current) clearTimeout(launchedTimerRef.current);
    };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = () => {
      setEnvDropdownOpen(false);
      setPermDropdownOpen(false);
    };
    if (envDropdownOpen || permDropdownOpen) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [envDropdownOpen, permDropdownOpen]);

  const handleSelectDirectory = useCallback(async () => {
    try {
      const dir = await openDirectoryPicker();
      if (dir) setSelectedWorkingDir(dir);
    } catch (err) {
      console.error('Failed to open directory dialog:', err);
    }
  }, [openDirectoryPicker, setSelectedWorkingDir]);

  const dashboardShortcuts = useMemo(() => ({
    'meta+o': () => handleSelectDirectory(),
  }), [handleSelectDirectory]);

  useKeyboardShortcuts(dashboardShortcuts);

  // Stat values
  const todayTokensRaw = (usageStats?.today.inputTokens ?? 0) + (usageStats?.today.outputTokens ?? 0);
  const todayCostRaw = usageStats?.today.cost ?? 0;
  const weekTokensRaw = (usageStats?.week.inputTokens ?? 0) + (usageStats?.week.outputTokens ?? 0);
  const weekCostRaw = usageStats?.week.cost ?? 0;

  // Animated values
  const animatedSessions = useCountUp(sessions.length);
  const animatedTokens = useCountUp(todayTokensRaw);
  const animatedCostCents = useCountUp(Math.round(todayCostRaw * 100));
  const animatedStreak = useCountUp(continuousUsageDays);

  const handleLaunchClick = useCallback(() => {
    if (selectedWorkingDir) {
      onLaunchWithDir(selectedWorkingDir);
    } else {
      onLaunch();
    }
    localStorage.setItem('ccem-ftue-launched', 'true');
    setHasLaunched(true);

    if (launchedTimerRef.current) clearTimeout(launchedTimerRef.current);
    setLaunched(true);
    launchedTimerRef.current = setTimeout(() => {
      setLaunched(false);
      launchedTimerRef.current = null;
    }, 1200);
  }, [selectedWorkingDir, onLaunch, onLaunchWithDir]);

  const activeSessions = sessions.filter(s => s.status === 'running').length;
  const permColorClass = PERM_COLORS[permissionMode] || PERM_COLORS.dev;

  // Truncate directory path for display
  const dirDisplay = selectedWorkingDir
    ? selectedWorkingDir.replace(/^\/Users\/[^/]+/, '~').split('/').slice(-2).join('/')
    : null;

  if (isLoadingEnvs || isLoadingStats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-transition-enter space-y-6">
      {/* ══ Zone 1: Status Header ══ */}
      <div className="hero-gradient glass-noise rounded-2xl p-5">
        <div className="flex items-center justify-between" role="status">
          {/* Environment Badge */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setEnvDropdownOpen(!envDropdownOpen); setPermDropdownOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-chart-2/[0.12] text-chart-2 border border-chart-2/[0.18] hover:bg-chart-2/20 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-chart-2" />
              <span className="font-semibold text-sm">{currentEnv}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            {envDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 rounded-xl glass-dropdown glass-noise z-50 py-1">
                {environments.map((env) => (
                  <button
                    key={env.name}
                    onClick={() => { switchEnvironment(env.name); setEnvDropdownOpen(false); }}
                    className={`glass-dropdown-item w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${
                      env.name === currentEnv ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    {env.name === currentEnv && <Check className="w-3.5 h-3.5" />}
                    <span className={env.name === currentEnv ? '' : 'ml-5.5'}>{env.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Permission Badge */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setPermDropdownOpen(!permDropdownOpen); setEnvDropdownOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors hover:opacity-80 ${permColorClass}`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="font-semibold text-sm">{permissionMode}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            {permDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-52 rounded-xl glass-dropdown glass-noise z-50 py-1">
                {Object.keys(PERMISSION_PRESETS).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { setPermissionMode(mode as PermissionModeName); setPermDropdownOpen(false); }}
                    className={`glass-dropdown-item w-full text-left px-4 py-2.5 text-sm flex items-center justify-between ${
                      mode === permissionMode ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    <span>{mode}</span>
                    <span className="text-2xs text-muted-foreground">{PERM_ICONS[mode]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Sessions Indicator */}
          <button
            onClick={() => onNavigate('sessions')}
            className="flex items-center gap-2 px-3 py-2 rounded-md glass-indicator"
          >
            {activeSessions > 0 && (
              <span className="w-2 h-2 rounded-full bg-success status-running" />
            )}
            <span className="text-sm font-medium text-foreground tabular-nums">
              {activeSessions}
            </span>
            <span className="text-sm text-muted-foreground">
              {t('dashboard.sessionsActive')}
            </span>
          </button>
        </div>
      </div>

      {/* ══ Zone 2: Quick Action Bar ══ */}
      <Card className="flex items-center justify-between p-3 shadow-elevation-1">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleSelectDirectory} className="gap-2 glass-outline-btn border-0">
            <FolderOpen className="w-4 h-4" />
            {dirDisplay ? (
              <span className="font-mono text-xs max-w-[180px] truncate">{dirDisplay}</span>
            ) : (
              <span>{t('dashboard.selectDir')}</span>
            )}
          </Button>
        </div>

        <Button
          onClick={handleLaunchClick}
          title={t('dashboard.launchShortcut')}
          className={`gap-2 px-6 font-semibold rounded-md glass-launch-btn transition-all duration-150 ${
            launched
              ? 'bg-success hover:bg-success ripple-success'
              : 'hover:-translate-y-0.5 active:scale-95'
          }`}
        >
          {launched ? (
            <>
              <Check className="w-4 h-4" />
              {t('dashboard.launched')}
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {t('dashboard.launchBtn')}
            </>
          )}
        </Button>
      </Card>

      {/* ══ Zone 3: Metrics Bento Grid ══ */}
      <div className="grid grid-cols-4 grid-rows-2 gap-4">
        {/* Sessions — Hero Card (tall left) */}
        <Card
          className="stat-card glass-noise p-8 cursor-pointer interactive-card card-stagger col-span-2 row-span-2"
          onClick={() => onNavigate('sessions')}
        >
          <div className="flex items-center gap-1.5 mb-4">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('dashboard.runningSessions')}
            </span>
          </div>
          <div className="gradient-text text-7xl font-bold tabular-nums leading-tight">
            {animatedSessions}
          </div>
          {!hasLaunched && sessions.length === 0 && (
            <p className="text-sm text-muted-foreground mt-4">{t('dashboard.launchToStart')}</p>
          )}
        </Card>

        {/* Tokens Today — Wide top-right */}
        <Card
          className="stat-card glass-noise p-5 cursor-pointer interactive-card card-stagger col-span-2"
          onClick={() => onNavigate('analytics')}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('dashboard.todayTokens')}
            </span>
          </div>
          <div className="gradient-text text-4xl font-bold tabular-nums leading-tight">
            {todayTokensRaw >= 1000
              ? `${(animatedTokens / 1000).toFixed(1)}K`
              : animatedTokens}
          </div>
          {weekTokensRaw > 0 && (
            <div className="flex items-center gap-1 mt-2 text-2xs text-muted-foreground">
              <span>{t('dashboard.weekTotal')}: {(weekTokensRaw / 1000).toFixed(0)}K</span>
            </div>
          )}
        </Card>

        {/* Cost Today — Bottom-middle */}
        <Card
          className="stat-card glass-noise p-5 cursor-pointer interactive-card card-stagger col-span-1"
          onClick={() => onNavigate('analytics')}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <DollarSign className="w-3.5 h-3.5 text-warning" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('dashboard.todayCost')}
            </span>
          </div>
          <div className="gradient-text text-4xl font-bold tabular-nums leading-tight">
            ${(animatedCostCents / 100).toFixed(2)}
          </div>
          {weekCostRaw > 0 && (
            <div className="flex items-center gap-1 mt-2 text-2xs text-muted-foreground">
              <span>{t('dashboard.weekTotal')}: ${weekCostRaw.toFixed(2)}</span>
            </div>
          )}
        </Card>

        {/* Streak — Bottom-right */}
        <Card
          className="stat-card glass-noise p-5 cursor-pointer interactive-card card-stagger col-span-1"
          onClick={() => onNavigate('analytics')}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Flame className="w-3.5 h-3.5 text-chart-5" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('dashboard.streak')}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="gradient-text text-4xl font-bold tabular-nums leading-tight">
              {animatedStreak}
            </span>
            <span className="text-lg text-muted-foreground">{t('dashboard.streakDays')}</span>
          </div>
          {continuousUsageDays >= 7 && (
            <div className="flex items-center gap-1 mt-2 text-2xs text-success">
              <TrendingUp className="w-3 h-3" />
              <span>{t('dashboard.streakKeepGoing')}</span>
            </div>
          )}
        </Card>
      </div>

      {/* ══ Zone 4: Recent Projects ══ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {t('dashboard.recentProjects')}
          </h3>
        </div>
        <ProjectList onLaunch={onLaunchWithDir} />
      </div>
    </div>
  );
}
