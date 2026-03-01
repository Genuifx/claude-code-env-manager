import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { LaunchStrip } from '@/components/dashboard/LaunchStrip';
import { MetricsRow } from '@/components/dashboard/MetricsRow';
import { QuickLaunchGrid } from '@/components/dashboard/QuickLaunchGrid';
import { LiveSessions } from '@/components/dashboard/LiveSessions';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { DashboardSkeleton } from '@/components/ui/skeleton-states';
import type { PermissionModeName } from '@ccem/core/browser';
import { shallow } from 'zustand/shallow';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onLaunch: () => void;
  onLaunchWithDir: (dir: string) => void;
}

export function Dashboard({ onNavigate, onLaunch, onLaunchWithDir }: DashboardProps) {
  const {
    launchClient,
    setLaunchClient,
    currentEnv,
    environments,
    permissionMode,
    setPermissionMode,
    selectedWorkingDir,
    setSelectedWorkingDir,
    recent,
    isLoadingEnvs,
    isLoadingStats,
  } = useAppStore(
    (state) => ({
      launchClient: state.launchClient,
      setLaunchClient: state.setLaunchClient,
      currentEnv: state.currentEnv,
      environments: state.environments,
      permissionMode: state.permissionMode,
      setPermissionMode: state.setPermissionMode,
      selectedWorkingDir: state.selectedWorkingDir,
      setSelectedWorkingDir: state.setSelectedWorkingDir,
      recent: state.recent,
      isLoadingEnvs: state.isLoadingEnvs,
      isLoadingStats: state.isLoadingStats,
    }),
    shallow
  );

  const { openDirectoryPicker, switchEnvironment, loadCronTasks, checkCodexInstalled } = useTauriCommands();
  const [codexInstalled, setCodexInstalled] = useState(true);

  // Launch feedback
  const [launched, setLaunched] = useState(false);
  const launchedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (launchedTimerRef.current) clearTimeout(launchedTimerRef.current);
    };
  }, []);

  // Load cron tasks on mount for the Cron metric card
  useEffect(() => {
    loadCronTasks().catch(() => {});
  }, [loadCronTasks]);

  useEffect(() => {
    checkCodexInstalled()
      .then((installed) => {
        setCodexInstalled(installed);
        if (!installed && launchClient === 'codex') {
          setLaunchClient('claude');
        }
      })
      .catch(() => {
        setCodexInstalled(false);
        if (launchClient === 'codex') {
          setLaunchClient('claude');
        }
      });
  }, [checkCodexInstalled, launchClient, setLaunchClient]);

  const handleSelectDirectory = useCallback(async () => {
    try {
      const dir = await openDirectoryPicker();
      if (dir) setSelectedWorkingDir(dir);
    } catch (err) {
      console.error('Failed to open directory dialog:', err);
    }
  }, [openDirectoryPicker, setSelectedWorkingDir]);

  const handlePickRecentDir = useCallback((dir: string) => {
    setSelectedWorkingDir(dir);
  }, [setSelectedWorkingDir]);

  const handleLaunchClick = useCallback(() => {
    if (selectedWorkingDir) {
      onLaunchWithDir(selectedWorkingDir);
    } else {
      onLaunch();
    }
    localStorage.setItem('ccem-ftue-launched', 'true');

    if (launchedTimerRef.current) clearTimeout(launchedTimerRef.current);
    setLaunched(true);
    launchedTimerRef.current = setTimeout(() => {
      setLaunched(false);
      launchedTimerRef.current = null;
    }, 1200);
  }, [selectedWorkingDir, onLaunch, onLaunchWithDir]);

  const dashboardShortcuts = useMemo(() => ({
    'meta+o': () => handleSelectDirectory(),
  }), [handleSelectDirectory]);

  useKeyboardShortcuts(dashboardShortcuts);

  // Recent directories for LaunchStrip dropdown (max 5, unique)
  const recentDirs = useMemo(() => {
    return recent
      .map(r => r.path)
      .filter((p, i, arr) => arr.indexOf(p) === i)
      .slice(0, 5);
  }, [recent]);

  if (isLoadingEnvs || isLoadingStats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-transition-enter flex flex-col gap-4 min-h-0">
      {/* Zone 1: Launch Strip */}
      <LaunchStrip
        launchClient={launchClient}
        codexInstalled={codexInstalled}
        currentEnv={currentEnv}
        environments={environments}
        permissionMode={permissionMode as PermissionModeName}
        selectedWorkingDir={selectedWorkingDir}
        recentDirs={recentDirs}
        launched={launched}
        onSetLaunchClient={setLaunchClient}
        onSwitchEnv={switchEnvironment}
        onSetPermMode={setPermissionMode}
        onSelectDir={handleSelectDirectory}
        onPickRecentDir={handlePickRecentDir}
        onLaunch={handleLaunchClick}
      />

      {/* Zone 2: Bento Grid — Metrics left + Projects right */}
      <div className="grid grid-cols-2 gap-3 min-h-0 items-start">
        <MetricsRow onNavigate={onNavigate} />
        <QuickLaunchGrid onLaunch={onLaunchWithDir} />
      </div>

      {/* Zone 3: Live Sessions — full width, only when active */}
      <LiveSessions onNavigate={onNavigate} />
    </div>
  );
}
