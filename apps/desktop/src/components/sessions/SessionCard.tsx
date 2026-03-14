// apps/desktop/src/components/sessions/SessionCard.tsx
import { useEffect, useRef, useState } from 'react';
import { Check, Clock, Copy, FolderOpen, Link2, Minus, SquareArrowOutUpRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BindToTelegramDialog } from '@/components/telegram/BindToTelegramDialog';
import { copyBindCommand } from '@/lib/telegram-utils';
import { useLocale } from '../../locales';
import type { Session } from '@/store';

interface SessionCardProps {
  session: Session;
  onFocus: (id: string) => void;
  onOpenInTerminal: (id: string) => void;
  onMinimize: (id: string) => void;
  onClose: (id: string) => void;
  confirmingClose?: boolean;
  onCancelClose?: () => void;
  onConfirmClose?: (id: string) => void;
}

export function SessionCard({
  session,
  onFocus,
  onOpenInTerminal,
  onMinimize,
  onClose,
  confirmingClose,
  onCancelClose,
  onConfirmClose,
}: SessionCardProps) {
  const { t } = useLocale();
  const isEmbedded = session.terminalType === 'embedded';
  const [bindCopied, setBindCopied] = useState(false);
  const [bindDialogOpen, setBindDialogOpen] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

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

  const clientLabel = session.client === 'codex' ? 'Codex' : 'Claude';

  const handleCopyBind = async () => {
    try {
      await copyBindCommand(session.workingDir, session.envName, session.permMode);
      toast.success(t('telegram.bindCommandCopied'));
      setBindCopied(true);
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = setTimeout(() => {
        setBindCopied(false);
        copiedTimerRef.current = null;
      }, 1500);
    } catch (error) {
      toast.error(t('telegram.bindCommandCopyFailed').replace('{error}', String(error)));
    }
  };

  return (
    <>
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
              <span className="glass-subtle rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wide font-medium">
                {clientLabel}
              </span>
              {isEmbedded && (
                <span className="glass-subtle rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wide font-medium">
                  embedded
                </span>
              )}
              <span className="glass-subtle rounded-md px-2 py-0.5 text-xs font-medium">
                {session.envName}
              </span>
              {session.client === 'claude' && (
                <span className="glass-subtle rounded-md px-2 py-0.5 text-xs font-medium">
                  {session.permMode}
                </span>
              )}
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
              onClick={handleCopyBind}
              className="glass-btn-outline"
              title={t('telegram.copyBindCommand')}
            >
              {bindCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="sr-only">{t('telegram.copyBindCommand')}</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setBindDialogOpen(true)}
              className="glass-btn-outline"
              title={t('telegram.bindToTopic')}
            >
              <Link2 className="w-4 h-4" />
              <span className="sr-only">{t('telegram.bindToTopic')}</span>
            </Button>
            {isEmbedded ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenInTerminal(session.id)}
                disabled={session.status !== 'running'}
                className="glass-btn-outline"
              >
                <SquareArrowOutUpRight className="w-4 h-4" />
                <span className="sr-only">{t('sessions.openInTerminal')}</span>
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
      </Card>

      <BindToTelegramDialog
        open={bindDialogOpen}
        onOpenChange={setBindDialogOpen}
        initialProjectDir={session.workingDir}
        initialEnvName={session.envName}
        initialPermMode={session.permMode}
      />
    </>
  );
}
