import { Clock, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Session } from '@/store';

interface SessionListProps {
  sessions: Session[];
  onFocus: (id: string) => void;
  onMinimize: (id: string) => void;
  onClose: (id: string) => void;
}

export function SessionList({ sessions, onFocus, onMinimize, onClose }: SessionListProps) {
  const getStatusIcon = (status: Session['status']) => {
    switch (status) {
      case 'running':
        return '🟢';
      case 'stopped':
        return '⚫';
      case 'idle':
        return '🟡';
      case 'interrupted':
        return '⚠️';
      case 'error':
        return '🔴';
      default:
        return '⚫';
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

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center gap-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <span className="text-base">{getStatusIcon(session.status)}</span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-slate-900 dark:text-white">
                {getProjectName(session.workingDir)}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {session.envName}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                {session.permMode}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(session.startedAt)}
              </span>
              <span className="flex items-center gap-1 truncate">
                <FolderOpen className="w-3 h-3 flex-shrink-0" />
                <span className="truncate" title={`${session.workingDir}${session.pid ? ` · PID: ${session.pid}` : ''}`}>
                  {session.workingDir}
                </span>
              </span>
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onFocus(session.id)}
              disabled={session.status !== 'running'}
            >
              Focus
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMinimize(session.id)}
              disabled={session.status !== 'running'}
            >
              —
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onClose(session.id)}
              className="text-red-600 hover:text-red-700"
            >
              ✕
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
