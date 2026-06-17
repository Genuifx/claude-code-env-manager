import { Suspense, lazy, useMemo } from 'react';
import { Flame, ArrowRight } from 'lucide-react';
import type { ChartDataPoint, UsageStats } from '@/types/analytics';
import { sumTokens } from '@/components/analytics/poster-types';
import { useLocale } from '@/locales';
import { formatTokens } from '@/lib/utils';
import { cn } from '@/lib/utils';

const LazyTokenChart = lazy(async () =>
  import('@/components/analytics/TokenChart').then((module) => ({ default: module.TokenChart }))
);

interface StreakUsagePopoverContentProps {
  usageStats: UsageStats;
  continuousUsageDays: number;
  onNavigateAnalytics: () => void;
}

function buildDailyChartData(
  dailyHistory: UsageStats['dailyHistory'],
  dateLocale: string,
): ChartDataPoint[] {
  const sorted = Object.entries(dailyHistory).sort(([a], [b]) => a.localeCompare(b));
  return sorted.slice(-7).map(([bucketKey, usage]) => ({
    bucketKey,
    date: new Date(bucketKey).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' }),
    Tokens: sumTokens(usage),
  }));
}

export function StreakUsagePopoverContent({
  usageStats,
  continuousUsageDays,
  onNavigateAnalytics,
}: StreakUsagePopoverContentProps) {
  const { t, lang } = useLocale();
  const dateLocale = lang === 'zh' ? 'zh-CN' : 'en-US';
  const chartData = useMemo(
    () => buildDailyChartData(usageStats.dailyHistory, dateLocale),
    [usageStats.dailyHistory, dateLocale],
  );
  const todayTokens = sumTokens(usageStats.today);
  const todayCost = usageStats.today.cost ?? 0;

  return (
    <div className="w-[320px] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4" style={{ color: 'hsl(25 95% 53%)' }} />
          <span className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
            {continuousUsageDays} {t('workspace.streakPopoverTitle')}
          </span>
        </div>
      </div>

      <div className="mt-1 flex items-baseline gap-2 text-[12px] text-muted-foreground tabular-nums">
        <span>
          {t('workspace.streakPopoverToday')}{' '}
          <span className="font-semibold text-foreground">{formatTokens(todayTokens)}</span>
          <span className="ml-0.5 text-muted-foreground/70">·</span>
          <span className="ml-1 font-semibold text-foreground">
            ${todayCost.toFixed(2)}
          </span>
        </span>
      </div>

      <div className="mt-3 -mx-1">
        <Suspense fallback={<div className="h-[140px]" />}>
          <LazyTokenChart data={chartData} seriesKeys={['Tokens']} height={140} />
        </Suspense>
      </div>

      <button
        type="button"
        onClick={onNavigateAnalytics}
        className={cn(
          'mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg',
          'px-3 py-2 text-[12px] font-medium text-foreground/85',
          'border border-[hsl(var(--glass-border-light))] bg-transparent',
          'hover:bg-foreground/[0.04] hover:text-foreground',
          'active:scale-[0.99] transition-all',
        )}
      >
        <span>{t('workspace.streakPopoverViewAnalytics')}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
