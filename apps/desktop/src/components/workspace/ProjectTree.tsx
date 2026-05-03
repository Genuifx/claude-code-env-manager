import { memo, useMemo, useState, useDeferredValue, useCallback } from 'react';
import { ChevronRight, FolderOpen, FolderClosed, MessageSquare, RefreshCw, Search, SquarePen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getHistorySessionDisplay } from '@/components/history/historySession';
import { useLocale } from '@/locales';
import type { Environment, LaunchClient } from '@/store';
import type { HistorySessionItem } from '@/features/conversations/types';
import { AgentLaunchSplitButton } from './AgentLaunchSplitButton';
import { SessionTreeItemIcon, resolveSessionClient } from './sessionTreeIcons';
import type { WorkspaceSessionDecoration } from './useWorkspaceSessionDecorations';

interface ProjectTreeProps {
  sessions: HistorySessionItem[];
  environmentByName?: Record<string, Environment>;
  decorationsBySessionKey?: Record<string, WorkspaceSessionDecoration>;
  isLoading: boolean;
  isRefreshing?: boolean;
  selectedKey: string | null;
  onSelect: (session: HistorySessionItem) => void;
  onNewSession: (client?: LaunchClient) => void;
  onRefresh: () => void;
  codexInstalled?: boolean;
  opencodeInstalled?: boolean;
  /** Save a title override. Returns a promise so callers can await it. */
  onSaveTitle?: (session: HistorySessionItem, title: string) => Promise<void>;
  onSessionsChanged?: () => Promise<void>;
  onCreateForProject?: (projectPath: string) => void;
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

export const ProjectTree = memo(function ProjectTree({
  sessions,
  environmentByName = {},
  decorationsBySessionKey = {},
  isLoading,
  isRefreshing = false,
  selectedKey,
  onSelect,
  onNewSession,
  onRefresh,
  codexInstalled = false,
  opencodeInstalled = false,
  onSaveTitle,
  onSessionsChanged,
  onCreateForProject,
}: ProjectTreeProps) {
  const { t } = useLocale();
  const [search, setSearch] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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
  const deferredSearch = useDeferredValue(search);
  const [expandedProjects, setExpandedProjects] = useState<Set<string> | null>(null);
  const [projectVisibleCount, setProjectVisibleCount] = useState<Record<string, number>>({});

  // Build project nodes from sessions
  const projectNodes = useMemo(() => {
    const map = new Map<string, ProjectNode>();
    for (const session of sessions) {
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
  }, [sessions]);

  // Auto-expand top 3 projects on first load
  const effectiveExpanded = useMemo(() => {
    if (expandedProjects !== null) return expandedProjects;
    return new Set(projectNodes.slice(0, 3).map((n) => n.project));
  }, [expandedProjects, projectNodes]);

  // Filter by search
  const filteredNodes = useMemo(() => {
    if (!deferredSearch.trim()) return projectNodes;
    const q = deferredSearch.toLowerCase();
    return projectNodes
      .map((node) => {
        const nameMatch = node.projectName.toLowerCase().includes(q);
        const filteredSessions = node.sessions.filter(
          (s) => getHistorySessionDisplay(s, '').toLowerCase().includes(q) || nameMatch
        );
        if (filteredSessions.length === 0) return null;
        return { ...node, sessions: nameMatch ? node.sessions : filteredSessions };
      })
      .filter(Boolean) as ProjectNode[];
  }, [projectNodes, deferredSearch]);

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

  return (
    <div className="w-[280px] shrink-0 flex flex-col border-r border-border/40 bg-surface backdrop-blur-xl">
      {/* Header: Dual Launch Button + Search */}
      <div className="shrink-0 p-3 flex flex-col gap-2">
        <AgentLaunchSplitButton
          newSessionLabel={t('workspace.newSession')}
          claudeLabel={t('workspace.newSessionClaude')}
          codexLabel={t('workspace.newSessionCodex')}
          opencodeLabel={t('workspace.newSessionOpenCode')}
          codexUnavailableLabel={t('settings.cliNotInstalled')}
          codexInstalled={codexInstalled}
          opencodeInstalled={opencodeInstalled}
          onLaunchClaude={() => onNewSession('claude')}
          onLaunchCodex={() => onNewSession('codex')}
          onLaunchOpenCode={() => onNewSession('opencode')}
        />
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('workspace.searchProjects')}
              className="w-full h-8 pl-8 pr-3 rounded-md text-xs bg-surface-raised border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={isRefreshing ? t('workspace.refreshing') : t('workspace.refresh')}
            title={isRefreshing ? t('workspace.refreshing') : t('workspace.refresh')}
            className={cn(
              'h-8 w-8 shrink-0 rounded-md border border-border bg-surface-raised',
              'flex items-center justify-center text-muted-foreground transition-colors',
              'hover:text-foreground hover:border-primary/40 hover:bg-primary/5',
              'disabled:cursor-default disabled:opacity-70'
            )}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Tree content */}
      <ScrollArea className="flex-1 min-h-0 py-1">
        {isLoading ? (
          <ProjectTreeSkeleton />
        ) : filteredNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground/40 mb-3" />
            <p className="text-xs text-muted-foreground mb-1">{t('workspace.noHistory')}</p>
            <p className="text-xs text-muted-foreground/70">{t('workspace.noHistoryHint')}</p>
          </div>
        ) : (
          filteredNodes.map((node) => {
            const isExpanded = effectiveExpanded.has(node.project);
            const visible = node.sessions.slice(0, getVisibleCount(node.project));
            const hasMore = node.sessions.length > visible.length;
            return (
              <div key={node.project} className="mb-0.5">
                {/* Project header */}
                <div
                  className={cn(
                    'group mx-1 flex items-center gap-2 rounded-md px-3 py-2 transition-colors',
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
                    <span className="text-[13px] font-medium text-foreground truncate flex-1">
                      {node.projectName}
                    </span>
                  </button>
                  {onCreateForProject && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCreateForProject(node.project);
                      }}
                      aria-label={t('workspace.createInProject')}
                      title={t('workspace.createInProject')}
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent',
                        'text-muted-foreground opacity-0 transition-all',
                        'group-hover:opacity-100 hover:border-primary/30 hover:bg-primary/8 hover:text-primary'
                      )}
                    >
                      <SquarePen className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <span className="text-[10px] text-muted-foreground shrink-0 font-medium px-1.5 py-0.5 rounded-full bg-muted/60">
                    {node.sessions.length}
                  </span>
                </div>

                {/* Session list */}
                {isExpanded && (
                  <div className="pb-1">
                    {visible.map((session) => {
                      const key = toKey(session);
                      const isSelected = key === selectedKey;
                      const isEditing = editingKey === key;
                      return isEditing ? (
                        <div
                          key={key}
                          className="w-full flex items-center gap-2 pl-9 pr-3 py-1.5 mx-1 rounded-md bg-surface-raised"
                        >
                          <span title={getIconTitle(session)}>
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
                      ) : (
                        <button
                          key={key}
                          type="button"
                          onClick={() => onSelect(session)}
                          onDoubleClick={() => {
                            setEditingKey(key);
                            setEditValue(getHistorySessionDisplay(session, ''));
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 pl-9 pr-3 py-1.5 text-left transition-all rounded-md mx-1 border-l-2',
                            isSelected
                              ? 'bg-primary/10 text-primary border-primary'
                              : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground border-transparent'
                          )}
                        >
                          <span title={getIconTitle(session)}>
                            <SessionTreeItemIcon
                              session={session}
                              environment={resolveEnvironment(session)}
                              decoration={decorationsBySessionKey[key]}
                              isSelected={isSelected}
                            />
                          </span>
                          <span className="text-[12px] truncate flex-1">{getHistorySessionDisplay(session, t('history.untitledSession'))}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatRelativeTime(session.timestamp)}
                          </span>
                        </button>
                      );
                    })}
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
        <div className="shrink-0 px-3 py-2 border-t border-border-subtle text-2xs text-muted-foreground">
          {totalProjects} {t('history.allProjects').toLowerCase()} · {totalSessions}{' '}
          {t('workspace.projectSessions')}
        </div>
      )}
    </div>
  );
});
