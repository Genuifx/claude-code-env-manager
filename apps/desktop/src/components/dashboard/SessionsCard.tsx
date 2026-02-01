import { useEnvStore, type Session } from '@/stores';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SessionsCardProps {
  onStopAll?: () => void;
}

export function SessionsCard({ onStopAll }: SessionsCardProps) {
  const { sessions } = useEnvStore();

  return (
    <div className="relative bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <span className="text-sm">📊</span>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white">活跃会话</h3>
        </div>
        {sessions.length > 0 && (
          <span className="text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full">
            {sessions.length} 运行中
          </span>
        )}
      </div>

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
            <span className="text-xl opacity-50">💤</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">暂无活跃会话</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">启动 Claude Code 后会显示在这里</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {sessions.map((session) => (
            <SessionItem key={session.pid} session={session} />
          ))}
        </div>
      )}

      {/* Stop all button */}
      {sessions.length > 0 && (
        <Button
          variant="outline"
          className="w-full mt-4 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
          onClick={onStopAll}
        >
          一键停止全部
        </Button>
      )}
    </div>
  );
}

function SessionItem({ session }: { session: Session }) {
  const startTime = new Date(session.startTime).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusColors = {
    running: 'bg-emerald-400',
    stopped: 'bg-slate-400',
    error: 'bg-rose-400',
  };

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 transition-colors group">
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-2 h-2 rounded-full',
          statusColors[session.status],
          session.status === 'running' && 'animate-pulse'
        )} />
        <div>
          <div className="font-medium text-sm text-slate-900 dark:text-white">
            {session.envName} · {session.permMode}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {startTime} 启动 · {session.terminalType}
          </div>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          聚焦
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600">
          停止
        </Button>
      </div>
    </div>
  );
}
