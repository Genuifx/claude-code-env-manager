import { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { DragEvent } from 'react';
import { Check, ChevronRight, FolderOpen, FolderClosed, MessageSquare, Pin, RefreshCw, SquarePen, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getHistorySessionDisplay } from '@/components/history/historySession';
import { useLocale } from '@/locales';
import type { Environment } from '@/store';
import type { HistorySessionItem, SessionStickerId, SessionTaskStage } from '@/features/conversations/types';
import { SessionTreeItemIcon, resolveSessionClient } from './sessionTreeIcons';
import type { WorkspaceSessionDecoration } from './useWorkspaceSessionDecorations';
import {
  SESSION_STICKERS,
  SESSION_TASK_STAGES,
  getSessionStickerDefinition,
  getSessionTaskStageDefinition,
} from './sessionAnnotations';

interface ProjectTreeProps {
  sessions: HistorySessionItem[];
  environmentByName?: Record<string, Environment>;
  decorationsBySessionKey?: Record<string, WorkspaceSessionDecoration>;
  isLoading: boolean;
  isRefreshing?: boolean;
  selectedKey: string | null;
  onSelect: (session: HistorySessionItem) => void;
  onRefresh: () => void;
  /** Save a title override. Returns a promise so callers can await it. */
  onSaveTitle?: (session: HistorySessionItem, title: string) => Promise<void>;
  onSaveAnnotation?: (
    session: HistorySessionItem,
    annotation: {
      stage?: SessionTaskStage;
      sticker?: SessionStickerId;
      label?: string;
    }
  ) => Promise<void>;
  onSessionsChanged?: () => Promise<void>;
  onCreateForProject?: (projectPath: string) => void;
  onNewSession?: () => void;
}

interface ProjectNode {
  project: string;
  projectName: string;
  sessions: HistorySessionItem[];
  latestTimestamp: number;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

function toKey(session: Pick<HistorySessionItem, 'id' | 'source'>): string {
  return `${session.source}:${session.id}`;
}

function ProjectTreeSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-2 p-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 py-1.5">
            <div className="w-4 h-4 rounded bg-muted" />
            <div className="h-3.5 w-24 rounded bg-muted" />
            <div className="h-3 w-6 rounded-full bg-muted ml-auto" />
          </div>
          {i <= 2 &&
            [1, 2].map((j) => (
              <div key={j} className="flex items-center gap-2 py-1 pl-6">
                <div className="w-3.5 h-3.5 rounded bg-muted/60" />
                <div className="h-3 rounded bg-muted/60" style={{ width: `${60 + j * 20}px` }} />
                <div className="h-2.5 w-6 rounded bg-muted/40 ml-auto" />
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

const PAGE_SIZE = 10;
const MAX_LABEL_LENGTH = 24;
const PINNED_SESSION_KEYS_STORAGE_KEY = 'ccem-workspace-pinned-sessions';

function readPinnedSessionKeys(): string[] {
  try {
    const rawValue = localStorage.getItem(PINNED_SESSION_KEYS_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const seen = new Set<string>();
    const keys: string[] = [];
    for (const value of parsed) {
      if (typeof value !== 'string' || seen.has(value)) {
        continue;
      }
      seen.add(value);
      keys.push(value);
    }
    return keys;
  } catch {
    return [];
  }
}

function hasSessionAnnotation(session: HistorySessionItem) {
  return !!(session.taskStage || session.taskSticker || session.taskLabel?.trim());
}

function SessionStickerPreview({
  sticker,
  className,
  size = 'md',
}: {
  sticker?: SessionStickerId;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const definition = getSessionStickerDefinition(sticker);
  if (!definition) {
    return null;
  }

  const sizeClasses = {
    xs: { frame: 'h-3.5 w-3.5', image: 'h-3.5 w-3.5' },
    sm: { frame: 'h-[18px] w-[18px]', image: 'h-[18px] w-[18px]' },
    md: { frame: 'h-5 w-5', image: 'h-5 w-5' },
    lg: { frame: 'h-12 w-12', image: 'h-12 w-12' },
  };
  const previewSize = sizeClasses[size];

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        previewSize.frame,
        className
      )}
      aria-hidden="true"
    >
      <img
        src={definition.imageUrl}
        alt=""
        draggable={false}
        className={cn(previewSize.image, 'object-contain drop-shadow-sm')}
      />
    </span>
  );
}

function SessionAnnotationPopover({
  session,
  t,
  onSaveAnnotation,
  variant = 'badge',
}: {
  session: HistorySessionItem;
  t: (key: string) => string;
  onSaveAnnotation?: ProjectTreeProps['onSaveAnnotation'];
  variant?: 'badge' | 'inline';
}) {
  const [open, setOpen] = useState(false);
  const [draftStage, setDraftStage] = useState<SessionTaskStage | undefined>(session.taskStage);
  const [draftSticker, setDraftSticker] = useState<SessionStickerId | undefined>(session.taskSticker);
  const [draftLabel, setDraftLabel] = useState(session.taskLabel ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDraftStage(session.taskStage);
    setDraftSticker(session.taskSticker);
    setDraftLabel(session.taskLabel ?? '');
  }, [open, session.taskLabel, session.taskStage, session.taskSticker]);

  const save = useCallback(async () => {
    if (!onSaveAnnotation) {
      return;
    }
    setIsSaving(true);
    try {
      await onSaveAnnotation(session, {
        stage: draftStage,
        sticker: draftSticker,
        label: draftLabel.trim() || undefined,
      });
      setOpen(false);
    } catch (error) {
      console.error('Failed to save session annotation:', error);
    } finally {
      setIsSaving(false);
    }
  }, [draftLabel, draftStage, draftSticker, onSaveAnnotation, session]);

  const clear = useCallback(async () => {
    if (!onSaveAnnotation) {
      return;
    }
    setIsSaving(true);
    try {
      await onSaveAnnotation(session, {});
      setOpen(false);
    } catch (error) {
      console.error('Failed to clear session annotation:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSaveAnnotation, session]);

  if (!onSaveAnnotation) {
    return null;
  }

  const triggerSticker = session.taskSticker ?? 'confused';
  const stageDefinition = getSessionTaskStageDefinition(session.taskStage);
  const shouldShowAnnotationPeek = variant === 'inline' && !!(stageDefinition || session.taskLabel?.trim());
  const annotationPeekParts = [
    stageDefinition ? t(stageDefinition.labelKey) : null,
    session.taskLabel?.trim() || null,
  ].filter(Boolean);

  const triggerButton = (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
      }}
      aria-label={t('workspace.annotationOpen')}
      title={t('workspace.annotationOpen')}
      className={cn(
        variant === 'inline'
          ? cn(
              'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
              'transition-transform duration-150 hover:scale-105'
            )
          : cn(
              'absolute -bottom-0.5 -right-0.5 z-10 inline-flex h-3.5 w-3.5 items-center justify-center rounded-[5px]',
              'bg-surface-raised/95 shadow-sm ring-1 ring-border/70 transition-opacity duration-150',
              'hover:ring-primary/35',
              session.taskSticker
                ? 'opacity-100'
                : 'pointer-events-none opacity-0 focus:pointer-events-auto focus:opacity-100 group-hover/session:pointer-events-auto group-hover/session:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:opacity-100'
            )
      )}
    >
      <SessionStickerPreview
        sticker={triggerSticker}
        size={variant === 'inline' ? 'md' : 'xs'}
        className={cn(!session.taskSticker && 'opacity-50')}
      />
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {shouldShowAnnotationPeek ? (
        <span className="group/annotation relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
          <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden max-w-[240px] -translate-y-1/2',
              'whitespace-nowrap rounded-lg border border-border/60 bg-popover/98 px-2.5 py-1.5 text-left shadow-xl backdrop-blur-xl',
              'group-hover/annotation:block group-focus-within/annotation:block'
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium leading-none text-foreground">
              <span className="min-w-0 truncate">{annotationPeekParts.join(' · ')}</span>
            </span>
          </span>
        </span>
      ) : (
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      )}
      <PopoverContent
        align="start"
        side="right"
        sideOffset={8}
        className="frosted-panel glass-noise w-[320px] rounded-xl p-3 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header — compact, click outside dismisses */}
        <p className="mb-2.5 text-[12px] font-semibold tracking-tight text-foreground">
          {t('workspace.annotationTitle')}
        </p>

        {/* Stage pills — tight inline row */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {SESSION_TASK_STAGES.map((stage) => {
            const selected = draftStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setDraftStage(selected ? undefined : stage.id)}
                className={cn(
                  'inline-flex h-[22px] items-center rounded-md px-2 text-[10px] font-medium',
                  'transition-all duration-[var(--duration-fast,150ms)]',
                  selected
                    ? cn(stage.className, 'shadow-sm')
                    : 'bg-muted/25 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                {t(stage.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Sticker grid — compact 4-col, tactile hover */}
        <div className="mb-3 grid grid-cols-4 gap-1.5">
          {SESSION_STICKERS.map((sticker) => {
            const selected = draftSticker === sticker.id;
            return (
              <button
                key={sticker.id}
                type="button"
                onClick={() => setDraftSticker(selected ? undefined : sticker.id)}
                aria-label={t(sticker.labelKey)}
                title={t(sticker.labelKey)}
                className={cn(
                  'group/sticker relative inline-flex h-[52px] items-center justify-center rounded-lg',
                  'transition-all duration-[var(--duration-fast,150ms)]',
                  selected
                    ? 'bg-primary/10 shadow-[inset_0_0_0_1.5px_hsl(var(--primary)/0.3)]'
                    : 'hover:bg-muted/30 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-none'
                )}
              >
                <SessionStickerPreview
                  sticker={sticker.id}
                  size="lg"
                  className={cn(
                    'transition-transform duration-[var(--duration-fast,150ms)]',
                    '!h-9 !w-9',
                    !selected && 'group-hover/sticker:scale-110'
                  )}
                />
                {selected && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <Check className="h-2 w-2" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Label input — inline, no section header */}
        <div className="relative mb-3">
          <input
            value={draftLabel}
            onChange={(event) => setDraftLabel(event.target.value.slice(0, MAX_LABEL_LENGTH))}
            placeholder={t('workspace.annotationLabelPlaceholder')}
            className={cn(
              'h-8 w-full rounded-lg border border-border/50 bg-surface-sunken/50 px-2.5 text-[12px] text-foreground outline-none',
              'transition-all duration-[var(--duration-fast,150ms)]',
              'placeholder:text-muted-foreground/50',
              'focus:border-primary/40 focus:ring-1 focus:ring-primary/15'
            )}
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] tabular-nums text-muted-foreground/40">
            {draftLabel.length}/{MAX_LABEL_LENGTH}
          </span>
        </div>

        {/* Footer — tight action row */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={clear}
            disabled={isSaving || !hasSessionAnnotation(session)}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground',
              'transition-colors duration-[var(--duration-fast,150ms)]',
              'hover:bg-muted/40 hover:text-foreground',
              'disabled:pointer-events-none disabled:opacity-30'
            )}
          >
            <X className="h-3 w-3" />
            {t('workspace.annotationClear')}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isSaving}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-md bg-primary px-3 text-[11px] font-medium text-primary-foreground',
              'transition-all duration-[var(--duration-fast,150ms)]',
              'hover:bg-primary/90 active:scale-[0.96]',
              'disabled:pointer-events-none disabled:opacity-50'
            )}
          >
            <Check className="h-3 w-3" />
            {isSaving ? t('workspace.annotationSaving') : t('workspace.annotationSave')}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const ProjectTree = memo(function ProjectTree({
  sessions,
  environmentByName = {},
  decorationsBySessionKey = {},
  isLoading,
  isRefreshing = false,
  selectedKey,
  onSelect,
  onRefresh,
  onSaveTitle,
  onSaveAnnotation,
  onSessionsChanged,
  onCreateForProject,
  onNewSession,
}: ProjectTreeProps) {
  const { t } = useLocale();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [pinnedSessionKeys, setPinnedSessionKeys] = useState(readPinnedSessionKeys);

  const processingKeysRef = useRef<Set<string>>(new Set());
  const [freshDotKeys, setFreshDotKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem(PINNED_SESSION_KEYS_STORAGE_KEY, JSON.stringify(pinnedSessionKeys));
  }, [pinnedSessionKeys]);

  // Track which sessions just finished processing
  useEffect(() => {
    setFreshDotKeys((prev) => {
      const next = new Set(prev);
      for (const session of sessions) {
        const key = toKey(session);
        const decoration = decorationsBySessionKey[key];
        if (decoration?.visualState === 'processing') {
          processingKeysRef.current.add(key);
        } else if (processingKeysRef.current.has(key)) {
          processingKeysRef.current.delete(key);
          next.add(key);
        }
      }
      return next;
    });
  }, [sessions, decorationsBySessionKey]);

  // Dismiss fresh dot when user selects (reads) the session
  useEffect(() => {
    if (selectedKey) {
      setFreshDotKeys((prev) => {
        if (!prev.has(selectedKey)) return prev;
        const next = new Set(prev);
        next.delete(selectedKey);
        return next;
      });
    }
  }, [selectedKey]);

  const saveEdit = useCallback(async (session: HistorySessionItem, newTitle: string) => {
    try {
      if (onSaveTitle) {
        await onSaveTitle(session, newTitle.trim());
      }
      await onSessionsChanged?.();
    } catch (err) {
      console.error('Failed to save title:', err);
    }
  }, [onSaveTitle, onSessionsChanged]);

  const [expandedProjects, setExpandedProjects] = useState<Set<string> | null>(null);
  const [projectVisibleCount, setProjectVisibleCount] = useState<Record<string, number>>({});

  const pinnedSessionKeySet = useMemo(
    () => new Set(pinnedSessionKeys),
    [pinnedSessionKeys]
  );

  const sessionByKey = useMemo(() => {
    const map = new Map<string, HistorySessionItem>();
    for (const session of sessions) {
      map.set(toKey(session), session);
    }
    return map;
  }, [sessions]);

  const pinnedSessions = useMemo(
    () => pinnedSessionKeys
      .map((key) => sessionByKey.get(key))
      .filter((session): session is HistorySessionItem => !!session),
    [pinnedSessionKeys, sessionByKey]
  );

  const unpinnedSessions = useMemo(
    () => sessions.filter((session) => !pinnedSessionKeySet.has(toKey(session))),
    [pinnedSessionKeySet, sessions]
  );

  const togglePinnedSession = useCallback((session: HistorySessionItem) => {
    const key = toKey(session);
    setPinnedSessionKeys((previous) => {
      if (previous.includes(key)) {
        return previous.filter((pinnedKey) => pinnedKey !== key);
      }
      return [key, ...previous.filter((pinnedKey) => pinnedKey !== key)];
    });
  }, []);

  // Drag-to-reorder state for pinned sessions
  const dragSourceKeyRef = useRef<string | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before');

  const clearDragState = useCallback(() => {
    dragSourceKeyRef.current = null;
    setDraggingKey(null);
    setDropTargetKey(null);
    setDropPosition('before');
  }, []);

  const handlePinnedDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>, session: HistorySessionItem) => {
      const key = toKey(session);
      dragSourceKeyRef.current = key;
      setDraggingKey(key);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', key);
    },
    []
  );

  const handlePinnedDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>, session: HistorySessionItem) => {
      if (!dragSourceKeyRef.current) return;
      const key = toKey(session);
      if (key === dragSourceKeyRef.current) {
        if (dropTargetKey) setDropTargetKey(null);
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const rect = event.currentTarget.getBoundingClientRect();
      const isTopHalf = event.clientY < rect.top + rect.height / 2;
      setDropTargetKey(key);
      setDropPosition(isTopHalf ? 'before' : 'after');
    },
    [dropTargetKey]
  );

  const handlePinnedDrop = useCallback(
    (event: DragEvent<HTMLDivElement>, session: HistorySessionItem) => {
      event.preventDefault();
      const sourceKey = dragSourceKeyRef.current;
      const targetKey = toKey(session);
      if (!sourceKey || sourceKey === targetKey) {
        clearDragState();
        return;
      }
      setPinnedSessionKeys((prev) => {
        const without = prev.filter((k) => k !== sourceKey);
        const targetIndex = without.indexOf(targetKey);
        if (targetIndex === -1) return prev;
        const insertAt = dropPosition === 'before' ? targetIndex : targetIndex + 1;
        const next = [...without];
        next.splice(insertAt, 0, sourceKey);
        return next;
      });
      clearDragState();
    },
    [clearDragState, dropPosition]
  );

  // Build project nodes from sessions
  const projectNodes = useMemo(() => {
    const map = new Map<string, ProjectNode>();
    for (const session of unpinnedSessions) {
      let node = map.get(session.project);
      if (!node) {
        node = {
          project: session.project,
          projectName: session.projectName,
          sessions: [],
          latestTimestamp: 0,
        };
        map.set(session.project, node);
      }
      node.sessions.push(session);
      if (session.timestamp > node.latestTimestamp) {
        node.latestTimestamp = session.timestamp;
      }
    }
    // Sort nodes by latest timestamp desc
    const nodes = Array.from(map.values());
    nodes.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
    // Sort sessions within each node by timestamp desc
    for (const node of nodes) {
      node.sessions.sort((a, b) => b.timestamp - a.timestamp);
    }
    return nodes;
  }, [unpinnedSessions]);

  // Auto-expand top 3 projects on first load
  const effectiveExpanded = useMemo(() => {
    if (expandedProjects !== null) return expandedProjects;
    return new Set(projectNodes.slice(0, 3).map((n) => n.project));
  }, [expandedProjects, projectNodes]);

  // Per-project visible count helper
  const getVisibleCount = useCallback(
    (project: string) => projectVisibleCount[project] ?? PAGE_SIZE,
    [projectVisibleCount]
  );
  const loadMore = useCallback(
    (project: string) =>
      setProjectVisibleCount((prev) => ({ ...prev, [project]: (prev[project] ?? PAGE_SIZE) + PAGE_SIZE })),
    []
  );

  const toggleProject = useCallback(
    (project: string) => {
      setExpandedProjects((prev) => {
        const next = new Set(prev ?? effectiveExpanded);
        if (next.has(project)) {
          next.delete(project);
        } else {
          next.add(project);
        }
        return next;
      });
    },
    [effectiveExpanded]
  );

  const totalProjects = projectNodes.length;
  const totalSessions = sessions.length;

  const resolveEnvironment = useCallback((session: HistorySessionItem) => {
    const decoration = decorationsBySessionKey[toKey(session)];
    const environmentName = session.envName ?? decoration?.envName;
    return environmentName ? environmentByName[environmentName] : undefined;
  }, [decorationsBySessionKey, environmentByName]);

  const getIconTitle = useCallback((session: HistorySessionItem) => {
    const decoration = decorationsBySessionKey[toKey(session)];
    const client = resolveSessionClient(session, decoration);
    const clientLabel = client === 'codex'
      ? t('workspace.newSessionCodex')
      : client === 'opencode'
        ? t('workspace.newSessionOpenCode')
        : t('workspace.newSessionClaude');

    if (decoration?.attentionKind === 'plan_review') {
      return t('workspace.sessionClientLabel').replace('{client}', clientLabel)
        + ` · ${t('workspace.sessionStatePlanReview')}`;
    }
    if (decoration?.attentionKind === 'input_required') {
      return t('workspace.sessionClientLabel').replace('{client}', clientLabel)
        + ` · ${t('workspace.sessionStateInputRequired')}`;
    }
    if (decoration?.attentionKind === 'permission_required') {
      return t('workspace.sessionClientLabel').replace('{client}', clientLabel)
        + ` · ${t('workspace.sessionStateApprovalRequired')}`;
    }
    if (decoration?.visualState === 'processing') {
      return t('workspace.sessionClientLabel').replace('{client}', clientLabel)
        + ` · ${t('workspace.sessionStateGenerating')}`;
    }

    const environment = resolveEnvironment(session);
    return environment?.name || clientLabel;
  }, [decorationsBySessionKey, resolveEnvironment, t]);

  const renderSessionRow = (session: HistorySessionItem, options: { pinnedSection?: boolean } = {}) => {
    const key = toKey(session);
    const isSelected = key === selectedKey;
    const isEditing = editingKey === key;
    const isPinned = pinnedSessionKeySet.has(key);
    const pinLabel = isPinned ? t('workspace.unpinSession') : t('workspace.pinSession');
    const rowChrome = options.pinnedSection ? 'mx-0' : 'mx-1';
    const rowPadding = options.pinnedSection ? 'pl-2 pr-2' : 'pl-9 pr-2';
    const editPadding = options.pinnedSection ? 'pl-2 pr-2' : 'pl-9 pr-3';

    if (isEditing) {
      return (
        <div
          key={key}
          className={cn(
            'w-full flex items-center gap-2 py-1.5 rounded-md bg-surface-raised',
            rowChrome,
            editPadding
          )}
        >
          <span
            className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center"
            title={getIconTitle(session)}
          >
            <SessionTreeItemIcon
              session={session}
              environment={resolveEnvironment(session)}
              decoration={decorationsBySessionKey[key]}
              isSelected
            />
          </span>
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setEditingKey(null);
                void saveEdit(session, editValue);
              }
              if (e.key === 'Escape') setEditingKey(null);
            }}
            onBlur={() => setEditingKey(null)}
            className="h-5 text-[12px] bg-transparent outline-none border-b border-primary/40 flex-1 min-w-0"
          />
        </div>
      );
    }

    return (
      <div
        key={key}
        role="button"
        tabIndex={0}
        draggable={options.pinnedSection === true}
        onDragStart={options.pinnedSection ? (event) => handlePinnedDragStart(event, session) : undefined}
        onDragOver={options.pinnedSection ? (event) => handlePinnedDragOver(event, session) : undefined}
        onDrop={options.pinnedSection ? (event) => handlePinnedDrop(event, session) : undefined}
        onDragEnd={options.pinnedSection ? clearDragState : undefined}
        onClick={() => onSelect(session)}
        onDoubleClick={() => {
          setEditingKey(key);
          setEditValue(getHistorySessionDisplay(session, ''));
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(session);
          }
        }}
        className={cn(
          'group/session relative w-full rounded-lg py-1.5 text-left transition-colors duration-150 outline-none',
          rowChrome,
          rowPadding,
          'focus-visible:ring-1 focus-visible:ring-primary/30',
          isSelected
            ? 'bg-primary/[0.08] text-primary'
            : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground',
          options.pinnedSection && 'hover:bg-primary/[0.07]',
          options.pinnedSection && draggingKey !== key && 'cursor-grab active:cursor-grabbing',
          draggingKey === key && 'opacity-40'
        )}
      >
        {options.pinnedSection && dropTargetKey === key && dropPosition === 'before' && (
          <div className="pointer-events-none absolute inset-x-1 top-0 z-20 h-0.5 rounded-full bg-primary shadow-[0_0_4px_hsl(var(--primary)/0.5)]" />
        )}
        {options.pinnedSection && dropTargetKey === key && dropPosition === 'after' && (
          <div className="pointer-events-none absolute inset-x-1 bottom-0 z-20 h-0.5 rounded-full bg-primary shadow-[0_0_4px_hsl(var(--primary)/0.5)]" />
        )}
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center"
            title={getIconTitle(session)}
          >
            {session.taskSticker ? (
              <SessionAnnotationPopover
                session={session}
                t={t}
                onSaveAnnotation={onSaveAnnotation}
                variant="inline"
              />
            ) : (
              <>
                <SessionTreeItemIcon
                  session={session}
                  environment={resolveEnvironment(session)}
                  decoration={decorationsBySessionKey[key]}
                  isSelected={isSelected}
                />
                <SessionAnnotationPopover
                  session={session}
                  t={t}
                  onSaveAnnotation={onSaveAnnotation}
                  variant="badge"
                />
              </>
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm leading-tight font-medium">
            {getHistorySessionDisplay(session, t('history.untitledSession'))}
          </span>
          <span className="inline-flex w-10 shrink-0 items-center justify-end gap-1.5 text-[10px] tabular-nums transition-opacity duration-150 group-hover/session:opacity-0">
            {freshDotKeys.has(key) ? (
              <span className="relative inline-flex h-3.5 w-5 shrink-0 items-center justify-center">
                <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-amber-500/25 opacity-75" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-amber-500" />
              </span>
            ) : (
              <span className="text-muted-foreground/60">
                {formatRelativeTime(session.timestamp)}
              </span>
            )}
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              draggable={false}
              onClick={(event) => {
                event.stopPropagation();
                togglePinnedSession(session);
              }}
              onDoubleClick={(event) => event.stopPropagation()}
              aria-label={pinLabel}
              className={cn(
                'absolute right-2 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md',
                'pointer-events-none text-foreground/70 opacity-0 transition-opacity duration-150',
                'hover:text-foreground focus:text-foreground',
                'focus:pointer-events-auto focus:opacity-100 focus-visible:ring-1 focus-visible:ring-foreground/25',
                'group-hover/session:pointer-events-auto group-hover/session:opacity-100'
              )}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={6} className="whitespace-nowrap">
            {pinLabel}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  };

  return (
    <div className="flex w-[clamp(220px,30vw,280px)] shrink-0 flex-col bg-sidebar backdrop-blur-xl">
      {/* Header: New session + pinned conversations */}
      <div className="shrink-0 p-2 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewSession}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 h-8 rounded-md',
              'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              'text-xs font-medium transition-colors',
              'disabled:pointer-events-none disabled:opacity-50'
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            {t('workspace.newSession')}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={isRefreshing ? t('workspace.refreshing') : t('workspace.refresh')}
            title={isRefreshing ? t('workspace.refreshing') : t('workspace.refresh')}
            className={cn(
              'h-8 w-8 shrink-0 rounded-md bg-surface-raised/75',
              'flex items-center justify-center text-muted-foreground transition-colors',
              'hover:text-foreground hover:bg-primary/5',
              'disabled:cursor-default disabled:opacity-70'
            )}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
          </button>
        </div>

        <div className="px-0.5 pt-1">
          <div className="flex h-5 items-center justify-between px-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t('workspace.pinnedSessions')}
            </span>
            {pinnedSessions.length > 0 ? (
              <span className="rounded-full bg-muted/70 px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-muted-foreground">
                {pinnedSessions.length}
              </span>
            ) : null}
          </div>
          {pinnedSessions.length > 0 ? (
            <div className="mt-1 max-h-[148px] overflow-y-auto pr-0.5">
              {pinnedSessions.map((session) => renderSessionRow(session, { pinnedSection: true }))}
            </div>
          ) : (
            <div className="mt-1 px-2 py-2 text-[11px] text-muted-foreground/60">
              {t('workspace.noPinnedSessions')}
            </div>
          )}
        </div>
      </div>

      {/* Tree content */}
      <ScrollArea className="flex-1 min-h-0 py-1">
        {isLoading ? (
          <ProjectTreeSkeleton />
        ) : projectNodes.length === 0 ? (
          pinnedSessions.length > 0 ? null : (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground/40 mb-3" />
            <p className="text-xs text-muted-foreground mb-1">{t('workspace.noHistory')}</p>
            <p className="text-xs text-muted-foreground/70">{t('workspace.noHistoryHint')}</p>
          </div>
          )
        ) : (
          projectNodes.map((node) => {
            const isExpanded = effectiveExpanded.has(node.project);
            const visible = node.sessions.slice(0, getVisibleCount(node.project));
            const hasMore = node.sessions.length > visible.length;
            return (
              <div key={node.project} className="mb-0.5">
                {/* Project header */}
                <div
                  className={cn(
                    'group/project relative mx-1 flex items-center gap-2 rounded-md px-3 py-2 transition-colors duration-150',
                    'hover:bg-muted/60',
                    isExpanded && 'bg-muted/40'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleProject(node.project)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 text-muted-foreground transition-transform shrink-0',
                        isExpanded && 'rotate-90'
                      )}
                    />
                    {isExpanded ? (
                      <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <FolderClosed className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm font-medium text-foreground truncate flex-1">
                      {node.projectName}
                    </span>
                  </button>
                  <span className="inline-flex min-w-8 shrink-0 justify-center rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-opacity duration-150 group-hover/project:opacity-0">
                    {node.sessions.length}
                  </span>
                  {onCreateForProject && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onCreateForProject(node.project);
                          }}
                          aria-label={t('workspace.createInProject')}
                          className={cn(
                            'absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md',
                            'pointer-events-none text-foreground/70 opacity-0 transition-opacity duration-150',
                            'hover:text-foreground focus:text-foreground',
                            'focus:pointer-events-auto focus:opacity-100 focus-visible:ring-1 focus-visible:ring-foreground/25',
                            'group-hover/project:pointer-events-auto group-hover/project:opacity-100'
                          )}
                        >
                          <SquarePen className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={6} className="whitespace-nowrap">
                        {t('workspace.createInProject')}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Session list */}
                {isExpanded && (
                  <div className="pb-1">
                    {visible.map((session) => renderSessionRow(session))}
                    {hasMore && (
                      <button
                        type="button"
                        onClick={() => loadMore(node.project)}
                        className="w-full py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors pl-9"
                      >
                        {t('workspace.loadMore')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </ScrollArea>

      {/* Footer stats */}
      {totalSessions > 0 && (
        <div className="shrink-0 px-3 py-2 text-2xs text-muted-foreground">
          {totalProjects} {t('history.allProjects').toLowerCase()} · {totalSessions}{' '}
          {t('workspace.projectSessions')}
        </div>
      )}
    </div>
  );
});
