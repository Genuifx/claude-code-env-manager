import { useState, useCallback, useRef } from 'react';
import { LayoutGrid, List, Minimize2, Plus, Terminal, X, FolderOpen, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SessionCard, SessionList, ArrangeBanner, SessionLauncherPopover } from '@/components/sessions';
import { useAppStore, type ArrangeLayout } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useLocale } from '../locales';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { SessionsSkeleton } from '@/components/ui/skeleton-states';
import { toast } from 'sonner';

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
  const launchedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const { sessions, isLoadingSessions, arrangeLayout, setArrangeLayout, selectedWorkingDir, setSelectedWorkingDir } = useAppStore();
  const { focusSession, minimizeSession, closeSession, arrangeSessions, launchClaudeCode, openDirectoryPicker } = useTauriCommands();

  const runningSessions = sessions.filter(s => s.status === 'running');
  const runningCount = runningSessions.length;

  // Truncate directory path for display (same logic as Dashboard)
  const launchDirDisplay = selectedWorkingDir
    ? selectedWorkingDir.replace(/^\/Users\/[^/]+/, '~').split('/').slice(-2).join('/')
    : '~';

  // Smart layout: pick best layout based on session count, or use remembered layout
  const getSmartLayout = useCallback((): ArrangeLayout => {
    if (arrangeLayout) return arrangeLayout;
    if (runningCount <= 2) return 'horizontal2';
    if (runningCount === 3) return 'left_main3';
    return 'grid4';
  }, [arrangeLayout, runningCount]);

  const selectedLayout = arrangeLayout || getSmartLayout();

  const handleArrange = useCallback(async (layout?: ArrangeLayout) => {
    if (runningCount < 2 || isArranging) return;

    const targetLayout = layout || getSmartLayout();
    setIsArranging(true);
    setArrangeStatus('loading');

    try {
      const sessionIds = runningSessions.map(s => s.id);
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
          .replace('{count}', String(runningCount))
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
  }, [runningCount, isArranging, getSmartLayout, runningSessions, arrangeSessions, t]);

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
        const allRunning = useAppStore.getState().sessions.filter(s => s.status === 'running');
        await arrangeSessions(allRunning.map(s => s.id), layout);
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
      if (runningCount >= 2) handleArrange();
    },
    'meta+shift+n': () => {
      setLauncherOpen(true);
    },
  });

  const handleFocus = async (id: string) => {
    try {
      await focusSession(id);
    } catch (err) {
      console.error('Failed to focus session:', err);
    }
  };

  const handleMinimize = async (id: string) => {
    try {
      await minimizeSession(id);
    } catch (err) {
      console.error('Failed to minimize session:', err);
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
      await closeSession(id);
    } catch (err) {
      console.error('Failed to close session:', err);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleMinimizeAll = async () => {
    for (const session of runningSessions) {
      await minimizeSession(session.id);
    }
  };

  const handleCloseAll = async () => {
    setShowCloseAllDialog(false);
    for (const session of sessions) {
      await closeSession(session.id);
    }
  };

  // Show skeleton when sessions are loading
  if (isLoadingSessions) {
    return <SessionsSkeleton />;
  }

  return (
    <div className="page-transition-enter space-y-6">
      {/* Hero Card */}
      <div className="stat-card glass-noise p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {t('sessions.title')}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('sessions.runningCount').replace('{count}', String(runningCount))}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg glass-subtle">
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`h-7 w-7 rounded-md flex items-center justify-center transition-all duration-150 ${
                  viewMode === 'card'
                    ? 'seg-active text-foreground'
                    : 'text-muted-foreground seg-hover hover:text-foreground'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`h-7 w-7 rounded-md flex items-center justify-center transition-all duration-150 ${
                  viewMode === 'list'
                    ? 'seg-active text-foreground'
                    : 'text-muted-foreground seg-hover hover:text-foreground'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Directory selector */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectDirectory}
              className="glass-btn-outline"
            >
              <FolderOpen className="w-4 h-4" />
              {launchDirDisplay ? (
                <span className="font-mono text-xs max-w-[140px] truncate">{launchDirDisplay}</span>
              ) : (
                <span>{t('dashboard.selectDir')}</span>
              )}
            </Button>

            {/* New Session — single click launch with success feedback */}
            <Button
              size="sm"
              onClick={handleLaunchClick}
              className={`gap-2 px-4 font-semibold rounded-lg transition-all duration-150 ${
                launched
                  ? 'bg-success hover:bg-success'
                  : 'shadow-primary-glow hover:-translate-y-0.5 active:scale-95'
              }`}
            >
              {launched ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {launched ? t('dashboard.launchBtnDone') : t('sessions.newSession')}
            </Button>

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
      {runningCount >= 2 && (
        <div>
          <ArrangeBanner
            runningCount={runningCount}
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
      {sessions.length === 0 ? (
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
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            {t('sessions.activeSessions')} ({sessions.length})
          </h3>

          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onFocus={handleFocus}
                  onMinimize={handleMinimize}
                  onClose={handleRequestClose}
                  confirmingClose={confirmingId === session.id}
                  onCancelClose={handleCancelClose}
                  onConfirmClose={handleConfirmClose}
                />
              ))}
            </div>
          ) : (
            <SessionList
              sessions={sessions}
              onFocus={handleFocus}
              onMinimize={handleMinimize}
              onClose={handleRequestClose}
              confirmingId={confirmingId}
              onCancelClose={handleCancelClose}
              onConfirmClose={handleConfirmClose}
            />
          )}

          {/* Card footer: Minimize All / Close All (when ArrangeBanner is not shown) */}
          {runningCount > 0 && runningCount < 2 && (
            <>
              <div className="mt-4 pt-3 flex items-center gap-2 glass-divider-top">
                <Button size="sm" variant="ghost" onClick={handleMinimizeAll} className="glass-ghost-hover">
                  <Minimize2 className="w-3.5 h-3.5 mr-1" />
                  {t('sessions.minimizeAll')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCloseAllDialog(true)} className="glass-ghost-hover">
                  <X className="w-3.5 h-3.5 mr-1" />
                  {t('sessions.closeAll')}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

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
              {t('sessions.closeAllDescription').replace('{count}', String(sessions.length))}
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
