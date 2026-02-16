import { Zap, TrendingUp, DollarSign, Flame, Timer } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { useAppStore } from '@/store';
import { useLocale } from '@/locales';

interface MetricsRowProps {
  onNavigate: (tab: string) => void;
}

export function MetricsRow({ onNavigate }: MetricsRowProps) {
  const { t } = useLocale();
  const { sessions, usageStats, continuousUsageDays, cronTasks } = useAppStore();

  const activeSessions = sessions.filter(s => s.status === 'running').length;
  const todayTokens = (usageStats?.today.inputTokens ?? 0) + (usageStats?.today.outputTokens ?? 0);
  const todayCost = usageStats?.today.cost ?? 0;
  const weekTokens = (usageStats?.week.inputTokens ?? 0) + (usageStats?.week.outputTokens ?? 0);
  const weekCost = usageStats?.week.cost ?? 0;

  // Cron stats
  const enabledTasks = cronTasks.filter(t => t.enabled);
  const hasCron = enabledTasks.length > 0;

  return (
    <div className="grid grid-cols-5 gap-2.5">
      <div className="card-stagger">
        <MetricCard
          icon={Zap}
          iconColor="text-primary"
          label={t('dashboard.runningSessions')}
          value={activeSessions}
          formatValue={(v) => String(v)}
          sublabel={`${sessions.length} ${t('dashboard.totalSessions')}`}
          onClick={() => onNavigate('sessions')}
        />
      </div>
      <div className="card-stagger">
        <MetricCard
          icon={TrendingUp}
          iconColor="text-accent"
          label={t('dashboard.todayTokens')}
          value={todayTokens}
          formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)}
          sublabel={weekTokens > 0 ? `${t('dashboard.weekTotal')}: ${(weekTokens / 1000).toFixed(0)}K` : undefined}
          onClick={() => onNavigate('analytics')}
        />
      </div>
      <div className="card-stagger">
        <MetricCard
          icon={DollarSign}
          iconColor="text-warning"
          label={t('dashboard.todayCost')}
          value={Math.round(todayCost * 100)}
          formatValue={(v) => `$${(v / 100).toFixed(2)}`}
          sublabel={weekCost > 0 ? `${t('dashboard.weekTotal')}: $${weekCost.toFixed(2)}` : undefined}
          onClick={() => onNavigate('analytics')}
        />
      </div>
      <div className="card-stagger">
        <MetricCard
          icon={Flame}
          iconColor="text-chart-6"
          label={t('dashboard.streak')}
          value={continuousUsageDays}
          formatValue={(v) => `${v} ${t('dashboard.streakDays')}`}
          sublabel={continuousUsageDays >= 7 ? t('dashboard.streakKeepGoing') : undefined}
          sublabelColor={continuousUsageDays >= 7 ? 'text-success' : undefined}
          onClick={() => onNavigate('analytics')}
        />
      </div>
      <div className="card-stagger">
        <MetricCard
          icon={Timer}
          iconColor="text-info"
          label={t('dashboard.cronStatus')}
          value={hasCron ? enabledTasks.length : 0}
          formatValue={(v) => hasCron ? `${v}` : '—'}
          sublabel={hasCron ? t('dashboard.cronAllGood') : t('dashboard.cronNotConfigured')}
          onClick={() => onNavigate('cron')}
        />
      </div>
    </div>
  );
}
