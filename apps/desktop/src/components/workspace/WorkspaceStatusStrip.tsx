import { Radio, Circle, Flame, Clock, Check, Settings2 } from 'lucide-react';
import { useAppStore } from '@/store';
import { useLocale } from '@/locales';
import { getEnvColorVar, cn } from '@/lib/utils';
import { shallow } from 'zustand/shallow';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useTauriCommands } from '@/hooks/useTauriCommands';

interface WorkspaceStatusStripProps {
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
        'status-chip-glass',
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

export function WorkspaceStatusStrip({ onNavigate }: WorkspaceStatusStripProps) {
  const { t } = useLocale();
  const { sessions, currentEnv, environments, continuousUsageDays, cronTasks } = useAppStore(
    (state) => ({
      sessions: state.sessions,
      currentEnv: state.currentEnv,
      environments: state.environments,
      continuousUsageDays: state.continuousUsageDays,
      cronTasks: state.cronTasks,
    }),
    shallow
  );
  const { switchEnvironment } = useTauriCommands();

  const runningSessions = sessions.filter((s) => s.status === 'running');
  const activeCronTasks = cronTasks.filter((t) => t.enabled !== false);

  return (
    <div data-tauri-drag-region className="h-12 flex items-center gap-2.5 px-4 shrink-0">
      <StatusChip
        icon={Radio}
        label={
          runningSessions.length > 0
            ? `${runningSessions.length} ${t('workspace.statusRunning')}`
            : t('workspace.statusIdle')
        }
        color={runningSessions.length > 0 ? 'hsl(142 71% 45%)' : undefined}
        pulse={runningSessions.length > 0}
        onClick={() => onNavigate('sessions')}
      />

      {/* Environment quick-switch capsule */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'group relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full',
              'status-chip-glass',
              'hover:scale-[1.02] active:scale-[0.98]',
              'cursor-pointer'
            )}
          >
            <span className="relative flex items-center justify-center w-3.5 h-3.5">
              <Circle
                className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110"
                style={{ color: getEnvColorVar(currentEnv) }}
              />
            </span>
            <span className="text-[13px] font-medium text-foreground transition-colors">
              {currentEnv || '—'}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[180px] p-0">
          <div className={cn('p-1', environments.length > 6 && 'max-h-[264px] overflow-y-auto')}>
            {environments.map((env) => {
              const isActive = env.name === currentEnv;
              const envColor = getEnvColorVar(env.name);
              return (
                <DropdownMenuItem
                  key={env.name}
                  className={cn('gap-2.5', isActive && 'bg-primary/5')}
                  onSelect={() => {
                    if (!isActive) void switchEnvironment(env.name);
                  }}
                >
                  <Circle
                    className="w-2.5 h-2.5 shrink-0"
                    style={{ color: envColor, fill: `hsl(${envColor})` }}
                  />
                  <span className="flex-1 text-[13px]">{env.name}</span>
                  {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </DropdownMenuItem>
              );
            })}
          </div>
          {environments.length > 0 && <DropdownMenuSeparator className="mx-1" />}
          <DropdownMenuItem
            className="text-muted-foreground gap-2.5 mx-1 mb-1"
            onSelect={() => onNavigate('environments')}
          >
            <Settings2 className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[13px]">{t('workspace.manageEnvs')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {continuousUsageDays > 0 && (
        <StatusChip
          icon={Flame}
          label={`${continuousUsageDays} ${t('workspace.statusStreak')}`}
          color="hsl(25 95% 53%)"
        />
      )}

      {activeCronTasks.length > 0 && (
        <StatusChip
          icon={Clock}
          label={`${activeCronTasks.length} ${t('workspace.statusCronActive')}`}
          onClick={() => onNavigate('cron')}
        />
      )}
    </div>
  );
}
