import { Clock, FolderOpen, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '../../locales';
import type { Session } from '@/store';

interface SessionListProps {
  sessions: Session[];
  onFocus: (id: string) => void;
  onMinimize: (id: string) => void;
  onClose: (id: string) => void;
  confirmingId?: string | null;
  onCancelClose?: () => void;
  onConfirmClose?: (id: string) => void;
}

export function SessionList({ sessions, onFocus, onMinimize, onClose, confirmingId, onCancelClose, onConfirmClose }: SessionListProps) {
  const { t } = useLocale();

  const getStatusDot = (status: Session['status']) => {
    const base = 'w-2.5 h-2.5 rounded-full inline-block';
    switch (status) {
      case 'running':
        return `${base} bg-success status-running`;
      case 'stopped':
        return `${base} bg-muted-foreground/40`;
      case 'idle':
        return `${base} bg-warning`;
      case 'interrupted':
        return `${base} bg-warning`;
      case 'error':
        return `${base} bg-destructive status-error`;
      default:
        return `${base} bg-muted-foreground/40`;
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
    <div className="space-y-2">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
        >
          <span className={getStatusDot(session.status)} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-foreground">
                {getProjectName(session.workingDir)}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {session.envName}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {session.permMode}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(session.startedAt)}
              </span>
              <span className="flex items-center gap-1 truncate">
                <FolderOpen className="w-3 h-3 flex-shrink-0" />
                <span className="truncate" title={`${session.workingDir}${session.pid ? ` · PID: ${session.pid}` : ''}`}>
                  {session.workingDir}
                </span>
              </span>
            </div>
          </div>

          {confirmingId === session.id ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-destructive">{t('sessions.confirmTerminate')}</span>
              <Button variant="ghost" size="sm" onClick={onCancelClose}>{t('common.cancel')}</Button>
              <Button variant="destructive" size="sm" onClick={() => onConfirmClose?.(session.id)}>{t('sessions.terminate')}</Button>
            </div>
          ) : (
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onFocus(session.id)}
                disabled={session.status !== 'running'}
              >
                Focus
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMinimize(session.id)}
                disabled={session.status !== 'running'}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onClose(session.id)}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
