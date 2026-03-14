import { Clock, FolderOpen, Minus, SquareArrowOutUpRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '../../locales';
import type { Session } from '@/store';

interface SessionListProps {
  sessions: Session[];
  onFocus: (id: string) => void;
  onOpenInTerminal: (id: string) => void;
  onMinimize: (id: string) => void;
  onClose: (id: string) => void;
  confirmingId?: string | null;
  onCancelClose?: () => void;
  onConfirmClose?: (id: string) => void;
}

export function SessionList({
  sessions,
  onFocus,
  onOpenInTerminal,
  onMinimize,
  onClose,
  confirmingId,
  onCancelClose,
  onConfirmClose,
}: SessionListProps) {
  const { t } = useLocale();

  const getStatusDot = (status: Session['status']) => {
    switch (status) {
      case 'running':
        return { className: 'w-2.5 h-2.5 rounded-full inline-block bg-success status-running status-glow-success' };
      case 'error':
        return { className: 'w-2.5 h-2.5 rounded-full inline-block bg-destructive status-error status-glow-destructive' };
      case 'interrupted':
        return { className: 'w-2.5 h-2.5 rounded-full inline-block bg-warning status-glow-warning' };
      case 'idle':
        return { className: 'w-2.5 h-2.5 rounded-full inline-block bg-warning status-glow-warning' };
      case 'stopped':
      default:
        return { className: 'w-2.5 h-2.5 rounded-full inline-block bg-muted-foreground/40' };
    }
  };

  const formatDuration = (startedAt: Date) => {
    const now = new Date();
    const diff = now.getTime() - startedAt.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const getProjectName = (path: string) => {
    return path.split('/').pop() || path;
  };

  return (
    <div className="space-y-1.5">
      {sessions.map((session) => {
        const dot = getStatusDot(session.status);
        const isEmbedded = session.terminalType === 'embedded';
        return (
          <div
            key={session.id}
            className="flex items-center gap-4 p-3 rounded-lg glass-subtle glass-ghost-hover transition-all duration-150"
          >
            <span className={dot.className} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-foreground">
                  {getProjectName(session.workingDir)}
                </span>
                <span className="text-xs px-1.5 py-0.5 glass-subtle rounded-md font-medium">
                  {session.envName}
                </span>
                {isEmbedded && (
                  <span className="text-xs px-1.5 py-0.5 glass-subtle rounded-md font-medium uppercase tracking-wide">
                    embedded
                  </span>
                )}
                <span className="text-xs px-1.5 py-0.5 glass-subtle rounded-md font-medium">
                  {session.permMode}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground/80">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(session.startedAt)}
                </span>
                <span className="flex items-center gap-1 truncate">
                  <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate" title={`${session.workingDir}${session.pid ? ` · PID: ${session.pid}` : ''}`}>
                    {session.workingDir}
                  </span>
                </span>
              </div>
            </div>

            {confirmingId === session.id ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-destructive font-medium">{t('sessions.confirmTerminate')}</span>
                <Button variant="ghost" size="sm" onClick={onCancelClose} className="glass-ghost-hover">{t('common.cancel')}</Button>
                <Button size="sm" onClick={() => onConfirmClose?.(session.id)} className="glass-btn-destructive">{t('sessions.terminate')}</Button>
              </div>
            ) : (
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onFocus(session.id)}
                  disabled={session.status !== 'running'}
                  className="glass-btn-outline"
                >
                  {t('sessions.focus')}
                </Button>
                {isEmbedded ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onOpenInTerminal(session.id)}
                    disabled={session.status !== 'running'}
                    className="glass-btn-outline"
                  >
                    <SquareArrowOutUpRight className="mr-1 h-4 w-4" />
                    {t('sessions.openInTerminal')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onMinimize(session.id)}
                    disabled={session.status !== 'running'}
                    className="glass-btn-outline"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onClose(session.id)}
                  className="glass-btn-close"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
