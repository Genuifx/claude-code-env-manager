import { useState, useCallback } from 'react';
import { LayoutGrid, List, Minimize2, Plus, Terminal, X, ChevronDown, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SessionCard, SessionList, ArrangeBanner } from '@/components/sessions';
import { LayoutPopover } from '@/components/sessions/LayoutPopover';
import { useAppStore, type ArrangeLayout } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useLocale } from '../locales';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { SessionsSkeleton } from '@/components/ui/skeleton-states';
import { toast } from 'sonner';

interface SessionsProps {
  onLaunch: () => void;
}

export function Sessions({ onLaunch }: SessionsProps) {
  const { t } = useLocale();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showCloseAllDialog, setShowCloseAllDialog] = useState(false);
  const [isArranging, setIsArranging] = useState(false);
  const [arrangeStatus, setArrangeStatus] = useState<'normal' | 'loading' | 'success'>('normal');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { sessions, isLoadingSessions, arrangeLayout, setArrangeLayout } = useAppStore();
  const { focusSession, minimizeSession, closeSession, arrangeSessions } = useTauriCommands();

  const runningSessions = sessions.filter(s => s.status === 'running');
  const runningCount = runningSessions.length;

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

  // Register Cmd+Shift+L shortcut for arrange
  useKeyboardShortcuts({
    'meta+shift+l': () => {
      if (runningCount >= 2) handleArrange();
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
    <div className="page-transition-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-foreground">
            Sessions ({sessions.length})
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
            <Button
              size="sm"
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              onClick={() => setViewMode('card')}
              className="h-8 w-8 p-0"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0"
            >
            <List className="w-4 h-4" />
            </Button>
          </div>

          {/* New Session Button */}
          <Button onClick={onLaunch}>
            <Plus className="w-4 h-4 mr-2" />
            {t('sessions.newSession')}
          </Button>
        </div>
      </div>

      {/* Arrange Banner — shown between header and card grid when running >= 2 */}
      {runningCount >= 2 && (
        <div className="mb-4">
          <ArrangeBanner
            runningCount={runningCount}
            onArrange={handleArrange}
            isArranging={isArranging}
            arrangeStatus={arrangeStatus}
            selectedLayout={selectedLayout}
            onSelectLayout={(layout) => setArrangeLayout(layout)}
          />
        </div>
      )}

      {/* Sessions Display */}
      {sessions.length === 0 ? (
        <>
          <EmptyState
            icon={Terminal}
            message={t('sessions.noActiveSessions')}
            action={t('sessions.launchClaudeCode')}
            onAction={onLaunch}
          />
          <p className="text-xs text-muted-foreground text-center -mt-8">
            {t('sessions.detectionNote')}
       </p>
        </>
      ) : viewMode === 'card' ? (
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

      {/* Layout Controls */}
      {sessions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('sessions.layoutControl')}
            </span>

            {/* Split Button: Arrange Windows */}
            <div className="flex items-center">
              <Button
                size="sm"
                variant="outline"
                disabled={runningCount < 2 || isArranging}
                onClick={() => handleArrange()}
                className="rounded-r-none"
              >
                {arrangeStatus === 'loading' && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {arrangeStatus === 'success' && <Check className="w-4 h-4 mr-1" />}
                {arrangeStatus === 'normal' && <LayoutGrid className="w-4 h-4 mr-1" />}
                {arrangeStatus === 'loading'
                  ? t('sessions.arranging')
                  : arrangeStatus === 'success'
                    ? t('sessions.arranged')
                    : t('sessions.arrangeWindows')
                }
              </Button>
              <LayoutPopover
                open={popoverOpen}
                onOpenChange={setPopoverOpen}
                runningCount={runningCount}
                selectedLayout={selectedLayout}
                onSelectLayout={(layout) => setArrangeLayout(layout)}
                onArrange={handleArrange}
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={runningCount < 2 || isArranging}
                    className="rounded-l-none border-l-0 px-1.5"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                }
              />
            </div>

            <Button size="sm" variant="outline" onClick={handleMinimizeAll}>
              <Minimize2 className="w-4 h-4 mr-1" />
              {t('sessions.minimizeAll')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCloseAllDialog(true)}>
              <X className="w-4 h-4 mr-1" />
              {t('sessions.closeAll')}
            </Button>
          </div>
        </div>
      )}

      {/* Close All Dialog */}
      {showCloseAllDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCloseAllDialog(false)}
          />
          <div className="relative bg-card border border-border rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('sessions.closeAllTitle')}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {t('sessions.closeAllDescription').replace('{count}', String(sessions.length))}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowCloseAllDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleCloseAll}>
                {t('sessions.closeAll')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
