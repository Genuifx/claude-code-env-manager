import { Radio, Circle, Flame, Clock } from 'lucide-react';
import { useAppStore } from '@/store';
import { useLocale } from '@/locales';
import { getEnvColorVar } from '@/lib/utils';
import { shallow } from 'zustand/shallow';
import { cn } from '@/lib/utils';

interface DashboardStatusStripProps {
  onNavigate: (tab: string) => void;
}

function StatusChip({
  icon: Icon,
  label,
  color,
  pulse,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  color?: string;
  pulse?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full',
        'bg-surface-raised/80 border border-border',
        'shadow-sm',
        'backdrop-blur-xl',
        'transition-all duration-200 ease-out',
        'hover:scale-[1.02] active:scale-[0.98]',
        onClick && 'cursor-pointer'
      )}
    >
      <span className="relative flex items-center justify-center w-3.5 h-3.5">
        <Icon
          className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110"
          style={color ? { color } : undefined}
        />
        {pulse && (
          <>
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-40"
              style={{ backgroundColor: color || 'hsl(142 71% 45%)' }}
            />
            <span
              className="absolute inset-[-2px] rounded-full opacity-20 animate-pulse"
              style={{ backgroundColor: color || 'hsl(142 71% 45%)' }}
            />
          </>
        )}
      </span>
      <span className="text-[13px] font-medium text-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
    </button>
  );
}

export function DashboardStatusStrip({ onNavigate }: DashboardStatusStripProps) {
  const { t } = useLocale();
  const { sessions, currentEnv, continuousUsageDays, cronTasks } = useAppStore(
    (state) => ({
      sessions: state.sessions,
      currentEnv: state.currentEnv,
      continuousUsageDays: state.continuousUsageDays,
      cronTasks: state.cronTasks,
    }),
    shallow
  );

  const runningSessions = sessions.filter((s) => s.status === 'running');
  const activeCronTasks = cronTasks.filter((t) => t.enabled !== false);

  return (
    <div className="h-12 flex items-center gap-2.5 px-4 border-b border-border bg-surface backdrop-blur-xl shrink-0">
      <StatusChip
        icon={Radio}
        label={
          runningSessions.length > 0
            ? `${runningSessions.length} ${t('dashboard.statusRunning')}`
            : t('dashboard.statusIdle')
        }
        color={runningSessions.length > 0 ? 'hsl(142 71% 45%)' : undefined}
        pulse={runningSessions.length > 0}
        onClick={() => onNavigate('sessions')}
      />

      <StatusChip
        icon={Circle}
        label={currentEnv || '—'}
        color={getEnvColorVar(currentEnv)}
        onClick={() => onNavigate('environments')}
      />

      {continuousUsageDays > 0 && (
        <StatusChip
          icon={Flame}
          label={`${continuousUsageDays} ${t('dashboard.statusStreak')}`}
          color="hsl(25 95% 53%)"
        />
      )}

      {activeCronTasks.length > 0 && (
        <StatusChip
          icon={Clock}
          label={`${activeCronTasks.length} ${t('dashboard.statusCronActive')}`}
          onClick={() => onNavigate('cron')}
        />
      )}
    </div>
  );
}
