import { useState } from 'react';
import { LayoutGrid, List, Minimize2, Plus, Terminal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SessionCard, SessionList } from '@/components/sessions';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useLocale } from '../locales';
import { SessionsSkeleton } from '@/components/ui/skeleton-states';

interface SessionsProps {
  onLaunch: () => void;
}

export function Sessions({ onLaunch }: SessionsProps) {
  const { t } = useLocale();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showCloseAllDialog, setShowCloseAllDialog] = useState(false);
  const { sessions, isLoadingSessions } = useAppStore();
  const { focusSession, minimizeSession, closeSession } = useTauriCommands();

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
    for (const session of sessions.filter(s => s.status === 'running')) {
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
            <Button size="sm" variant="outline" disabled>
              <LayoutGrid className="w-4 h-4 mr-1" />
              {t('sessions.quadSplit')}
            </Button>
            <Button size="sm" variant="outline" onClick={handleMinimizeAll}>
              <Minimize2 className="w-4 h-4 mr-1" />
              {t('sessions.minimizeAll')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCloseAllDialog(true)}>
              <X className="w-4 h-4 mr-1" />
              {t('sessions.closeAll')}
            </Button>
            <span className="text-xs text-muted-foreground ml-2">
              {t('sessions.quadSplitFuture')}
            </span>
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
