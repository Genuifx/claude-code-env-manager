import {
  type ReactNode,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  ArrowUp,
  Clock3,
  Command,
  FileText,
  FolderTree,
  ListChecks,
  LoaderCircle,
  Paperclip,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { Claude, Codex, OpenCode } from '@lobehub/icons';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { WorkspaceFileSuggestion } from '@/lib/tauri-ipc';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import type { InstalledSkill, LaunchClient } from '@/store';
import {
  getComposerCapabilities,
  type WorkspaceComposerProvider,
} from './composerCapabilities';
import {
  createComposerFileAttachment,
  createComposerTextAttachment,
  isLargeComposerPaste,
  loadComposerRecentFiles,
  mergeComposerAttachments,
  saveComposerRecentFile,
  type ComposerAttachment,
  type ComposerRecentFile,
  type ComposerSubmitPayload,
} from './composerAttachments';
import {
  applySuggestionToComposerText,
  buildComposerSuggestions,
  findActiveComposerQuery,
  type ComposerSuggestion,
  type ComposerTokenKind,
} from './composerModel';

export interface ComposerQueuedMessage {
  id: string;
  text: string;
  planMode?: boolean;
  attachments?: ComposerAttachment[];
}

interface WorkspaceSessionComposerProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (payload: ComposerSubmitPayload) => boolean | void | Promise<boolean | void>;
  placeholder: string;
  disabled?: boolean;
  canSubmit: boolean;
  isSubmitting?: boolean;
  submitLabel: string;
  loadingLabel?: string;
  aboveComposer?: ReactNode;
  aboveTextarea?: ReactNode;
  onPrimaryAction?: () => void | Promise<void>;
  primaryActionLabel?: string;
  primaryActionIcon?: ReactNode;
  primaryActionDisabled?: boolean;
  primaryActionVariant?: ButtonProps['variant'];
  primaryActionClassName?: string;
  controls?: ReactNode;
  secondaryActions?: ReactNode;
  textareaProps?: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'placeholder' | 'disabled'>;
  provider?: WorkspaceComposerProvider;
  installedSkills?: InstalledSkill[];
  workingDir?: string | null;
  searchWorkspaceFiles?: (
    workingDir: string,
    query?: string,
    limit?: number,
  ) => Promise<WorkspaceFileSuggestion[]>;
  planModeEnabled?: boolean;
  onPlanModeEnabledChange?: (enabled: boolean) => void;
  planModeAvailable?: boolean;
  planModeHint?: string;
  codexInstalled?: boolean;
  opencodeInstalled?: boolean;
  onLaunchNewSession?: (client: LaunchClient) => void;
  queuedMessages?: ComposerQueuedMessage[];
  onFlushQueuedMessages?: () => void | Promise<void>;
  onRemoveQueuedMessage?: (id: string) => void;
  queueCanFlush?: boolean;
}

function attachmentIcon(attachment: ComposerAttachment) {
  if (attachment.kind === 'text') {
    return <FileText className="h-3.5 w-3.5" />;
  }

  return <Paperclip className="h-3.5 w-3.5" />;
}

function suggestionIcon(kind: ComposerSuggestion['kind']) {
  switch (kind) {
    case 'skill':
      return <Sparkles className="h-3.5 w-3.5" />;
    case 'command':
      return <Command className="h-3.5 w-3.5" />;
    case 'file':
      return <FolderTree className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

function ComposerAttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: ComposerAttachment;
  onRemove: (id: string) => void;
}) {
  const { t } = useLocale();
  const secondaryLabel = attachment.kind === 'file'
    ? attachment.displayPath
    : `${attachment.lineCount} lines`;

  return (
    <span
      className="inline-flex max-w-full items-center gap-2 rounded-[16px] bg-muted/45 px-2.5 py-1.5 text-left text-foreground"
      title={attachment.kind === 'file' ? attachment.absolutePath : attachment.name}
    >
      <span className="rounded-md bg-background/80 p-1 text-muted-foreground">
        {attachmentIcon(attachment)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-medium leading-4">
          {attachment.name}
        </span>
        <span className="block truncate text-[9px] leading-3.5 text-muted-foreground/85">
          {secondaryLabel}
        </span>
      </span>
      <button
        type="button"
        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
        onClick={() => onRemove(attachment.id)}
        aria-label={t('workspace.composerRemoveAttachment')}
        title={t('workspace.composerRemoveAttachment')}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function ComposerQuickMenu({
  codexInstalled,
  opencodeInstalled,
  planModeEnabled,
  planButtonVisible,
  planModeHint,
  planModeKind,
  onLaunchNewSession,
  onPlanModeEnabledChange,
}: {
  codexInstalled: boolean;
  opencodeInstalled: boolean;
  planModeEnabled: boolean;
  planButtonVisible: boolean;
  planModeHint?: string;
  planModeKind: 'session_permission' | 'command_prefix';
  onLaunchNewSession?: (client: LaunchClient) => void;
  onPlanModeEnabledChange?: (enabled: boolean) => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  const sdkItems: { client: LaunchClient; icon: ReactNode; label: string; installed: boolean }[] = [
    { client: 'claude', icon: <Claude.Color size={16} />, label: t('workspace.newSessionClaude'), installed: true },
    { client: 'codex', icon: <Codex.Color size={16} />, label: t('workspace.newSessionCodex'), installed: codexInstalled },
    { client: 'opencode', icon: <OpenCode size={16} />, label: t('workspace.newSessionOpenCode'), installed: opencodeInstalled },
  ];

  const resolvedPlanHint = planModeHint ?? (
    planModeKind === 'session_permission'
      ? t('workspace.composerPlanModeHintClaude')
      : t('workspace.composerPlanModeHintCodex')
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label={t('workspace.composerQuickMenuLabel')}
        >
          <Plus className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        sideOffset={6}
        className="w-auto min-w-[200px] rounded-xl border border-border/40 bg-popover p-1.5 shadow-md"
      >
        {sdkItems.map((item) => (
          <button
            key={item.client}
            type="button"
            disabled={!item.installed}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none',
              'transition-colors glass-dropdown-item',
              !item.installed && 'cursor-not-allowed opacity-50',
            )}
            onClick={() => {
              if (item.installed && onLaunchNewSession) {
                onLaunchNewSession(item.client);
                setOpen(false);
              }
            }}
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {!item.installed && (
              <span className="text-2xs text-muted-foreground">({t('settings.cliNotInstalled')})</span>
            )}
          </button>
        ))}

        {planButtonVisible ? (
          <>
            <div className="mx-2 my-1.5 h-px border-t border-white/[0.06]" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors glass-dropdown-item"
                  >
                    <ListChecks className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-colors',
                      planModeEnabled && 'text-foreground',
                    )} />
                    <span className={cn(
                      'flex-1 text-left transition-colors',
                      planModeEnabled && 'text-foreground',
                    )}>
                      {t('workspace.composerPlanModeShort')}
                    </span>
                    <Switch
                      checked={planModeEnabled}
                      onCheckedChange={(checked) => onPlanModeEnabledChange?.(checked)}
                      aria-label={t('workspace.composerPlanModeShort')}
                      className="data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted/85"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[280px] text-[12px] leading-5">
                  {resolvedPlanHint}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function ComposerQueueDock({
  messages,
  canFlush,
  onFlush,
  onRemove,
}: {
  messages: ComposerQueuedMessage[];
  canFlush: boolean;
  onFlush?: () => void | Promise<void>;
  onRemove?: (id: string) => void;
}) {
  const { t } = useLocale();

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="px-0.5 py-0.5">
      <div className="flex items-center gap-2.5">
        <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
          <ArrowUp className="h-3 w-3" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold leading-4 text-foreground">
            {t('workspace.composerQueuedTitle')}
          </p>
          <p className="text-[10px] leading-4 text-muted-foreground">
            {t('workspace.composerQueuedCount').replace('{count}', String(messages.length))}
          </p>
        </div>
        {onFlush ? (
          <Button
            type="button"
            size="sm"
            className="h-6 rounded-full px-2.5 text-[10px]"
            disabled={!canFlush}
            onClick={() => void onFlush()}
          >
            {t('workspace.composerQueuedSendAll')}
          </Button>
        ) : null}
      </div>

      <div className="mt-2 space-y-1">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className="flex items-start gap-2 rounded-[16px] bg-background/38 px-2 py-1.5"
          >
            <div className="mt-0.5 rounded-full bg-muted/70 px-1.5 py-0.5 text-[9px] font-semibold leading-4 text-muted-foreground">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 whitespace-pre-wrap text-[11px] leading-4.5 text-foreground/92">
                {message.text}
              </p>
              {message.attachments?.length ? (
                <p className="mt-0.5 text-[9px] leading-4 text-muted-foreground/80">
                  {t('workspace.composerAttachmentSummary').replace('{count}', String(message.attachments.length))}
                </p>
              ) : null}
              {message.planMode ? (
                <p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-primary/85">
                  {t('workspace.composerPlanModeShort')}
                </p>
              ) : null}
            </div>
            {onRemove ? (
              <button
                type="button"
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                onClick={() => onRemove(message.id)}
                aria-label={t('workspace.composerRemoveQueued')}
                title={t('workspace.composerRemoveQueued')}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ComposerSuggestionPanel({
  suggestions,
  activeSuggestionIndex,
  isSearchingFiles,
  activeQueryKind,
  onHoverSuggestion,
  onSelectSuggestion,
}: {
  suggestions: ComposerSuggestion[];
  activeSuggestionIndex: number;
  isSearchingFiles: boolean;
  activeQueryKind: ComposerTokenKind | null;
  onHoverSuggestion: (index: number) => void;
  onSelectSuggestion: (suggestion: ComposerSuggestion) => void;
}) {
  const { t } = useLocale();

  if (suggestions.length === 0 && !(activeQueryKind === 'file' && isSearchingFiles)) {
    return null;
  }

  return (
    <div className="max-h-[236px] overflow-y-auto px-0.5 py-0.5">
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.id}
          type="button"
          className={cn(
            'flex w-full items-start gap-1.5 rounded-[16px] px-1.5 py-1 text-left transition-colors',
            index === activeSuggestionIndex
              ? 'bg-background/90'
              : 'hover:bg-background/60',
          )}
          onMouseEnter={() => onHoverSuggestion(index)}
          onMouseDown={(event) => {
            event.preventDefault();
            onSelectSuggestion(suggestion);
          }}
        >
          <div className="mt-0.5 rounded-md bg-muted/35 p-1 text-muted-foreground">
            <div className="scale-[0.85]">
              {suggestionIcon(suggestion.kind)}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn(
              'truncate font-medium text-foreground',
              suggestion.kind === 'file' ? 'text-[11px] leading-4' : 'text-[11px] leading-4',
            )}>
              {suggestion.label}
            </p>
            {suggestion.subtitle ? (
              <p className={cn(
                'mt-0.5 truncate text-muted-foreground',
                suggestion.kind === 'file' ? 'text-[9px] leading-3.5 opacity-80' : 'text-[9px] leading-3.5 opacity-80',
              )}>
                {suggestion.subtitle}
              </p>
            ) : null}
          </div>
          {index === activeSuggestionIndex ? (
            <span className="mt-0.5 rounded-full bg-muted/75 px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground">
              {t('workspace.composerAcceptKey')}
            </span>
          ) : null}
        </button>
      ))}
      {suggestions.length === 0 && activeQueryKind === 'file' && isSearchingFiles ? (
        <div className="px-1.5 py-1.5 text-[10px] text-muted-foreground">
          {t('workspace.composerSearchingFiles')}
        </div>
      ) : null}
    </div>
  );
}

function ComposerAttentionPanel({
  suggestions,
  activeSuggestionIndex,
  isSearchingFiles,
  activeQueryKind,
  suggestionSectionTitle,
  onHoverSuggestion,
  onSelectSuggestion,
  queuedMessages,
  queueCanFlush,
  onFlushQueuedMessages,
  onRemoveQueuedMessage,
}: {
  suggestions: ComposerSuggestion[];
  activeSuggestionIndex: number;
  isSearchingFiles: boolean;
  activeQueryKind: ComposerTokenKind | null;
  suggestionSectionTitle?: string | null;
  onHoverSuggestion: (index: number) => void;
  onSelectSuggestion: (suggestion: ComposerSuggestion) => void;
  queuedMessages: ComposerQueuedMessage[];
  queueCanFlush: boolean;
  onFlushQueuedMessages?: () => void | Promise<void>;
  onRemoveQueuedMessage?: (id: string) => void;
}) {
  const showSuggestions = suggestions.length > 0 || (activeQueryKind === 'file' && isSearchingFiles);
  const showQueue = queuedMessages.length > 0;

  if (!showSuggestions && !showQueue) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      {showQueue ? (
        <ComposerQueueDock
          messages={queuedMessages}
          canFlush={queueCanFlush}
          onFlush={onFlushQueuedMessages}
          onRemove={onRemoveQueuedMessage}
        />
      ) : null}

      {showSuggestions ? (
        <div className="space-y-1 px-0.5">
          {suggestionSectionTitle ? (
            <div className="flex items-center gap-1.5 px-1 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
              <Clock3 className="h-3 w-3" />
              <span>{suggestionSectionTitle}</span>
            </div>
          ) : null}
          <ComposerSuggestionPanel
            suggestions={suggestions}
            activeSuggestionIndex={activeSuggestionIndex}
            isSearchingFiles={isSearchingFiles}
            activeQueryKind={activeQueryKind}
            onHoverSuggestion={onHoverSuggestion}
            onSelectSuggestion={onSelectSuggestion}
          />
        </div>
      ) : null}
    </div>
  );
}

export function WorkspaceSessionComposer({
  value,
  onValueChange,
  onSubmit,
  placeholder,
  disabled = false,
  canSubmit,
  isSubmitting = false,
  submitLabel,
  loadingLabel = submitLabel,
  aboveComposer,
  aboveTextarea,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionIcon,
  primaryActionDisabled,
  primaryActionVariant = 'default',
  primaryActionClassName,
  controls,
  secondaryActions,
  textareaProps,
  provider = 'claude',
  installedSkills = [],
  workingDir,
  searchWorkspaceFiles,
  planModeEnabled = false,
  onPlanModeEnabledChange,
  planModeAvailable,
  planModeHint,
  codexInstalled = false,
  opencodeInstalled = false,
  onLaunchNewSession,
  queuedMessages = [],
  onFlushQueuedMessages,
  onRemoveQueuedMessage,
  queueCanFlush = true,
}: WorkspaceSessionComposerProps) {
  const { t } = useLocale();
  const composerShellRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const fileSearchSeqRef = useRef(0);
  const [caretPosition, setCaretPosition] = useState(value.length);
  const [matchedFiles, setMatchedFiles] = useState<WorkspaceFileSuggestion[]>([]);
  const [isSearchingFiles, setIsSearchingFiles] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [recentFiles, setRecentFiles] = useState<ComposerRecentFile[]>([]);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const [draggedFileCount, setDraggedFileCount] = useState(0);
  const canSubmitWithAttachments = canSubmit || value.trim().length > 0 || attachments.length > 0;
  const resolvedActionLabel = isSubmitting ? loadingLabel : (primaryActionLabel ?? submitLabel);
  const resolvedPrimaryDisabled = primaryActionDisabled ?? (!canSubmitWithAttachments || disabled);
  const resolvedPrimaryIcon = isSubmitting
    ? <LoaderCircle className="h-4 w-4 animate-spin" />
    : (primaryActionIcon ?? <ArrowUp className="h-4 w-4" />);
  const capabilities = getComposerCapabilities(provider);
  const planButtonVisible = planModeAvailable ?? Boolean(onPlanModeEnabledChange);
  const activeQuery = useMemo(
    () => findActiveComposerQuery(value, caretPosition, provider),
    [caretPosition, provider, value],
  );
  const suggestions = useMemo(
    () => buildComposerSuggestions({
      activeQuery,
      provider,
      installedSkills,
      fileSuggestions: matchedFiles,
    }),
    [activeQuery, installedSkills, matchedFiles, provider],
  );
  const recentFileSuggestions = useMemo(
    () => recentFiles.map((entry) => ({
      id: `recent-file-${entry.path}`,
      kind: 'file' as const,
      label: entry.relativePath ? `@${entry.relativePath}` : entry.displayPath,
      replacement: entry.relativePath ? `@${entry.relativePath}` : entry.path,
      subtitle: entry.path,
      path: entry.path,
    })),
    [recentFiles],
  );
  const showRecentFiles = activeQuery?.kind === 'file'
    && activeQuery.query.length === 0
    && attachments.length === 0
    && recentFileSuggestions.length > 0;
  const visibleSuggestions = showRecentFiles ? recentFileSuggestions : suggestions;

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [activeQuery?.kind, activeQuery?.query, showRecentFiles, visibleSuggestions.length]);

  useEffect(() => {
    setRecentFiles(loadComposerRecentFiles(workingDir));
    setAttachments([]);
    setIsDragTarget(false);
    setDraggedFileCount(0);
  }, [workingDir]);

  useEffect(() => {
    if (pendingCaretRef.current == null || !textareaRef.current) {
      return;
    }

    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(pendingCaretRef.current, pendingCaretRef.current);
    setCaretPosition(pendingCaretRef.current);
    pendingCaretRef.current = null;
  }, [value]);

  useEffect(() => {
    if (activeQuery?.kind !== 'file' || !workingDir || !searchWorkspaceFiles) {
      setMatchedFiles([]);
      setIsSearchingFiles(false);
      return;
    }

    const requestId = ++fileSearchSeqRef.current;
    setIsSearchingFiles(true);
    const timeout = window.setTimeout(() => {
      void searchWorkspaceFiles(workingDir, activeQuery.query, 8)
        .then((results) => {
          if (requestId !== fileSearchSeqRef.current) {
            return;
          }
          setMatchedFiles(results);
        })
        .catch((error) => {
          console.error('Failed to search workspace files for composer:', error);
          if (requestId === fileSearchSeqRef.current) {
            setMatchedFiles([]);
          }
        })
        .finally(() => {
          if (requestId === fileSearchSeqRef.current) {
            setIsSearchingFiles(false);
          }
        });
    }, 90);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeQuery?.kind, activeQuery?.query, searchWorkspaceFiles, workingDir]);

  const addAttachments = useCallback((nextAttachments: ComposerAttachment[]) => {
    if (nextAttachments.length === 0) {
      return;
    }

    setAttachments((previous) => mergeComposerAttachments(previous, nextAttachments));
    for (const attachment of nextAttachments) {
      if (attachment.kind !== 'file') {
        continue;
      }
      saveComposerRecentFile(workingDir, attachment);
    }
    setRecentFiles(loadComposerRecentFiles(workingDir));
  }, [workingDir]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void getCurrentWindow()
      .onDragDropEvent((event) => {
        const shell = composerShellRef.current;
        if (!shell) {
          return;
        }
        const payload = event.payload;

        const insideComposer = (() => {
          if (payload.type === 'leave') {
            return false;
          }
          const rect = shell.getBoundingClientRect();
          const scale = window.devicePixelRatio || 1;
          const x = payload.position.x / scale;
          const y = payload.position.y / scale;
          return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        })();

        if (payload.type === 'enter') {
          setDraggedFileCount(payload.paths.length);
          setIsDragTarget(insideComposer);
          return;
        }

        if (payload.type === 'over') {
          setIsDragTarget(insideComposer);
          return;
        }

        if (payload.type === 'leave') {
          setIsDragTarget(false);
          setDraggedFileCount(0);
          return;
        }

        setIsDragTarget(false);
        setDraggedFileCount(0);
        if (!insideComposer) {
          return;
        }

        addAttachments(payload.paths.map((path: string) => createComposerFileAttachment(path, workingDir, 'drop')));
      })
      .then((dispose) => {
        if (cancelled) {
          dispose();
          return;
        }
        unlisten = dispose;
      })
      .catch((error) => {
        console.error('Failed to subscribe to workspace composer drag and drop:', error);
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [addAttachments, workingDir]);

  const syncCaretFromDom = () => {
    if (!textareaRef.current) {
      return;
    }
    setCaretPosition(textareaRef.current.selectionStart ?? value.length);
  };

  const applySuggestion = useCallback((suggestion: ComposerSuggestion) => {
    if (!activeQuery) {
      if (showRecentFiles && suggestion.path) {
        addAttachments([createComposerFileAttachment(suggestion.path, workingDir, 'recent')]);
      }
      return;
    }

    const { nextValue, nextCaretPosition } = applySuggestionToComposerText(value, activeQuery, suggestion);
    pendingCaretRef.current = nextCaretPosition;
    onValueChange(nextValue);

    if (suggestion.kind === 'file' && suggestion.path) {
      saveComposerRecentFile(workingDir, createComposerFileAttachment(suggestion.path, workingDir, 'search'));
      setRecentFiles(loadComposerRecentFiles(workingDir));
    }
  }, [activeQuery, addAttachments, onValueChange, showRecentFiles, value, workingDir]);

  const handleComposerSubmit = useCallback(async () => {
    const payload: ComposerSubmitPayload = {
      text: value.trim(),
      attachments,
    };

    if (!payload.text && payload.attachments.length === 0) {
      return false;
    }

    const result = await onSubmit(payload);
    if (result !== false) {
      setAttachments([]);
      setIsDragTarget(false);
      setDraggedFileCount(0);
    }
    return result;
  }, [attachments, onSubmit, value]);

  const hasComposerAttentionPanel = queuedMessages.length > 0
    || visibleSuggestions.length > 0
    || (activeQuery?.kind === 'file' && isSearchingFiles);

  const composerAttentionPanel = useMemo(() => {
    if (!hasComposerAttentionPanel) {
      return null;
    }

    return (
      <ComposerAttentionPanel
        suggestions={visibleSuggestions}
        activeSuggestionIndex={activeSuggestionIndex}
        isSearchingFiles={isSearchingFiles}
        activeQueryKind={activeQuery?.kind ?? null}
        suggestionSectionTitle={showRecentFiles ? t('workspace.composerRecentFiles') : null}
        onHoverSuggestion={setActiveSuggestionIndex}
        onSelectSuggestion={applySuggestion}
        queuedMessages={queuedMessages}
        queueCanFlush={queueCanFlush}
        onFlushQueuedMessages={onFlushQueuedMessages}
        onRemoveQueuedMessage={onRemoveQueuedMessage}
      />
    );
  }, [
    activeQuery?.kind,
    activeSuggestionIndex,
    applySuggestion,
    hasComposerAttentionPanel,
    isSearchingFiles,
    onFlushQueuedMessages,
    onRemoveQueuedMessage,
    queueCanFlush,
    queuedMessages,
    showRecentFiles,
    t,
    visibleSuggestions,
  ]);

  const combinedAboveComposer = useMemo(() => {
    if (!aboveComposer && !composerAttentionPanel) {
      return null;
    }

    return (
      <div className="rounded-t-[20px] rounded-b-none border-x border-t border-border/45 bg-surface-raised/97 px-2 pt-2 pb-6 shadow-[0_18px_48px_-36px_rgba(0,0,0,0.42)] backdrop-blur-sm">
        <div className="space-y-1.5">
          {aboveComposer}
          {composerAttentionPanel}
        </div>
      </div>
    );
  }, [
    aboveComposer,
    composerAttentionPanel,
  ]);

  return (
    <div className="px-4 pb-3 pt-2">
      <div ref={composerShellRef} className="relative mx-auto w-full max-w-5xl">
        {combinedAboveComposer ? (
          <div className="workspace-attention-dock pointer-events-none absolute inset-x-0 bottom-[calc(100%-18px)] z-10 flex justify-center">
            <div className="pointer-events-auto w-full max-w-[900px] px-4">
              {combinedAboveComposer}
            </div>
          </div>
        ) : null}

        <div className={cn(
          'relative z-20 rounded-[20px] border border-border/60 bg-surface-raised px-5 py-3 shadow-[0_40px_120px_-70px_rgba(0,0,0,0.38)] transition-colors',
          isDragTarget && 'border-primary/45 bg-primary/[0.035]',
        )}>
          {aboveTextarea ? (
            <div className="mb-3">
              {aboveTextarea}
            </div>
          ) : null}

          {(attachments.length > 0 || isDragTarget) ? (
            <div className={cn(
              'mb-3 rounded-[18px] border border-dashed px-3 py-2.5',
              isDragTarget
                ? 'border-primary/40 bg-primary/[0.045]'
                : 'border-border/45 bg-background/35',
            )}>
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/75">
                <Paperclip className="h-3.5 w-3.5" />
                <span>{isDragTarget ? t('workspace.composerAttachmentDropHint') : t('workspace.composerAttachmentsLabel')}</span>
                {isDragTarget && draggedFileCount > 0 ? (
                  <span>{draggedFileCount}</span>
                ) : null}
              </div>

              {attachments.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {attachments.map((attachment) => (
                    <ComposerAttachmentChip
                      key={attachment.id}
                      attachment={attachment}
                      onRemove={(id) => {
                        setAttachments((previous) => previous.filter((candidate) => candidate.id !== id));
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <textarea
            ref={textareaRef}
            {...textareaProps}
            value={value}
            onChange={(event) => {
              onValueChange(event.target.value);
              setCaretPosition(event.target.selectionStart ?? event.target.value.length);
            }}
            onFocus={(event) => {
              textareaProps?.onFocus?.(event);
            }}
            onBlur={(event) => {
              textareaProps?.onBlur?.(event);
            }}
            onPaste={(event) => {
              textareaProps?.onPaste?.(event);
              if (event.defaultPrevented) {
                return;
              }

              const pastedText = event.clipboardData?.getData('text/plain') ?? '';
              if (!isLargeComposerPaste(pastedText)) {
                return;
              }

              event.preventDefault();
              addAttachments([createComposerTextAttachment(
                pastedText,
                t('workspace.composerPastedTextName'),
                'paste',
              )]);
            }}
            onSelect={(event) => {
              syncCaretFromDom();
              textareaProps?.onSelect?.(event);
            }}
            onClick={(event) => {
              syncCaretFromDom();
              textareaProps?.onClick?.(event);
            }}
            onKeyUp={(event) => {
              syncCaretFromDom();
              textareaProps?.onKeyUp?.(event);
            }}
            onKeyDown={(event) => {
              textareaProps?.onKeyDown?.(event);
              if (event.defaultPrevented) {
                return;
              }

              if (event.key === 'Tab' && event.shiftKey && planButtonVisible && onPlanModeEnabledChange) {
                event.preventDefault();
                onPlanModeEnabledChange(!planModeEnabled);
                return;
              }

              if (visibleSuggestions.length > 0) {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActiveSuggestionIndex((current) => (current + 1) % visibleSuggestions.length);
                  return;
                }

                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveSuggestionIndex((current) => (current - 1 + visibleSuggestions.length) % visibleSuggestions.length);
                  return;
                }

                if (event.key === 'Tab' && !event.shiftKey) {
                  event.preventDefault();
                  const suggestion = visibleSuggestions[activeSuggestionIndex] ?? visibleSuggestions[0];
                  if (suggestion) {
                    applySuggestion(suggestion);
                  }
                  return;
                }
              }

              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                void handleComposerSubmit();
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[72px] w-full resize-none bg-transparent text-[14px] leading-6.5 text-foreground outline-none placeholder:text-muted-foreground/75 disabled:cursor-not-allowed disabled:text-muted-foreground"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2.5 border-t border-border/40 pt-2">
            <ComposerQuickMenu
              codexInstalled={codexInstalled}
              opencodeInstalled={opencodeInstalled}
              planModeEnabled={planModeEnabled}
              planButtonVisible={planButtonVisible}
              planModeHint={planModeHint}
              planModeKind={capabilities.planModeKind}
              onLaunchNewSession={onLaunchNewSession}
              onPlanModeEnabledChange={onPlanModeEnabledChange}
            />

            {controls}

            <div className="ml-auto flex items-center gap-2">
              {secondaryActions}

              <Button
                type="button"
                size="icon"
                variant={primaryActionVariant}
                aria-label={resolvedActionLabel}
                title={resolvedActionLabel}
                disabled={resolvedPrimaryDisabled}
                onClick={() => {
                  if (onPrimaryAction) {
                    void onPrimaryAction();
                    return;
                  }
                  void handleComposerSubmit();
                }}
                className={cn(
                  'h-9 w-9 rounded-full shadow-[0_14px_36px_-18px_rgba(0,0,0,0.42)]',
                  primaryActionClassName,
                )}
              >
                {resolvedPrimaryIcon}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
