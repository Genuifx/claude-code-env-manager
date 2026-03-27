// apps/desktop/src/components/sessions/SessionCard.tsx
import { Suspense, lazy, useEffect, useRef, useState, type ElementType } from 'react';
import {
  Check,
  Clock,
  Copy,
  FolderOpen,
  Link2,
  Minus,
  Monitor,
  MoreHorizontal,
  PanelLeft,
  Shield,
  SquareArrowOutUpRight,
  SquareTerminal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getRemotePlatformFromChannel, getRemotePlatformMeta } from '@/lib/remote-platforms';
import { copyBindCommand } from '@/lib/telegram-utils';
import { cn } from '@/lib/utils';
import type { TmuxAttachTerminalInfo, TmuxAttachTerminalType } from '@/lib/tauri-ipc';
import { useLocale } from '../../locales';
import type { Session, UnifiedSession, ChannelInfo } from '@/store';
import { OpenInTerminalPopoverButton } from './OpenInTerminalPopoverButton';
import { ModelIcon } from '../history/ModelIcon';

const LazyBindToChatDialog = lazy(async () =>
  import('@/components/chat/BindToChatDialog').then((module) => ({
    default: module.BindToChatDialog,
  }))
);

interface SessionCardProps {
  session: Session;
  unifiedSession?: UnifiedSession;
  terminalOptions?: TmuxAttachTerminalInfo[];
  selectedEmbedded?: boolean;
  onSelectEmbedded?: (id: string) => void;
  onMenuIntent?: () => void;
  onFocus: (id: string) => void;
  onOpenInTerminal: (id: string, terminalType?: TmuxAttachTerminalType) => void;
  onMinimize: (id: string) => void;
  onClose: (id: string) => void;
  onStop?: (id: string) => void;
  onRemove?: (id: string) => void;
  onDisconnectChannel?: (sessionId: string, channelKind: string) => void;
  confirmingClose?: boolean;
  onCancelClose?: () => void;
  onConfirmClose?: (id: string) => void;
}

function SessionActionIconButton({
  icon: Icon,
  onClick,
  tooltip,
  disabled,
  variant = 'ghost',
  className,
}: {
  icon: ElementType;
  onClick?: () => void;
  tooltip: string;
  disabled?: boolean;
  variant?: 'ghost' | 'destructive';
  className?: string;
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'h-9 w-9 p-0 rounded-lg',
            'hover:bg-surface-raised',
            variant === 'destructive' && 'text-destructive/70 hover:text-destructive hover:bg-destructive/10',
            className
          )}
        >
          <Icon className="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function SessionMoreActionsDropdown({
  bindCopied,
  copiedLabel,
  copyLabel,
  bindLabel,
  onCopyBind,
  onOpenBindDialog,
}: {
  bindCopied: boolean;
  copiedLabel: string;
  copyLabel: string;
  bindLabel: string;
  onCopyBind: () => void;
  onOpenBindDialog: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-9 w-9 p-0 rounded-lg hover:bg-surface-raised"
        >
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onCopyBind}>
          {bindCopied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-success" />
              {copiedLabel}
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              {copyLabel}
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenBindDialog}>
          <Link2 className="w-4 h-4 mr-2" />
          {bindLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SessionCard({
  session,
  unifiedSession,
  terminalOptions,
  selectedEmbedded,
  onSelectEmbedded,
  onMenuIntent,
  onFocus: _onFocus,
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

  // --- Status dot with better animation ---
  const getStatusIndicator = (status: string) => {
    const baseClasses = "relative flex items-center justify-center";

    switch (status) {
      case 'running':
      case 'ready':
      case 'processing':
        return (
          <span className={baseClasses}>
            <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-success/60 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success status-glow-success" />
          </span>
        );
      case 'waiting_permission':
        return (
          <span className={baseClasses}>
            <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-warning/60 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-warning status-glow-warning" />
          </span>
        );
      case 'error':
        return <span className="inline-flex h-2 w-2 rounded-full bg-destructive status-error status-glow-destructive" />;
      case 'initializing':
        return <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />;
      default:
        return <span className="inline-flex h-2 w-2 rounded-full bg-muted-foreground/30" />;
    }
  };

  const statusIndicator = unifiedSession
    ? getStatusIndicator(unifiedSession.status)
    : getStatusIndicator(session.status);

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
  const startedAt = unifiedSession ? new Date(unifiedSession.createdAt) : session.startedAt;
  const pid = unifiedSession?.pid ?? session.pid;
  const sessionId = unifiedSession?.id ?? session.id;
  const isHeadless = unifiedSession?.runtimeKind === 'headless';
  const isRunning = unifiedSession
    ? ['running', 'ready', 'processing', 'waiting_permission', 'initializing'].includes(
        unifiedSession.status
      )
    : session.status === 'running';
  const cardIsSelectable = isEmbedded && !isHeadless && Boolean(onSelectEmbedded);

  // --- Handle copy bind command ---
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

  // --- Render channel badges (subtle, combined) ---
  const renderChannelBadges = (channels: ChannelInfo[]) => {
    if (!channels || channels.length === 0) return null;

    return (
      <div className="flex items-center gap-1">
        {channels.map((ch, i) => {
          const isDesktop = ch.kind === 'desktop_ui';
          const remotePlatform = getRemotePlatformFromChannel(ch.rawKind ?? ch.kind);
          const remoteMeta = remotePlatform ? getRemotePlatformMeta(remotePlatform) : null;
          const Icon = isDesktop ? Monitor : remoteMeta?.icon ?? Monitor;
          const label = isDesktop
            ? t('sessions.channel_desktop')
            : remoteMeta
              ? t(remoteMeta.channelLabelKey)
              : ch.label || ch.kind;
          const canDisconnect = !isDesktop && onDisconnectChannel;

          return (
            <Tooltip key={`${ch.kind}-${i}`} delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={canDisconnect ? () => onDisconnectChannel!(sessionId, ch.kind) : undefined}
                  className={cn(
                    'inline-flex items-center justify-center',
                    'w-6 h-6 rounded-md',
                    'text-[10px] text-muted-foreground/60',
                    'hover:text-foreground/80 hover:bg-surface-raised',
                    'transition-colors duration-200',
                    canDisconnect && 'hover:bg-destructive/10 hover:text-destructive cursor-pointer'
                  )}
                >
                  <Icon className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                {canDisconnect ? `${label} - ${t('sessions.disconnectChannel')}` : label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  };

  // --- Render action buttons based on session type ---
  const renderActions = () => {
    // Confirm close state
    if (confirmingClose) {
      return (
        <div className="flex items-center justify-between w-full py-1">
          <span className="text-sm text-destructive font-medium">{t('sessions.confirmTerminate')}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onCancelClose} className="h-9 rounded-lg">
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={() => onConfirmClose?.(sessionId)} className="h-9 rounded-lg glass-btn-destructive">
              {t('sessions.terminate')}
            </Button>
          </div>
        </div>
      );
    }

    // Headless unified sessions
    if (isHeadless && unifiedSession) {
      return (
        <div className="flex items-center justify-between w-full py-1" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center gap-1">
            {isRunning && onStop && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onStop(sessionId)}
                disabled={!isRunning}
                className="h-9 px-3 rounded-lg text-warning hover:text-warning hover:bg-warning/10"
              >
                <SquareArrowOutUpRight className="w-4 h-4 mr-1.5" />
                {t('sessions.stop')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <SessionMoreActionsDropdown
              bindCopied={bindCopied}
              copiedLabel={t('telegram.bindCopiedShort')}
              copyLabel={t('telegram.copyBindShort')}
              bindLabel={t('chat.bindToChannel')}
              onCopyBind={handleCopyBind}
              onOpenBindDialog={() => setBindDialogOpen(true)}
            />
            {onRemove && (
              <SessionActionIconButton
                icon={X}
                onClick={() => onRemove(sessionId)}
                tooltip={t('sessions.headlessRemove')}
                variant="destructive"
              />
            )}
          </div>
        </div>
      );
    }

    // Embedded sessions
    if (isEmbedded) {
      return (
        <div className="flex items-center justify-between w-full py-1" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center gap-1">
          <OpenInTerminalPopoverButton
            sessionId={sessionId}
            terminals={terminalOptions}
            disabled={!isRunning}
            className="h-9 px-3 rounded-lg glass-btn-outline"
            onMenuIntent={onMenuIntent}
            onOpenInTerminal={onOpenInTerminal}
          />
          </div>
          <div className="flex items-center gap-0.5">
            <SessionMoreActionsDropdown
              bindCopied={bindCopied}
              copiedLabel={t('telegram.bindCopiedShort')}
              copyLabel={t('telegram.copyBindShort')}
              bindLabel={t('chat.bindToChannel')}
              onCopyBind={handleCopyBind}
              onOpenBindDialog={() => setBindDialogOpen(true)}
            />
            <SessionActionIconButton icon={X} onClick={() => onClose(sessionId)} tooltip={t('dashboard.close')} variant="destructive" />
          </div>
        </div>
      );
    }

    // Interactive sessions (both legacy and unified)
    return (
      <div className="flex items-center justify-between w-full py-1" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-1">
          <OpenInTerminalPopoverButton
            sessionId={sessionId}
            terminals={terminalOptions}
            disabled={!isRunning}
            className="h-9 px-3 rounded-lg glass-btn-outline"
            label={t('sessions.focus')}
            onMenuIntent={onMenuIntent}
            onOpenInTerminal={onOpenInTerminal}
          />
        </div>
        <div className="flex items-center gap-0.5">
          <SessionMoreActionsDropdown
            bindCopied={bindCopied}
            copiedLabel={t('telegram.bindCopiedShort')}
            copyLabel={t('telegram.copyBindShort')}
            bindLabel={t('chat.bindToChannel')}
            onCopyBind={handleCopyBind}
            onOpenBindDialog={() => setBindDialogOpen(true)}
          />
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMinimize(sessionId)}
                disabled={!isRunning}
                className="h-9 w-9 p-0 rounded-lg hover:bg-surface-raised"
              >
                <Minus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              {t('sessions.minimizeAll')}
            </TooltipContent>
          </Tooltip>
          <SessionActionIconButton icon={X} onClick={() => onClose(sessionId)} tooltip={t('dashboard.close')} variant="destructive" />
        </div>
      </div>
    );
  };

  // --- Get source/terminal icon ---
  const getSourceIcon = () => {
    if (!unifiedSession) return isEmbedded ? PanelLeft : Monitor;
    const remoteMeta = (unifiedSession.source === 'telegram' || unifiedSession.source === 'weixin')
      ? getRemotePlatformMeta(unifiedSession.source)
      : null;
    if (remoteMeta) {
      return remoteMeta.icon;
    }
    switch (unifiedSession.source) {
      case 'desktop':
        return Monitor;
      case 'cron':
        return Clock;
      case 'cli':
        return SquareTerminal;
      default:
        return Monitor;
    }
  };

  const SourceIcon = getSourceIcon();
  const sourceLabel = (() => {
    if (!unifiedSession) {
      return isEmbedded ? 'Embedded' : 'Desktop';
    }
    if (unifiedSession.source === 'telegram' || unifiedSession.source === 'weixin') {
      return t(getRemotePlatformMeta(unifiedSession.source).sourceLabelKey);
    }
    return t(`sessions.source_${unifiedSession.source}`);
  })();

  // --- Check if source is already shown in channels ---
  const hasDesktopChannel = unifiedSession?.channels?.some(ch => ch.kind === 'desktop_ui');
  const shouldShowSource = !hasDesktopChannel || unifiedSession?.source !== 'desktop';

  return (
    <TooltipProvider delayDuration={200}>
      <>
        <div
          className={cn(
            'group relative glass-card glass-noise rounded-xl overflow-hidden',
            cardIsSelectable && 'cursor-pointer',
            selectedEmbedded && 'ring-2 ring-primary/30 border-primary/30'
          )}
        >
          {/* Main content area */}
          <div
            className={cn(
              'px-4 pt-4 pb-3',
              cardIsSelectable && 'hover:bg-surface-raised/30 transition-colors'
            )}
            onClick={cardIsSelectable ? () => onSelectEmbedded?.(sessionId) : undefined}
          >
            {/* Header row: Status + Project name + Source icons */}
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {statusIndicator}
                <h3 className="font-semibold text-foreground truncate text-[15px]">
                  {getProjectName(projectDir)}
                </h3>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                {shouldShowSource && (
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <div className="inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground/50 hover:text-foreground/70 hover:bg-surface-raised transition-colors cursor-default">
                        <SourceIcon className="w-3.5 h-3.5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={4}>
                      {sourceLabel}
                    </TooltipContent>
                  </Tooltip>
                )}
                {unifiedSession && renderChannelBadges(unifiedSession.channels)}
              </div>
            </div>

            {/* Metadata row */}
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground/80">
              <ModelIcon model={envName} size={12} />
              <span className="font-medium text-foreground/70">{envName}</span>

              {permMode && (
                <>
                  <span className="text-muted-foreground/25">·</span>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 cursor-default">
                        <Shield className="w-3 h-3 text-muted-foreground/50" />
                        <span>{permMode}</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={4}>
                      {t('environments.permissionMode')}: {permMode}
                    </TooltipContent>
                  </Tooltip>
                </>
              )}

              <span className="text-muted-foreground/25">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(startedAt)}
              </span>
            </div>

            {/* Path */}
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground/50">
              <FolderOpen className="w-3 h-3 flex-shrink-0" />
              <span className="truncate font-mono" title={`${projectDir}${pid ? ` · PID: ${pid}` : ''}`}>
                {projectDir}
              </span>
            </div>
          </div>

          {/* Actions footer */}
          <div className="px-4 py-2.5 border-t border-white/[0.06]">
            {renderActions()}
          </div>
        </div>

        {bindDialogOpen ? (
          <Suspense fallback={null}>
            <LazyBindToChatDialog
              open={bindDialogOpen}
              onOpenChange={setBindDialogOpen}
              initialProjectDir={projectDir}
              initialEnvName={envName}
              initialPermMode={permMode}
            />
          </Suspense>
        ) : null}
      </>
    </TooltipProvider>
  );
}
