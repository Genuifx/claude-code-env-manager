import { Eye, X, LayoutGrid, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useLocale } from '@/locales';
import { cn } from '@/lib/utils';

interface LiveSessionsProps {
  onNavigate: (tab: string) => void;
}

function getEnvDotColor(envName: string): string {
  const lower = envName.toLowerCase();
  if (lower === 'official') return 'bg-chart-1';
  if (lower.includes('glm')) return 'bg-chart-2';
  if (lower.includes('deepseek')) return 'bg-chart-3';
  if (lower.includes('kimi')) return 'bg-chart-4';
  if (lower.includes('minimax')) return 'bg-chart-5';
  return 'bg-primary';
}

export function LiveSessions({ onNavigate }: LiveSessionsProps) {
  const { t } = useLocale();
  const { sessions } = useAppStore();
  const { focusSession, closeSession, arrangeSessions } = useTauriCommands();

  const runningSessions = sessions.filter(s => s.status === 'running');

  if (runningSessions.length === 0) return null;

  const handleArrange = async () => {
    const ids = runningSessions.map(s => s.id);
    const layout = runningSessions.length <= 2 ? 'horizontal2' : runningSessions.length === 3 ? 'left_main3' : 'grid4';
    await arrangeSessions(ids, layout);
  };

  return (
    <div className="glass-card glass-noise p-4 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-success animate-pulse" />
            <h3 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
              {t('dashboard.liveSessions')}
            </h3>
          </div>
          <span className="text-2xs font-semibold bg-success/[0.12] text-success px-2 py-0.5 rounded-full tabular-nums">
            {runningSessions.length}
          </span>
        </div>
        {runningSessions.length >= 2 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-2xs gap-1.5 text-muted-foreground hover:text-foreground px-2"
            onClick={handleArrange}
          >
            <LayoutGrid className="w-3 h-3" />
            {t('dashboard.arrangeWindows')}
          </Button>
        )}
      </div>

      {/* Session list */}
      <div className="space-y-0.5 max-h-[140px] overflow-y-auto">
        {runningSessions.map((session) => {
          const startTime = new Date(session.startedAt).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          });
          const workingDirName = session.workingDir.split('/').pop() || session.workingDir;

          return (
            <div
              key={session.id}
              className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 status-running', getEnvDotColor(session.envName))} />
                <span className="text-sm font-medium text-foreground flex-shrink-0">{session.envName}</span>
                <span className="text-sm text-muted-foreground/60 truncate">· {workingDirName}</span>
                <span className="text-2xs text-muted-foreground/40 tabular-nums flex-shrink-0 font-mono">{startTime}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-2xs text-primary hover:text-primary hover:bg-primary/[0.08]"
                  onClick={() => focusSession(session.id)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  {t('dashboard.focus')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-2xs text-destructive/70 hover:text-destructive hover:bg-destructive/[0.08]"
                  onClick={() => closeSession(session.id)}
                >
                  <X className="w-3 h-3 mr-1" />
                  {t('dashboard.close')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
