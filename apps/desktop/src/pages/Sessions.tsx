import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, List, Minimize2, Plus, Terminal, X, FolderOpen, Globe, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LaunchButton } from '@/components/ui/LaunchButton';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  SessionCard,
  SessionList,
  ArrangeBanner,
  SessionLauncherPopover,
  RecoveryCandidatesPanel,
} from '@/components/sessions';
import { useAppStore, type ArrangeLayout, type Session, type UnifiedSession } from '@/store';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import { getEnvColorVar } from '@/lib/utils';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useLocale } from '../locales';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { SessionsSkeleton } from '@/components/ui/skeleton-states';
import { toast } from 'sonner';
import { shallow } from 'zustand/shallow';
import type {
  UnifiedSessionInfo,
  ManagedSessionSource,
  AttachedChannelInfo,
  TmuxAttachTerminalInfo,
  TmuxAttachTerminalType,
} from '@/lib/tauri-ipc';

// --- Helper: map snake_case UnifiedSessionInfo → camelCase UnifiedSession ---
function mapSourceToString(source: ManagedSessionSource): UnifiedSession['source'] {
  switch (source.type) {
    case 'desktop': return 'desktop';
    case 'telegram': return 'telegram';
    case 'cron': return 'cron';
    default: return 'cli';
  }
}

function mapChannelInfo(ch: AttachedChannelInfo): { kind: string; connectedAt: string; label?: string; rawKind?: import('@/lib/tauri-ipc').ChannelKind } {
  const kindStr = typeof ch.kind === 'string' ? ch.kind : ch.kind.kind;
  return {
    kind: kindStr,
    connectedAt: ch.connected_at,
    label: ch.label ?? undefined,
    rawKind: ch.kind as import('@/lib/tauri-ipc').ChannelKind,
  };
}

function toUnifiedSession(info: UnifiedSessionInfo): UnifiedSession {
  return {
    id: info.id,
    runtimeKind: info.runtime_kind,
    source: mapSourceToString(info.source),
    status: info.status,
    projectDir: info.project_dir,
    envName: info.env_name,
    permMode: info.perm_mode,
    createdAt: info.created_at,
    isActive: info.is_active,
    pid: info.pid ?? undefined,
    claudeSessionId: info.claude_session_id ?? undefined,
    tmuxTarget: info.tmux_target ?? undefined,
    client: info.client ?? undefined,
    channels: (info.channels ?? []).map(mapChannelInfo),
  };
}

function areChannelListsEqual(
  left: UnifiedSession['channels'],
  right: UnifiedSession['channels'],
) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((channel, index) => {
    const candidate = right[index];
    return candidate
      && candidate.kind === channel.kind
      && candidate.connectedAt === channel.connectedAt
      && candidate.label === channel.label;
  });
}

function areUnifiedSessionsEqual(left: UnifiedSession[], right: UnifiedSession[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((session, index) => {
    const candidate = right[index];
    return candidate
      && candidate.id === session.id
      && candidate.runtimeKind === session.runtimeKind
      && candidate.source === session.source
      && candidate.status === session.status
      && candidate.projectDir === session.projectDir
      && candidate.envName === session.envName
      && candidate.permMode === session.permMode
      && candidate.createdAt === session.createdAt
      && candidate.isActive === session.isActive
      && candidate.pid === session.pid
      && candidate.claudeSessionId === session.claudeSessionId
      && candidate.tmuxTarget === session.tmuxTarget
      && candidate.client === session.client
      && areChannelListsEqual(session.channels, candidate.channels);
  });
}

// --- Helper: create a placeholder legacy Session from a UnifiedSession ---
function unifiedToLegacySession(u: UnifiedSession): Session {
  const statusMap: Record<string, Session['status']> = {
    running: 'running',
    ready: 'running',
    processing: 'running',
    waiting_permission: 'running',
    initializing: 'running',
    completed: 'stopped',
    stopped: 'stopped',
    error: 'error',
  };
  return {
    id: u.id,
    client: (u.client?.toLowerCase() === 'codex' ? 'codex' : 'claude') as Session['client'],
    envName: u.envName,
    workingDir: u.projectDir,
    pid: u.pid,
    startedAt: new Date(u.createdAt),
    status: statusMap[u.status] ?? 'stopped',
    permMode: u.permMode,
  };
}

interface SessionsProps {
  onLaunch: () => void;
  onLaunchWithDir: (dir: string) => void;
}

export function Sessions({ onLaunch, onLaunchWithDir }: SessionsProps) {
  const { t } = useLocale();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showCloseAllDialog, setShowCloseAllDialog] = useState(false);
  const [isArranging, setIsArranging] = useState(false);
  const [arrangeStatus, setArrangeStatus] = useState<'normal' | 'loading' | 'success'>('normal');
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [isMultiLaunching, setIsMultiLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [tmuxAttachTerminals, setTmuxAttachTerminals] = useState<TmuxAttachTerminalInfo[]>([]);
  const launchedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const {
    sessions,
    isLoadingSessions,
    arrangeLayout,
    setArrangeLayout,
    selectedWorkingDir,
    setSelectedWorkingDir,
    unifiedSessions,
    setUnifiedSessions,
    setLoadingUnifiedSessions,
    currentEnv,
    environments,
    permissionMode,
    setPermissionMode,
  } = useAppStore(
    (state) => ({
      sessions: state.sessions,
      isLoadingSessions: state.isLoadingSessions,
      arrangeLayout: state.arrangeLayout,
      setArrangeLayout: state.setArrangeLayout,
      selectedWorkingDir: state.selectedWorkingDir,
      setSelectedWorkingDir: state.setSelectedWorkingDir,
      unifiedSessions: state.unifiedSessions,
      setUnifiedSessions: state.setUnifiedSessions,
      setLoadingUnifiedSessions: state.setLoadingUnifiedSessions,
      currentEnv: state.currentEnv,
      environments: state.environments,
      permissionMode: state.permissionMode,
      setPermissionMode: state.setPermissionMode,
    }),
    shallow
  );
  const {
    focusSession,
    listTmuxAttachTerminals,
    openInteractiveSessionInTerminal,
    minimizeSession,
    closeSession,
    arrangeSessions,
    launchClaudeCode,
    openDirectoryPicker,
    listUnifiedSessions,
    stopUnifiedSession,
    removeHeadlessSession,
    detachChannel,
    switchEnvironment,
  } = useTauriCommands();

  // --- Load unified sessions ---
  useEffect(() => {
    let cancelled = false;
    let isFirstLoad = true;

    const load = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      if (isFirstLoad) {
        setLoadingUnifiedSessions(true);
      }

      try {
        const infos = await listUnifiedSessions();
        if (!cancelled) {
          const nextSessions = infos.map(toUnifiedSession);
          const currentSessions = useAppStore.getState().unifiedSessions;
          if (!areUnifiedSessionsEqual(currentSessions, nextSessions)) {
            setUnifiedSessions(nextSessions);
          }
        }
      } catch (err) {
        console.error('Failed to load unified sessions:', err);
      } finally {
        if (!cancelled && isFirstLoad) {
          setLoadingUnifiedSessions(false);
        }
        isFirstLoad = false;
      }
    };
    load();
    // Refresh periodically
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [listUnifiedSessions, setUnifiedSessions, setLoadingUnifiedSessions]);

  useEffect(() => {
    let cancelled = false;

    const loadTerminals = async () => {
      try {
        const terminals = await listTmuxAttachTerminals();
        if (!cancelled) {
          setTmuxAttachTerminals(terminals);
        }
      } catch (err) {
        console.error('Failed to load tmux attach terminals:', err);
      }
    };

    void loadTerminals();

    return () => {
      cancelled = true;
    };
  }, [listTmuxAttachTerminals]);

  // --- Merge sessions: legacy (external terminal) + unified, dedup by id ---
  type DisplayItem = { session: Session; unifiedSession?: UnifiedSession };
  const mergedSessions: DisplayItem[] = useMemo(() => {
    const unifiedIds = new Set(unifiedSessions.map(u => u.id));

    // Legacy sessions not covered by unified
    const legacyOnly = sessions.filter(s => !unifiedIds.has(s.id));

    const items: DisplayItem[] = [];

    // Add unified sessions
    for (const u of unifiedSessions) {
      // Find matching legacy session for external terminal features
      const legacyMatch = sessions.find(s => s.id === u.id);
      items.push({
        session: legacyMatch ?? unifiedToLegacySession(u),
        unifiedSession: u,
      });
    }

    // Add legacy-only sessions (external terminal sessions not in unified)
    for (const s of legacyOnly) {
      items.push({ session: s });
    }

    return items;
  }, [sessions, unifiedSessions]);

  // --- Apply filter + counts (memoized) ---
  const { filteredSessions, totalCount } = useMemo(() => {
    // 显示全部会话（已移除 tab 过滤）
    return {
      filteredSessions: mergedSessions,
      totalCount: mergedSessions.length,
    };
  }, [mergedSessions]);

  // Force card view when any unified-only sessions are visible (list view lacks unified data)
  const hasUnifiedOnlyInView = filteredSessions.some(
    item => item.unifiedSession && !sessions.some(s => s.id === item.unifiedSession!.id)
  );
  const effectiveViewMode = hasUnifiedOnlyInView ? 'card' : viewMode;

  const runningSessions = sessions.filter(s => s.status === 'running');
  const externalRunningSessions = runningSessions.filter((session) => session.terminalType !== 'embedded');
  const externalRunningCount = externalRunningSessions.length;

  // Truncate directory path for display (same logic as Dashboard)
  const launchDirDisplay = selectedWorkingDir
    ? selectedWorkingDir.replace(/^\/Users\/[^/]+/, '~').split('/').slice(-2).join('/')
    : '~';

  // Smart layout: pick best layout based on session count, or use remembered layout
  const getSmartLayout = useCallback((): ArrangeLayout => {
    if (arrangeLayout) return arrangeLayout;
    if (externalRunningCount <= 2) return 'horizontal2';
    if (externalRunningCount === 3) return 'left_main3';
    return 'grid4';
  }, [arrangeLayout, externalRunningCount]);

  const selectedLayout = arrangeLayout || getSmartLayout();

  const handleArrange = useCallback(async (layout?: ArrangeLayout) => {
    if (externalRunningCount < 2 || isArranging) return;

    const targetLayout = layout || getSmartLayout();
    setIsArranging(true);
    setArrangeStatus('loading');

    try {
      const sessionIds = externalRunningSessions.map(s => s.id);
      await arrangeSessions(sessionIds, targetLayout);

      setArrangeStatus('success');
      const layoutNames: Record<ArrangeLayout, string> = {
        horizontal2: t('sessions.layoutHorizontal2'),
        vertical2: t('sessions.layoutVertical2'),
        grid4: t('sessions.layoutGrid4'),
        left_main3: t('sessions.layoutLeftMain3'),
      };
      toast.success(
        t('sessions.arrangeSuccess')
          .replace('{count}', String(externalRunningCount))
          .replace('{layout}', layoutNames[targetLayout])
      );

      // Reset success state after 1.5s
      setTimeout(() => setArrangeStatus('normal'), 1500);
    } catch (err) {
      setArrangeStatus('normal');
      toast.error(`${t('sessions.arrangeFailed')}: ${err}`);
    } finally {
      setIsArranging(false);
    }
  }, [externalRunningCount, isArranging, getSmartLayout, externalRunningSessions, arrangeSessions, t]);

  // Multi-session launch: serially launch N sessions, then auto-arrange
  const handleMultiLaunch = useCallback(async (dirs: string[], layout: ArrangeLayout) => {
    if (dirs.length === 0 || isMultiLaunching) return;

    setIsMultiLaunching(true);
    let successCount = 0;

    for (const dir of dirs) {
      try {
        await launchClaudeCode(dir);
        successCount++;
      } catch (err) {
        console.error(`Failed to launch session for ${dir}:`, err);
      }
    }

    // Wait for terminal windows to be ready before arranging
    if (successCount >= 2) {
      await new Promise(resolve => setTimeout(resolve, 800));

      try {
        const allRunning = useAppStore
          .getState()
          .sessions
          .filter((session) => session.status === 'running' && session.terminalType !== 'embedded');
        if (allRunning.length >= 2) {
          await arrangeSessions(allRunning.map(s => s.id), layout);
        }
        toast.success(
          t('sessions.multiLaunchSuccess').replace('{count}', String(successCount))
        );
      } catch (err) {
        // Sessions launched but arrange failed — still a partial success
        toast.success(
          t('sessions.multiLaunchPartial')
            .replace('{success}', String(successCount))
            .replace('{total}', String(dirs.length))
        );
      }
    } else if (successCount > 0) {
      toast.success(
        t('sessions.multiLaunchPartial')
          .replace('{success}', String(successCount))
          .replace('{total}', String(dirs.length))
      );
    }

    setIsMultiLaunching(false);
  }, [isMultiLaunching, launchClaudeCode, arrangeSessions, t]);

  // Browse directory and launch single session
  const handleBrowseAndLaunch = useCallback(async () => {
    const path = await openDirectoryPicker();
    if (path) {
      onLaunchWithDir(path);
    }
  }, [openDirectoryPicker, onLaunchWithDir]);

  // Single launch with success feedback
  const handleLaunchClick = useCallback(() => {
    if (selectedWorkingDir) {
      onLaunchWithDir(selectedWorkingDir);
    } else {
      onLaunch();
    }
    setLaunched(true);
    clearTimeout(launchedTimerRef.current);
    launchedTimerRef.current = setTimeout(() => setLaunched(false), 1200);
  }, [selectedWorkingDir, onLaunch, onLaunchWithDir]);

  // Select directory for launch
  const handleSelectDirectory = useCallback(async () => {
    const dir = await openDirectoryPicker();
    if (dir) setSelectedWorkingDir(dir);
  }, [openDirectoryPicker, setSelectedWorkingDir]);

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    'meta+shift+l': () => {
      if (externalRunningCount >= 2) handleArrange();
    },
    'meta+shift+n': () => {
      setLauncherOpen(true);
    },
  });

  // --- Helper: find the merged display item for a session id ---
  const findDisplayItem = useCallback((id: string): DisplayItem | undefined => {
    return mergedSessions.find(item => item.session.id === id || item.unifiedSession?.id === id);
  }, [mergedSessions]);

  // --- Helper: check if a session has a real legacy match (not a placeholder) ---
  const hasLegacySession = useCallback((id: string): boolean => {
    return sessions.some(s => s.id === id);
  }, [sessions]);

  const handleFocus = async (id: string) => {
    const item = findDisplayItem(id);
    // Only call focus for interactive sessions with a real legacy entry
    if (item?.unifiedSession?.runtimeKind === 'headless') return;
    if (!hasLegacySession(id) && item?.unifiedSession?.runtimeKind === 'interactive') {
      // Unified-only interactive: still try — the interactive runtime manager may know it
      // even though SessionManager doesn't
    }
    try {
      await focusSession(id);
    } catch (err) {
      console.error('Failed to focus session:', err);
    }
  };

  const handleMinimize = async (id: string) => {
    const item = findDisplayItem(id);
    if (item?.unifiedSession?.runtimeKind === 'headless') return;
    const target = sessions.find((session) => session.id === id);
    if (target?.terminalType === 'embedded') {
      return;
    }
    try {
      await minimizeSession(id);
    } catch (err) {
      console.error('Failed to minimize session:', err);
    }
  };

  const handleOpenInTerminal = async (id: string, terminalType?: TmuxAttachTerminalType) => {
    try {
      await openInteractiveSessionInTerminal(id, terminalType);
    } catch (err) {
      console.error('Failed to open interactive session in terminal:', err);
    }
  };

  const handleRequestClose = (id: string) => {
    setConfirmingId(id);
  };

  const handleCancelClose = () => {
    setConfirmingId(null);
  };

  const handleConfirmClose = async (id: string) => {
    try {
      const item = findDisplayItem(id);
      if (item?.unifiedSession?.runtimeKind === 'headless') {
        // Headless: stop first if running, then remove
        if (['ready', 'processing', 'waiting_permission', 'initializing'].includes(item.unifiedSession.status)) {
          await stopUnifiedSession(id);
        }
        await removeHeadlessSession(id);
      } else if (item?.unifiedSession && !hasLegacySession(id)) {
        // Unified-only interactive (no legacy match): use unified stop to avoid
        // legacy SessionManager lookup failure in close_interactive_session
        await stopUnifiedSession(id);
      } else {
        // Legacy interactive (has real SessionManager entry): use legacy close
        await closeSession(id);
      }
    } catch (err) {
      console.error('Failed to close session:', err);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleStopUnified = async (id: string) => {
    try {
      await stopUnifiedSession(id);
      toast.success(t('sessions.sessionStopped'));
    } catch (err) {
      toast.error(t('sessions.stopFailed').replace('{error}', String(err)));
    }
  };

  const handleRemoveHeadless = async (id: string) => {
    try {
      const item = findDisplayItem(id);
      // Stop if still running
      if (item?.unifiedSession && ['ready', 'processing', 'waiting_permission', 'initializing'].includes(item.unifiedSession.status)) {
        await stopUnifiedSession(id);
      }
      await removeHeadlessSession(id);
      toast.success(t('sessions.sessionStopped'));
    } catch (err) {
      toast.error(t('sessions.stopFailed').replace('{error}', String(err)));
    }
  };

  const handleDisconnectChannel = async (sessionId: string, channelKind: string) => {
    try {
      // Find the real ChannelKind from the unified session's channel data
      const item = findDisplayItem(sessionId);
      const channel = item?.unifiedSession?.channels.find(ch => ch.kind === channelKind);
      if (channel?.rawKind) {
        await detachChannel(sessionId, channel.rawKind);
      } else {
        console.error('Cannot disconnect: no rawKind for channel', channelKind);
      }
    } catch (err) {
      console.error('Failed to disconnect channel:', err);
    }
  };

  const handleMinimizeAll = async () => {
    for (const session of externalRunningSessions) {
      await minimizeSession(session.id);
    }
  };

  const handleCloseAll = async () => {
    setShowCloseAllDialog(false);
    // Close all merged sessions (both legacy and unified)
    for (const item of mergedSessions) {
      try {
        if (item.unifiedSession?.runtimeKind === 'headless') {
          if (['ready', 'processing', 'waiting_permission', 'initializing'].includes(item.unifiedSession.status)) {
            await stopUnifiedSession(item.unifiedSession.id);
          }
          await removeHeadlessSession(item.unifiedSession.id);
        } else if (item.unifiedSession && !hasLegacySession(item.session.id)) {
          // Unified-only interactive: use unified stop
          await stopUnifiedSession(item.unifiedSession.id);
        } else {
          // Legacy interactive
          await closeSession(item.session.id);
        }
      } catch (err) {
        console.error('Failed to close session:', item.session.id, err);
      }
    }
  };

  // Total count for display (merged)
  const totalDisplayCount = totalCount;

  // Show skeleton when sessions are loading
  if (isLoadingSessions && !sessions.length && !unifiedSessions.length) {
    return <SessionsSkeleton />;
  }

  return (
    <div className="page-transition-enter space-y-6">
      {/* Hero Card */}
      <div className="stat-card glass-noise p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          {/* View Mode Toggle - Left side */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg glass-subtle w-fit">
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`h-7 w-7 rounded-md flex items-center justify-center transition-all duration-150 ${
                  effectiveViewMode === 'card'
                    ? 'seg-active text-foreground'
                    : 'text-muted-foreground seg-hover hover:text-foreground'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                disabled={hasUnifiedOnlyInView}
                className={`h-7 w-7 rounded-md flex items-center justify-center transition-all duration-150 ${
                  effectiveViewMode === 'list'
                    ? 'seg-active text-foreground'
                    : hasUnifiedOnlyInView
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : 'text-muted-foreground seg-hover hover:text-foreground'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

          {/* Right side toolbar */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Directory selector */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectDirectory}
              className="glass-btn-outline"
            >
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline font-mono text-xs max-w-[140px] truncate">
                {launchDirDisplay || t('dashboard.selectDir')}
              </span>
            </Button>

            {/* Env + Perm selectors */}
            <span className="hidden sm:inline text-muted-foreground/20 text-xs select-none">·</span>

            <Select value={currentEnv} onValueChange={switchEnvironment}>
              <SelectTrigger variant="badge" badgeColor={getEnvColorVar(currentEnv)} className="hover:bg-white/[0.08]">
                <Globe className="w-3.5 h-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {environments.map(env => (
                  <SelectItem key={env.name} value={env.name}>{env.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="hidden sm:inline text-muted-foreground/20 text-xs select-none">·</span>

            <Select value={permissionMode} onValueChange={(v) => setPermissionMode(v as PermissionModeName)}>
              <SelectTrigger variant="badge" badgeColor="var(--chart-4)" className="hover:bg-white/[0.08]">
                <Shield className="w-3.5 h-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(PERMISSION_PRESETS).map((mode) => (
                  <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* New Session — 3D launch button */}
            <LaunchButton
              onClick={handleLaunchClick}
              launched={launched}
              size="md"
              icon={<Plus className="w-4 h-4" />}
            >
              {t('sessions.newSession')}
            </LaunchButton>

            {/* Multi-Launch — opens popover */}
            <SessionLauncherPopover
              open={launcherOpen}
              onOpenChange={setLauncherOpen}
              onLaunchMulti={handleMultiLaunch}
              onBrowseAndLaunch={handleBrowseAndLaunch}
              isLaunching={isMultiLaunching}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="glass-btn-outline"
                >
                  <LayoutGrid className="w-4 h-4" />
                  {t('sessions.multiLaunch')}
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* Arrange Banner — shown when running >= 2 */}
      {externalRunningCount >= 2 && (
        <div>
          <ArrangeBanner
            runningCount={externalRunningCount}
            onArrange={handleArrange}
            isArranging={isArranging}
            arrangeStatus={arrangeStatus}
            selectedLayout={selectedLayout}
            onSelectLayout={(layout) => setArrangeLayout(layout)}
            onMinimizeAll={handleMinimizeAll}
            onCloseAll={() => setShowCloseAllDialog(true)}
          />
        </div>
      )}

      {/* Sessions Display */}
      <div className="space-y-4">
        <RecoveryCandidatesPanel />
        {totalDisplayCount === 0 ? (
          <Card className="p-4">
            <div className="py-8">
              <EmptyState
                icon={Terminal}
                message={t('sessions.noActiveSessions')}
                action={t('sessions.launchClaudeCode')}
                onAction={onLaunch}
              />
              <p className="text-xs text-muted-foreground text-center -mt-8">
                {t('sessions.detectionNote')}
              </p>
            </div>
          </Card>
        ) : (
          <>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                {t('sessions.activeSessions')} ({totalDisplayCount})
              </h3>

              {effectiveViewMode === 'card' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredSessions.map((item) => (
                    <SessionCard
                      key={item.session.id}
                      session={item.session}
                      unifiedSession={item.unifiedSession}
                      terminalOptions={tmuxAttachTerminals}
                      onFocus={handleFocus}
                      onOpenInTerminal={handleOpenInTerminal}
                      onMinimize={handleMinimize}
                      onClose={handleRequestClose}
                      onStop={handleStopUnified}
                      onRemove={handleRemoveHeadless}
                      onDisconnectChannel={handleDisconnectChannel}
                      confirmingClose={confirmingId === item.session.id}
                      onCancelClose={handleCancelClose}
                      onConfirmClose={handleConfirmClose}
                    />
                  ))}
                </div>
              ) : (
                <SessionList
                  sessions={filteredSessions.map(item => item.session)}
                  terminalOptions={tmuxAttachTerminals}
                  onFocus={handleFocus}
                  onOpenInTerminal={handleOpenInTerminal}
                  onMinimize={handleMinimize}
                  onClose={handleRequestClose}
                  confirmingId={confirmingId}
                  onCancelClose={handleCancelClose}
                  onConfirmClose={handleConfirmClose}
                />
              )}

              {/* Card footer: Minimize All / Close All */}
              {(() => {
                // ArrangeBanner already provides Close All when externalRunningCount >= 2
                const arrangeBannerVisible = externalRunningCount >= 2;
                // Show footer when there are sessions but ArrangeBanner is not handling it
                const hasAnySessions = mergedSessions.length > 0;
                if (arrangeBannerVisible || !hasAnySessions) return null;

                return (
                  <div className="mt-4 pt-3 flex items-center gap-2 glass-divider-top">
                    {externalRunningCount > 0 && (
                      <Button size="sm" variant="ghost" onClick={handleMinimizeAll} className="glass-ghost-hover">
                        <Minimize2 className="mr-1 h-3.5 w-3.5" />
                        {t('sessions.minimizeAll')}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setShowCloseAllDialog(true)} className="glass-ghost-hover">
                      <X className="mr-1 h-3.5 w-3.5" />
                      {t('sessions.closeAll')}
                    </Button>
                  </div>
                );
              })()}
            </Card>
          </>
        )}
        {/* HeadlessSessionsPanel removed - unified view */}
      </div>

      {/* Close All Dialog */}
      {showCloseAllDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={() => setShowCloseAllDialog(false)}
          />
          <div className="relative frosted-panel glass-noise rounded-xl p-6 max-w-md w-full mx-4 shadow-dialog">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('sessions.closeAllTitle')}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {t('sessions.closeAllDescription').replace('{count}', String(mergedSessions.length))}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowCloseAllDialog(false)} className="glass-ghost-hover">
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCloseAll} className="glass-btn-destructive">
                {t('sessions.closeAll')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
