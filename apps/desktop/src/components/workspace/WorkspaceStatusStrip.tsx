import { useState } from 'react';
import { Radio, Circle, Flame, Clock, Check, Settings2, ClipboardCheck, Search, Command } from 'lucide-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { StreakUsagePopoverContent } from './StreakUsagePopover';

interface WorkspaceStatusStripProps {
  onNavigate: (tab: string) => void;
  onOpenSearch: () => void;
}

function StatusChip({
  icon: Icon,
  label,
  color,
  pulse,
  onClick,
  className,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  color?: string;
  pulse?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full',
        'status-chip-glass',
        'hover:scale-[1.02] active:scale-[0.98]',
        onClick && 'cursor-pointer',
        className
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

export function WorkspaceStatusStrip({
  onNavigate,
  onOpenSearch,
}: WorkspaceStatusStripProps) {
  const { t } = useLocale();
  const { sessions, currentEnv, environments, continuousUsageDays, cronTasks, usageStats } = useAppStore(
    (state) => ({
      sessions: state.sessions,
      currentEnv: state.currentEnv,
      environments: state.environments,
      continuousUsageDays: state.continuousUsageDays,
      cronTasks: state.cronTasks,
      usageStats: state.usageStats,
    }),
    shallow
  );
  const [streakPopoverOpen, setStreakPopoverOpen] = useState(false);
  const { reviewEntry, reviewPanelOpen, setReviewPanelOpen } = useAppStore(
    (state) => ({
      reviewEntry: state.reviewEntry,
      reviewPanelOpen: state.reviewPanelOpen,
      setReviewPanelOpen: state.setReviewPanelOpen,
    }),
    shallow
  );
  const { switchEnvironment } = useTauriCommands();

  const runningSessions = sessions.filter((s) => s.status === 'running');
  const activeCronTasks = cronTasks.filter((t) => t.enabled !== false);

  return (
    <div
      data-tauri-drag-region
      className="workspace-status-strip h-12 flex items-center gap-2.5 shrink-0 min-w-0 overflow-x-auto scroll-glass-root [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
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

      {continuousUsageDays > 0 && usageStats && (
        <Popover open={streakPopoverOpen} onOpenChange={setStreakPopoverOpen}>
          <PopoverTrigger asChild>
            <div className="hidden md:inline-flex">
              <StatusChip
                icon={Flame}
                label={`${continuousUsageDays} ${t('workspace.statusStreak')}`}
                color="hsl(25 95% 53%)"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-[360px] p-0 overflow-hidden rounded-xl border border-[hsl(var(--glass-border-light))] bg-popover shadow-lg"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <StreakUsagePopoverContent
              usageStats={usageStats}
              continuousUsageDays={continuousUsageDays}
              onNavigateAnalytics={() => {
                setStreakPopoverOpen(false);
                onNavigate('analytics');
              }}
            />
          </PopoverContent>
        </Popover>
      )}

      {activeCronTasks.length > 0 && (
        <StatusChip
          icon={Clock}
          label={`${activeCronTasks.length} ${t('workspace.statusCronActive')}`}
          onClick={() => onNavigate('cron')}
          className="hidden lg:inline-flex"
        />
      )}

      {/* Global search trigger — spotlight-style field, distinct from status chips */}
      <button
        type="button"
        title={t('workspace.globalSearchPlaceholder')}
        onClick={onOpenSearch}
        className={cn(
          'group ml-auto inline-flex h-8 items-center gap-2 rounded-full px-3',
          'min-w-[160px] lg:min-w-[220px]',
          'border border-[hsl(var(--glass-border-light))]/40 bg-muted/25',
          'transition-colors duration-150',
          'hover:border-[hsl(var(--glass-border-light))]/70 hover:bg-muted/40'
        )}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-left text-[12px] text-muted-foreground/70">
          {t('workspace.globalSearchPlaceholder')}
        </span>
        <kbd className="inline-flex shrink-0 items-center gap-0.5 rounded border border-border/30 bg-background/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60">
          <Command className="h-2.5 w-2.5" />
          K
        </kbd>
      </button>

      {/* Review audit entry — always visible, far-right, context-aware */}
      <button
        type="button"
        aria-pressed={reviewPanelOpen}
        title={t('workspace.reviewEntry')}
        onClick={() => setReviewPanelOpen(!reviewPanelOpen)}
        className={cn(
          'group relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full cursor-pointer',
          'status-chip-glass',
          'hover:scale-[1.02] active:scale-[0.98]',
          reviewPanelOpen && 'ring-1 ring-inset ring-primary/40'
        )}
      >
        <span className="relative flex items-center justify-center w-3.5 h-3.5">
          <ClipboardCheck
            className={cn(
              'w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110',
              !reviewEntry && 'text-muted-foreground'
            )}
            style={reviewEntry ? { color: `hsl(${getEnvColorVar(reviewEntry.envName)})` } : undefined}
          />
          {reviewEntry ? (
            <span
              className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-background"
              style={{ backgroundColor: `hsl(${getEnvColorVar(reviewEntry.envName)})` }}
            />
          ) : null}
        </span>
        <span className="text-[13px] font-medium text-foreground transition-colors">
          {t('workspace.reviewEntry')}
        </span>
        {reviewEntry && reviewEntry.failedTools > 0 ? (
          <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
            {reviewEntry.failedTools}
          </span>
        ) : null}
      </button>
    </div>
  );
}
