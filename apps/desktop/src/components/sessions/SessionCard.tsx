// apps/desktop/src/components/sessions/SessionCard.tsx
import { useEffect, useRef, useState } from 'react';
import { Check, Clock, Copy, FolderOpen, Link2, Minus, Monitor, Send, SquareArrowOutUpRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BindToTelegramDialog } from '@/components/telegram/BindToTelegramDialog';
import { copyBindCommand } from '@/lib/telegram-utils';
import { useLocale } from '../../locales';
import type { Session, UnifiedSession, ChannelInfo } from '@/store';

interface SessionCardProps {
  session: Session;
  unifiedSession?: UnifiedSession;
  onFocus: (id: string) => void;
  onOpenInTerminal: (id: string) => void;
  onMinimize: (id: string) => void;
  onClose: (id: string) => void;
  onStop?: (id: string) => void;
  onRemove?: (id: string) => void;
  onDisconnectChannel?: (sessionId: string, channelKind: string) => void;
  confirmingClose?: boolean;
  onCancelClose?: () => void;
  onConfirmClose?: (id: string) => void;
}

export function SessionCard({
  session,
  unifiedSession,
  onFocus,
  onOpenInTerminal,
  onMinimize,
  onClose,
  onStop,
  onRemove,
  onDisconnectChannel,
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

  // --- Status dot logic ---
  const getUnifiedStatusDot = (status: string) => {
    switch (status) {
      case 'ready':
      case 'processing':
        return <span className="inline-block w-2 h-2 rounded-full bg-success status-running status-glow-success" />;
      case 'waiting_permission':
        return <span className="inline-block w-2 h-2 rounded-full bg-warning status-glow-warning" />;
      case 'completed':
      case 'stopped':
        return <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40" />;
      case 'error':
        return <span className="inline-block w-2 h-2 rounded-full bg-destructive status-error status-glow-destructive" />;
      case 'initializing':
        return <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />;
      default:
        return <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40" />;
    }
  };

  const getLegacyStatusDot = (status: Session['status']) => {
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

  const statusDot = unifiedSession
    ? getUnifiedStatusDot(unifiedSession.status)
    : getLegacyStatusDot(session.status);

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

  // --- Derive display values ---
  const projectDir = unifiedSession?.projectDir ?? session.workingDir;
  const envName = unifiedSession?.envName ?? session.envName;
  const permMode = unifiedSession?.permMode ?? session.permMode;
  const clientLabel = unifiedSession
    ? (unifiedSession.client?.toLowerCase() === 'codex' ? 'Codex' : 'Claude')
    : (session.client === 'codex' ? 'Codex' : 'Claude');
  const startedAt = unifiedSession
    ? new Date(unifiedSession.createdAt)
    : session.startedAt;
  const pid = unifiedSession?.pid ?? session.pid;
  const sessionId = unifiedSession?.id ?? session.id;
  const isHeadless = unifiedSession?.runtimeKind === 'headless';
  const isRunning = unifiedSession
    ? ['ready', 'processing', 'waiting_permission', 'initializing'].includes(unifiedSession.status)
    : session.status === 'running';

  // --- Source badge ---
  const getSourceLabel = (source: UnifiedSession['source']): string => {
    const key = `sessions.source_${source}` as const;
    return t(key);
  };

  // --- Channel indicator ---
  const renderChannels = (channels: ChannelInfo[]) => {
    if (!channels || channels.length === 0) return null;

    return (
      <div className="flex items-center gap-1.5 mt-1.5">
        {channels.map((ch, i) => {
          const isDesktop = ch.kind === 'desktop_ui';
          const Icon = isDesktop ? Monitor : Send;
          const label = isDesktop
            ? t('sessions.channel_desktop')
            : t('sessions.channel_telegram');
          const canDisconnect = !isDesktop && onDisconnectChannel;

          return (
            <button
              type="button"
              key={`${ch.kind}-${i}`}
              className={`inline-flex items-center gap-1 text-[10px] glass-subtle rounded-md px-1.5 py-0.5 text-primary ${
                canDisconnect ? 'cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors' : 'cursor-default'
              }`}
              onClick={canDisconnect ? () => onDisconnectChannel!(sessionId, ch.kind) : undefined}
              title={canDisconnect ? t('sessions.disconnectChannel') : undefined}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  const handleCopyBind = async () => {
    try {
      await copyBindCommand(projectDir, envName, permMode);
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

  // --- Action buttons ---
  const renderActions = () => {
    if (confirmingClose) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-destructive font-medium">{t('sessions.confirmTerminate')}</span>
          <Button variant="ghost" size="sm" onClick={onCancelClose} className="glass-ghost-hover">{t('common.cancel')}</Button>
          <Button size="sm" onClick={() => onConfirmClose?.(sessionId)} className="glass-btn-destructive">{t('sessions.terminate')}</Button>
        </div>
      );
    }

    // Headless unified sessions: Stop + CopyBind + BindToTelegram + Remove
    if (isHeadless && unifiedSession) {
      return (
        <div className="flex gap-2">
          {isRunning && onStop && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStop(sessionId)}
              className="flex-1 glass-btn-outline"
            >
              {t('sessions.stop')}
            </Button>
          )}
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
          {onRemove && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(sessionId)}
              className="glass-btn-close"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      );
    }

    // Interactive sessions (both legacy and unified)
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onFocus(sessionId)}
          disabled={!isRunning}
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
            onClick={() => onOpenInTerminal(sessionId)}
            disabled={!isRunning}
            className="glass-btn-outline"
          >
            <SquareArrowOutUpRight className="w-4 h-4" />
            <span className="sr-only">{t('sessions.openInTerminal')}</span>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onMinimize(sessionId)}
            disabled={!isRunning}
            className="glass-btn-outline"
          >
            <Minus className="w-4 h-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onClose(sessionId)}
          className="glass-btn-close"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <>
      <Card className="p-4 interactive-card card-stagger">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {statusDot}
              <h3 className="font-semibold text-foreground">
                {getProjectName(projectDir)}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <span className="glass-subtle rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wide font-medium">
                {clientLabel}
              </span>
              {isEmbedded && !unifiedSession && (
                <span className="glass-subtle rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wide font-medium">
                  embedded
                </span>
              )}
              <span className="glass-subtle rounded-md px-2 py-0.5 text-xs font-medium">
                {envName}
              </span>
              {(unifiedSession || session.client === 'claude') && (
                <span className="glass-subtle rounded-md px-2 py-0.5 text-xs font-medium">
                  {permMode}
                </span>
              )}
              {unifiedSession && (
                <span className="glass-subtle rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wide font-medium">
                  {getSourceLabel(unifiedSession.source)}
                </span>
              )}
            </div>
            {unifiedSession && renderChannels(unifiedSession.channels)}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground/80 mb-3">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDuration(startedAt)}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground/80 mb-4 truncate">
          <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate" title={`${projectDir}${pid ? ` · PID: ${pid}` : ''}`}>
            {projectDir}
          </span>
        </div>

        {renderActions()}
      </Card>

      <BindToTelegramDialog
        open={bindDialogOpen}
        onOpenChange={setBindDialogOpen}
        initialProjectDir={projectDir}
        initialEnvName={envName}
        initialPermMode={permMode}
      />
    </>
  );
}
