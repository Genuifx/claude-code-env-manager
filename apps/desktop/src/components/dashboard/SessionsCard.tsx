import { useEffect, useCallback } from 'react';
import { Terminal, Moon } from 'lucide-react';
import { useAppStore, type Session } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useSessionUpdatedEvent, type SessionUpdatePayload } from '@/hooks/useTauriEvents';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SessionsCardProps {
  onStopAll?: () => void;
}

export function SessionsCard({ onStopAll }: SessionsCardProps) {
  const { sessions, updateSessionStatus } = useAppStore();
  const { loadSessions, deleteSession, focusSession, closeSession, minimizeSession } = useTauriCommands();

  // Load sessions on mount
  useEffect(() => {
    loadSessions().catch((err) => {
      console.error('Failed to load sessions:', err);
    });
  }, [loadSessions]);

  // Handle session-updated events from backend
  const handleSessionUpdated = useCallback(
    (payload: SessionUpdatePayload) => {
      // Update the session status in the store
      updateSessionStatus(payload.id, payload.status as Session['status']);
    },
    [updateSessionStatus]
  );

  // Listen to session-updated events
  useSessionUpdatedEvent(handleSessionUpdated);

  // Handle focus session
  const handleFocusSession = async (sessionId: string) => {
    await focusSession(sessionId);
  };

  // Handle minimize session
  const handleMinimizeSession = async (sessionId: string) => {
    await minimizeSession(sessionId);
  };

  // Handle close session (terminal window)
  const handleCloseSession = async (sessionId: string) => {
    await closeSession(sessionId);
  };

  // Handle remove session
  const handleRemoveSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
    } catch (err) {
      console.error('Failed to remove session:', err);
    }
  };

  // Handle stop all sessions
  const handleStopAll = async () => {
    const runningSessions = sessions.filter((s) => s.status === 'running');
    for (const session of runningSessions) {
      try {
        await closeSession(session.id);
      } catch (err) {
        console.error(`Failed to close session ${session.id}:`, err);
      }
    }
    onStopAll?.();
  };

  const runningSessions = sessions.filter((s) => s.status === 'running');

  return (
    <div className="relative bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white">活跃会话</h3>
        </div>
        {runningSessions.length > 0 && (
          <span className="text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full">
            {runningSessions.length} 运行中
          </span>
        )}
      </div>

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
            <Moon className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">暂无活跃会话</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">启动 Claude Code 后会显示在这里</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              onFocus={() => handleFocusSession(session.id)}
              onMinimize={() => handleMinimizeSession(session.id)}
              onClose={() => handleCloseSession(session.id)}
              onRemove={() => handleRemoveSession(session.id)}
            />
          ))}
        </div>
      )}

      {/* Stop all button */}
      {runningSessions.length > 0 && (
        <Button
          variant="outline"
          className="w-full mt-4 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
          onClick={handleStopAll}
        >
          一键停止全部
        </Button>
      )}
    </div>
  );
}

interface SessionItemProps {
  session: Session;
  onFocus: () => void;
  onMinimize: () => void;
  onClose: () => void;
  onRemove: () => void;
}

function SessionItem({ session, onFocus, onMinimize, onClose, onRemove }: SessionItemProps) {
  const startTime = new Date(session.startedAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusConfig = {
    running: { color: 'bg-emerald-400', label: '运行中' },
    idle: { color: 'bg-amber-400', label: '空闲' },
    stopped: { color: 'bg-slate-400', label: '已停止' },
    interrupted: { color: 'bg-amber-400', label: '已中断' },
    error: { color: 'bg-rose-400', label: '错误' },
  };

  const status = statusConfig[session.status] || statusConfig.stopped;

  // Get short working dir name
  const workingDirName = session.workingDir.split('/').pop() || session.workingDir;

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 transition-colors group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          status.color,
          session.status === 'running' && 'animate-pulse'
        )} />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm text-slate-900 dark:text-white truncate">
            {session.envName}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {startTime} · {workingDirName}
          </div>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {session.status === 'running' ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              onClick={onFocus}
              title="聚焦窗口"
            >
              聚焦
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={onMinimize}
              title="最小化"
            >
              最小化
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              onClick={onClose}
              title="关闭会话"
            >
              关闭
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-500 hover:text-slate-600"
            onClick={onRemove}
          >
            移除
          </Button>
        )}
      </div>
    </div>
  );
}
