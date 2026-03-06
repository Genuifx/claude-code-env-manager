import { useDeferredValue, useState, useMemo, useRef, useEffect, type KeyboardEvent } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import { Claude, Codex } from '@lobehub/icons';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type HistorySource = 'claude' | 'codex';

export interface HistorySessionItem {
  id: string;
  source: HistorySource;
  display: string;
  timestamp: number;
  project: string;
  projectName: string;
}

interface HistoryListProps {
  sessions: HistorySessionItem[];
  selectedKey: string | null;
  onSelect: (session: HistorySessionItem) => void;
  focusedKey?: string | null;
  sourceFilter: 'all' | HistorySource;
  onVisibleSessionKeysChange?: (keys: string[]) => void;
}

function getSessionKey(session: HistorySessionItem): string {
  return `${session.source}:${session.id}`;
}

function SourceIcon({ source }: { source: HistorySource }) {
  if (source === 'codex') {
    return <Codex.Color size={12} />;
  }
  return <Claude size={12} style={{ color: '#D97757' }} />;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface TimeGroup {
  key: string;
  labelKey: string;
  sessions: HistorySessionItem[];
}

function groupByTime(sessions: HistorySessionItem[]): TimeGroup[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekStart = todayStart - (now.getDay() * 86400000);

  const groups: Record<string, HistorySessionItem[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
  };

  for (const s of sessions) {
    if (s.timestamp >= todayStart) {
      groups.today.push(s);
    } else if (s.timestamp >= yesterdayStart) {
      groups.yesterday.push(s);
    } else if (s.timestamp >= weekStart) {
      groups.thisWeek.push(s);
    } else {
      groups.earlier.push(s);
    }
  }

  const result: TimeGroup[] = [];
  if (groups.today.length > 0) result.push({ key: 'today', labelKey: 'history.groupToday', sessions: groups.today });
  if (groups.yesterday.length > 0) result.push({ key: 'yesterday', labelKey: 'history.groupYesterday', sessions: groups.yesterday });
  if (groups.thisWeek.length > 0) result.push({ key: 'thisWeek', labelKey: 'history.groupThisWeek', sessions: groups.thisWeek });
  if (groups.earlier.length > 0) result.push({ key: 'earlier', labelKey: 'history.groupEarlier', sessions: groups.earlier });

  return result;
}

export function HistoryList({
  sessions,
  selectedKey,
  onSelect,
  focusedKey,
  sourceFilter,
  onVisibleSessionKeysChange,
}: HistoryListProps) {
  const { t } = useLocale();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const listRef = useRef<HTMLDivElement>(null);

  // Extract unique project names for filter
  const projectNames = useMemo(() => {
    const names = new Set<string>();
    sessions.forEach(s => {
      if (s.projectName) names.add(s.projectName);
    });
    return Array.from(names).sort();
  }, [sessions]);

  // Filter sessions
  const filtered = useMemo(() => {
    const normalizedSearch = deferredSearch.toLowerCase();
    return sessions.filter(s => {
      const matchesSearch = !normalizedSearch ||
        s.display.toLowerCase().includes(normalizedSearch) ||
        s.projectName.toLowerCase().includes(normalizedSearch) ||
        s.source.toLowerCase().includes(normalizedSearch);
      const matchesProject = projectFilter === 'all' || s.projectName === projectFilter;
      return matchesSearch && matchesProject;
    });
  }, [sessions, deferredSearch, projectFilter]);

  // Time-grouped sessions
  const timeGroups = useMemo(() => groupByTime(filtered), [filtered]);

  useEffect(() => {
    onVisibleSessionKeysChange?.(filtered.map(getSessionKey));
  }, [filtered, onVisibleSessionKeysChange]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedKey && listRef.current) {
      const el = listRef.current.querySelector(`[data-session-id="${focusedKey}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedKey]);

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Escape') return;
    setSearch('');
    event.currentTarget.blur();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="space-y-2 border-b border-white/[0.06] px-4 pt-2 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            data-history-search
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t('history.searchPlaceholder')}
            className="w-full h-8 pl-8 pr-8 text-xs rounded-xl bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/40 bg-white/[0.04] px-1 rounded pointer-events-none">
    /
          </kbd>
        </div>

        {/* Project filter */}
        {projectNames.length > 1 && (
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('history.allProjects')}</SelectItem>
              {projectNames.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Session list */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground">{t('history.noResults')}</p>
          </div>
        ) : (
          <div className="py-1">
            {timeGroups.map(group => (
              <div key={group.key}>
                <div className="px-4 pt-5 pb-1.5 text-[10px] uppercase tracking-[0.24em] text-muted-foreground/35 font-medium">
                  {t(group.labelKey)}
                </div>
                {group.sessions.map(session => (
                  <button
                    key={getSessionKey(session)}
                    data-session-id={getSessionKey(session)}
                    onClick={() => onSelect(session)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 transition-all duration-[var(--duration-fast)] group history-item-virtualized active:scale-[0.998]',
                      selectedKey === getSessionKey(session)
                        ? 'bg-primary/8 border-l-2 border-l-primary'
                        : focusedKey === getSessionKey(session)
                          ? 'ring-1 ring-primary/30 ring-inset border-l-2 border-l-transparent'
                          : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'
                    )}
                  >
                    <p className={cn(
                      'text-[13px] leading-snug truncate',
                      selectedKey === getSessionKey(session) ? 'text-foreground font-medium' : 'text-foreground/80'
                    )}>
                      {session.display}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground/50">
                      {sourceFilter === 'all' && (
                        <span
                          className="shrink-0"
                          title={session.source === 'codex' ? 'Codex (OpenAI)' : 'Claude'}
                          aria-label={session.source === 'codex' ? 'Codex (OpenAI)' : 'Claude'}
                        >
                          <SourceIcon source={session.source} />
                        </span>
                      )}
                      <span className="truncate">{session.projectName}</span>
                      <span className="shrink-0 text-muted-foreground/25">·</span>
                      <span className="shrink-0">{formatRelativeTime(session.timestamp)}</span>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer count */}
      <div className="border-t border-white/[0.06] px-4 py-2 text-[10px] tabular-nums text-muted-foreground/35">
        {t('history.totalSessions').replace('{count}', String(filtered.length))}
      </div>
    </div>
  );
}
