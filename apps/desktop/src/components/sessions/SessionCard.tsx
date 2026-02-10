// apps/desktop/src/components/sessions/SessionCard.tsx
import { Clock, FolderOpen, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLocale } from '../../locales';
import type { Session } from '@/store';

interface SessionCardProps {
  session: Session;
  onFocus: (id: string) => void;
  onMinimize: (id: string) => void;
  onClose: (id: string) => void;
  confirmingClose?: boolean;
  onCancelClose?: () => void;
  onConfirmClose?: (id: string) => void;
}

export function SessionCard({ session, onFocus, onMinimize, onClose, confirmingClose, onCancelClose, onConfirmClose }: SessionCardProps) {
  const { t } = useLocale();

  const getStatusDot = (status: Session['status']) => {
    switch (status) {
      case 'running':
        return <span className="inline-block w-2 h-2 rounded-full bg-success status-running status-glow-success" />;
      case 'error':
        return <span className="inline-block w-2 h-2 rounded-full bg-destructive status-error status-glow-destructive" />;
      case 'interrupted':
        return <span className="inline-block w-2 h-2 rounded-full bg-destructive status-error status-glow-destructive" />;
      case 'idle':
      case 'stopped':
      default:
        return <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40" />;
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
    <Card className="p-4 interactive-card card-stagger">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getStatusDot(session.status)}
            <h3 className="font-semibold text-foreground">
              {getProjectName(session.workingDir)}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="glass-subtle rounded-md px-2 py-0.5 text-xs font-medium">
              {session.envName}
            </span>
            <span className="glass-subtle rounded-md px-2 py-0.5 text-xs font-medium">
              {session.permMode}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground/80 mb-3">
        <Clock className="w-3.5 h-3.5" />
        <span>{formatDuration(session.startedAt)}</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground/80 mb-4 truncate">
        <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate" title={`${session.workingDir}${session.pid ? ` · PID: ${session.pid}` : ''}`}>
          {session.workingDir}
        </span>
      </div>

      {confirmingClose ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-destructive font-medium">{t('sessions.confirmTerminate')}</span>
          <Button variant="ghost" size="sm" onClick={onCancelClose} className="glass-ghost-hover">{t('common.cancel')}</Button>
          <Button size="sm" onClick={() => onConfirmClose?.(session.id)} className="glass-btn-destructive">{t('sessions.terminate')}</Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onFocus(session.id)}
            disabled={session.status !== 'running'}
            className="flex-1 glass-btn-outline"
          >
            {t('sessions.focus')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onMinimize(session.id)}
            disabled={session.status !== 'running'}
            className="glass-btn-outline"
          >
            <Minus className="w-4 h-4" />
          </Button>
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
    </Card>
  );
}
