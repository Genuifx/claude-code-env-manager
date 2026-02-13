import { useState, useMemo } from 'react';
import { Search, Clock, FolderOpen, MessageSquare, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';

export interface HistorySessionItem {
  id: string;
  display: string;
  timestamp: number;
  project: string;
  projectName: string;
  segmentCount: number;
}

interface HistoryListProps {
  sessions: HistorySessionItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
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

export function HistoryList({ sessions, selectedId, onSelect }: HistoryListProps) {
  const { t } = useLocale();
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');

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
    return sessions.filter(s => {
      const matchesSearch = !search ||
        s.display.toLowerCase().includes(search.toLowerCase()) ||
        s.projectName.toLowerCase().includes(search.toLowerCase());
      const matchesProject = projectFilter === 'all' || s.projectName === projectFilter;
      return matchesSearch && matchesProject;
    });
  }, [sessions, search, projectFilter]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 space-y-2 border-b border-white/[0.06]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('history.searchPlaceholder')}
            className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>

        {/* Project filter */}
        {projectNames.length > 1 && (
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="w-full h-7 px-2 text-xs rounded-md bg-white/[0.04] border border-white/[0.08] text-foreground focus:outline-none focus:border-primary/40"
          >
            <option value="all">{t('history.allProjects')}</option>
            {projectNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground">{t('history.noResults')}</p>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map(session => (
              <button
                key={session.id}
                onClick={() => onSelect(session.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 transition-colors duration-[var(--duration-fast)]',
                  selectedId === session.id
                    ? 'bg-primary/10 border-l-2 border-l-primary'
                    : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'
                )}
              >
                <p className={cn(
                  'text-[13px] leading-snug truncate',
                  selectedId === session.id ? 'text-foreground font-medium' : 'text-foreground/80'
                )}>
                  {session.display}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                    <FolderOpen className="w-3 h-3 shrink-0" />
                    {session.projectName}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0 ml-auto">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(session.timestamp)}
                  </span>
                  {session.segmentCount > 1 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60 ml-1 shrink-0">
                      <Scissors className="w-2.5 h-2.5" />
                      {session.segmentCount}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer count */}
      <div className="px-3 py-2 border-t border-white/[0.06] text-[11px] text-muted-foreground/60">
        {t('history.totalSessions').replace('{count}', String(filtered.length))}
      </div>
    </div>
  );
}
