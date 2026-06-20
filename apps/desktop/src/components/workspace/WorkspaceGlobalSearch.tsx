import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FolderClosed,
  MessageSquare,
  Search,
} from 'lucide-react';
import { cn, getProjectName } from '@/lib/utils';
import { useLocale } from '@/locales';
import { getHistorySessionDisplay } from '@/components/history/historySession';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { HistorySessionItem } from '@/features/conversations/types';

interface WorkspaceGlobalSearchProps {
  sessions: HistorySessionItem[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSession: (session: HistorySessionItem) => void;
  onSelectProject: (projectPath: string) => void;
}

interface ProjectResult {
  type: 'project';
  path: string;
  name: string;
  sessionCount: number;
}

interface SessionResult {
  type: 'session';
  session: HistorySessionItem;
}

type SearchResult = ProjectResult | SessionResult;

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

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function sessionMatchesQuery(session: HistorySessionItem, query: string): boolean {
  const haystack = [
    getHistorySessionDisplay(session, ''),
    session.projectName,
    session.project,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export const WorkspaceGlobalSearch = memo(function WorkspaceGlobalSearch({
  sessions,
  isOpen,
  onOpenChange,
  onSelectSession,
  onSelectProject,
}: WorkspaceGlobalSearchProps) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const normalizedQuery = normalizeQuery(query);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  const results = useMemo<SearchResult[]>(() => {
    if (!normalizedQuery) {
      return [];
    }

    const projectMap = new Map<string, HistorySessionItem[]>();
    for (const session of sessions) {
      const list = projectMap.get(session.project) ?? [];
      list.push(session);
      projectMap.set(session.project, list);
    }

    const projectResults: ProjectResult[] = [];
    const sessionResults: SessionResult[] = [];
    const seenProjectPaths = new Set<string>();

    for (const session of sessions) {
      if (sessionMatchesQuery(session, normalizedQuery)) {
        sessionResults.push({ type: 'session', session });
      }

      if (!seenProjectPaths.has(session.project)) {
        seenProjectPaths.add(session.project);
        const projectName = session.projectName || getProjectName(session.project);
        if (
          projectName.toLowerCase().includes(normalizedQuery) ||
          session.project.toLowerCase().includes(normalizedQuery)
        ) {
          projectResults.push({
            type: 'project',
            path: session.project,
            name: projectName,
            sessionCount: projectMap.get(session.project)?.length ?? 0,
          });
        }
      }
    }

    return [...projectResults, ...sessionResults];
  }, [sessions, normalizedQuery]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const result = results[selectedIndex];
        if (!result) return;
        if (result.type === 'project') {
          onSelectProject(result.path);
        } else {
          onSelectSession(result.session);
        }
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, results, selectedIndex, onSelectProject, onSelectSession, onOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'frosted-panel glass-noise max-w-xl gap-0 overflow-hidden border-[hsl(var(--glass-border-light))] p-0 shadow-2xl',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
        )}
      >
        <DialogTitle className="sr-only">{t('workspace.globalSearchTitle')}</DialogTitle>

        <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('workspace.globalSearchPlaceholder')}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="hidden rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
            Esc
          </kbd>
        </div>

        <div className="min-h-[120px] max-h-[420px]">
          {results.length > 0 ? (
            <ScrollArea className="h-full">
              <div className="py-2">
                {results.map((result, index) => {
                  const isSelected = index === selectedIndex;
                  if (result.type === 'project') {
                    return (
                      <button
                        key={`project:${result.path}`}
                        type="button"
                        onClick={() => {
                          onSelectProject(result.path);
                          onOpenChange(false);
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          'group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          isSelected
                            ? 'bg-primary/[0.08] text-foreground'
                            : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                        )}
                      >
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 group-hover:bg-muted/60">
                          <FolderClosed className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {result.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground/70">
                            {result.sessionCount} {t('workspace.projectSessions')} · {result.path}
                          </p>
                        </div>
                      </button>
                    );
                  }

                  const session = result.session;
                  return (
                    <button
                      key={`session:${session.source}:${session.id}`}
                      type="button"
                      onClick={() => {
                        onSelectSession(session);
                        onOpenChange(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        'group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isSelected
                          ? 'bg-primary/[0.08] text-foreground'
                          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                      )}
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 group-hover:bg-muted/60">
                        <MessageSquare className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {getHistorySessionDisplay(session, t('history.untitledSession'))}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground/70">
                          {session.projectName || getProjectName(session.project)} · {formatRelativeTime(session.timestamp)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          ) : normalizedQuery ? (
            <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
              <Search className="mb-2 h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t('workspace.globalSearchEmpty')}</p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
              <Search className="mb-2 h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t('workspace.globalSearchHint')}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/40 bg-muted/20 px-4 py-2 text-[10px] text-muted-foreground/70">
          <span className="flex items-center gap-2">
            <kbd className="rounded bg-muted/60 px-1 py-0.5 font-mono">↑</kbd>
            <kbd className="rounded bg-muted/60 px-1 py-0.5 font-mono">↓</kbd>
            <span>{t('workspace.globalSearchNavigate')}</span>
          </span>
          <span className="flex items-center gap-2">
            <kbd className="rounded bg-muted/60 px-1 py-0.5 font-mono">↵</kbd>
            <span>{t('workspace.globalSearchSelect')}</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
});
