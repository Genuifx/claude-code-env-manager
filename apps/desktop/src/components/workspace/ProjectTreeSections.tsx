import { memo } from 'react';
import type { ReactNode } from 'react';
import {
  ChevronRight,
  ChevronsUp,
  FolderClosed,
  FolderOpen,
  MessageSquare,
  SquarePen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { HistorySessionItem } from '@/features/conversations/types';

export const PROJECT_TREE_PAGE_SIZE = 6;

export interface ProjectNode {
  project: string;
  projectName: string;
  sessions: HistorySessionItem[];
  latestTimestamp: number;
}

type RenderSessionRow = (
  session: HistorySessionItem,
  options?: { pinnedSection?: boolean },
) => ReactNode;

export const PinnedSessionsSection = memo(function PinnedSessionsSection({
  pinnedSessions,
  renderSessionRow,
  t,
}: {
  pinnedSessions: HistorySessionItem[];
  renderSessionRow: RenderSessionRow;
  t: (key: string) => string;
}) {
  return (
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
        <div className="mt-1 pr-0.5">
          {pinnedSessions.map((session) => renderSessionRow(session, { pinnedSection: true }))}
        </div>
      ) : (
        <div className="mt-1 px-2 py-2 text-[11px] text-muted-foreground/60">
          {t('workspace.noPinnedSessions')}
        </div>
      )}
    </div>
  );
});

export const ProjectTreeContent = memo(function ProjectTreeContent({
  effectiveExpanded,
  getVisibleCount,
  isLoading,
  onCreateForProject,
  pinnedSessionsCount,
  projectNodes,
  renderSessionRow,
  toggleProject,
  collapseList,
  loadMore,
  t,
}: {
  effectiveExpanded: Set<string>;
  getVisibleCount: (project: string) => number;
  isLoading: boolean;
  onCreateForProject?: (projectPath: string) => void;
  pinnedSessionsCount: number;
  projectNodes: ProjectNode[];
  renderSessionRow: RenderSessionRow;
  toggleProject: (project: string) => void;
  collapseList: (project: string) => void;
  loadMore: (project: string) => void;
  t: (key: string) => string;
}) {
  return (
    <ScrollArea className="flex-1 min-h-0 py-1">
      {isLoading ? (
        <ProjectTreeSkeleton />
      ) : projectNodes.length === 0 ? (
        pinnedSessionsCount > 0 ? null : (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground/40 mb-3" />
            <p className="text-xs text-muted-foreground mb-1">{t('workspace.noHistory')}</p>
            <p className="text-xs text-muted-foreground/70">{t('workspace.noHistoryHint')}</p>
          </div>
        )
      ) : (
        projectNodes.map((node) => {
          const isExpanded = effectiveExpanded.has(node.project);
          const visibleCount = getVisibleCount(node.project);
          const visible = node.sessions.slice(0, visibleCount);
          const hasMore = node.sessions.length > visible.length;
          const canCollapse = visibleCount > PROJECT_TREE_PAGE_SIZE;
          return (
            <div
              key={node.project}
              className="mb-0.5 [content-visibility:auto] [contain-intrinsic-size:44px]"
            >
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

              {isExpanded && (
                <div className="pb-1">
                  {visible.map((session) => renderSessionRow(session))}
                  {(hasMore || canCollapse) && (
                    <div className="flex items-center gap-3 pl-9 py-1.5 text-[11px]">
                      {canCollapse && (
                        <button
                          type="button"
                          onClick={() => collapseList(node.project)}
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronsUp className="h-3 w-3" />
                          {t('workspace.collapseList')}
                        </button>
                      )}
                      {hasMore && (
                        <>
                          <button
                            type="button"
                            onClick={() => loadMore(node.project)}
                            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {t('workspace.loadMore')}
                          </button>
                          <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/50">
                            {visible.length}/{node.sessions.length}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </ScrollArea>
  );
});

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
