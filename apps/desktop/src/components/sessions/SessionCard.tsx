// apps/desktop/src/components/sessions/SessionCard.tsx
import { Clock, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Session } from '@/store';

interface SessionCardProps {
  session: Session;
  onFocus: (id: string) => void;
  onMinimize: (id: string) => void;
  onClose: (id: string) => void;
}

export function SessionCard({ session, onFocus, onMinimize, onClose }: SessionCardProps) {
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
      return `${hours} 小时 ${minutes % 60} 分钟`;
    }
    return `${minutes} 分钟`;
  };

  const getProjectName = (path: string) => {
    return path.split('/').pop() || path;
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getStatusIcon(session.status)}</span>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {getProjectName(session.workingDir)}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {session.envName}
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              {session.permMode}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
        <Clock className="w-3 h-3" />
        <span>{formatDuration(session.startedAt)}</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4 truncate">
        <FolderOpen className="w-3 h-3 flex-shrink-0" />
        <span className="truncate" title={session.workingDir}>
          {session.workingDir}
        </span>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onFocus(session.id)}
          disabled={session.status !== 'running'}
          className="flex-1"
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
    </Card>
  );
}
