import { memo, useMemo, useState, useTransition } from 'react';
import { BarChart3, DollarSign, Flame, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import { TokenChart } from './TokenChart';
import { ModelDistribution } from './ModelDistribution';
import { DailyTokenBar } from './DailyTokenBar';
import type { ChartDataPoint, Milestone, TokenUsageWithCost, UsageStats } from '@/types/analytics';

type TimeGranularity = 'hour' | 'day' | 'week' | 'month';

interface AnalyticsInsightsProps {
  usageStats: UsageStats;
  milestones: Milestone[];
  isRefreshing: boolean;
  onRefresh: () => void | Promise<void>;
}

function NextMilestone({ milestones }: { milestones: Milestone[] }) {
  const { t } = useLocale();

  let next = milestones.find((milestone) => !milestone.achieved);

  if (!next) {
    const totalTokens = milestones.find((milestone) => milestone.type === 'tokens')?.current ?? 0;
    const higherTargets: Milestone[] = [
      {
        id: 'tokens-10m',
        type: 'tokens',
        title: t('analytics.milestone10mTitle'),
        description: t('analytics.milestone10mDesc'),
        target: 10_000_000,
        current: totalTokens,
        achieved: totalTokens >= 10_000_000,
      },
      {
        id: 'tokens-50m',
        type: 'tokens',
        title: t('analytics.milestone50mTitle'),
        description: t('analytics.milestone50mDesc'),
        target: 50_000_000,
        current: totalTokens,
        achieved: totalTokens >= 50_000_000,
      },
      {
        id: 'tokens-100m',
        type: 'tokens',
        title: t('analytics.milestone100mTitle'),
        description: t('analytics.milestone100mDesc'),
        target: 100_000_000,
        current: totalTokens,
        achieved: totalTokens >= 100_000_000,
      },
    ];

    next = higherTargets.find((milestone) => !milestone.achieved);
    if (!next) {
      return (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Flame className="h-4 w-4 text-orange-500" />
          <span>{t('analytics.allMilestonesAchieved')}</span>
        </div>
      );
    }
  }

  const progress = Math.min((next.current / next.target) * 100, 100);
  const Icon = next.type === 'cost' ? DollarSign : next.type === 'streak' ? Flame : BarChart3;

  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <span className="flex-shrink-0 text-sm text-muted-foreground">
        {t('analytics.nextMilestone')}:
      </span>
      <span className="flex-shrink-0 text-sm font-medium text-foreground">
        {next.title}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="flex-shrink-0 text-xs text-muted-foreground">
        {progress.toFixed(0)}%
      </span>
    </div>
  );
}

export const AnalyticsInsights = memo(function AnalyticsInsights({
  usageStats,
  milestones,
  isRefreshing,
  onRefresh,
}: AnalyticsInsightsProps) {
  const { t, lang } = useLocale();
  const [granularity, setGranularity] = useState<TimeGranularity>('day');
  const [animateTokenChart, setAnimateTokenChart] = useState(true);
  const [, startTransition] = useTransition();
  const dateLocale = lang === 'zh' ? 'zh-CN' : 'en-US';

  const chartData: ChartDataPoint[] = useMemo(() => {
    const allSortedEntries = Object.entries(usageStats.dailyHistory)
      .sort(([a], [b]) => a.localeCompare(b));

    const sumTokens = (usage: TokenUsageWithCost) =>
      usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheCreationTokens;

    const toBreakdown = (modelUsage: Record<string, TokenUsageWithCost> | undefined): Record<string, number> => {
      if (!modelUsage) {
        return {};
      }

      return Object.fromEntries(
        Object.entries(modelUsage)
          .map(([model, usage]) => [model, sumTokens(usage)] as const)
          .filter((entry): entry is readonly [string, number] => entry[1] > 0)
          .sort(([, left], [, right]) => right - left),
      );
    };

    const toChartPoints = (
      entries: [string, TokenUsageWithCost][],
      dateFormat: Intl.DateTimeFormatOptions,
    ): ChartDataPoint[] =>
      entries.map(([date, usage]) => ({
        date: new Date(date).toLocaleDateString(dateLocale, dateFormat),
        Tokens: sumTokens(usage),
        breakdown: toBreakdown(usageStats.modelDailyHistory[date]),
      }));

    const aggregate = (
      entries: [string, TokenUsageWithCost][],
      keyFn: (dateStr: string) => string,
    ): [string, { total: TokenUsageWithCost; breakdown: Record<string, TokenUsageWithCost> }][] => {
      const grouped: Record<string, { total: TokenUsageWithCost; breakdown: Record<string, TokenUsageWithCost> }> = {};

      entries.forEach(([date, usage]) => {
        const key = keyFn(date);
        if (!grouped[key]) {
          grouped[key] = {
            total: {
              inputTokens: 0,
              outputTokens: 0,
              cacheReadTokens: 0,
              cacheCreationTokens: 0,
              cost: 0,
            },
            breakdown: {},
          };
        }

        grouped[key].total.inputTokens += usage.inputTokens;
        grouped[key].total.outputTokens += usage.outputTokens;
        grouped[key].total.cacheReadTokens += usage.cacheReadTokens;
        grouped[key].total.cacheCreationTokens += usage.cacheCreationTokens;
        grouped[key].total.cost += usage.cost;

        const modelBreakdown = usageStats.modelDailyHistory[date] ?? usageStats.modelHourlyHistory[date] ?? {};
        Object.entries(modelBreakdown).forEach(([model, modelUsage]) => {
          if (!grouped[key].breakdown[model]) {
            grouped[key].breakdown[model] = {
              inputTokens: 0,
              outputTokens: 0,
              cacheReadTokens: 0,
              cacheCreationTokens: 0,
              cost: 0,
            };
          }
          grouped[key].breakdown[model].inputTokens += modelUsage.inputTokens;
          grouped[key].breakdown[model].outputTokens += modelUsage.outputTokens;
          grouped[key].breakdown[model].cacheReadTokens += modelUsage.cacheReadTokens;
          grouped[key].breakdown[model].cacheCreationTokens += modelUsage.cacheCreationTokens;
          grouped[key].breakdown[model].cost += modelUsage.cost;
        });
      });

      return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    };

    const toAggregatedPoints = (
      entries: [string, { total: TokenUsageWithCost; breakdown: Record<string, TokenUsageWithCost> }][],
      labelFn: (key: string) => string,
    ): ChartDataPoint[] =>
      entries.map(([key, usage]) => ({
        date: labelFn(key),
        Tokens: sumTokens(usage.total),
        breakdown: toBreakdown(usage.breakdown),
      }));

    switch (granularity) {
      case 'hour': {
        const hourlyMap = usageStats.hourlyHistory ?? {};
        const hourlyModelMap = usageStats.modelHourlyHistory ?? {};
        const now = new Date();
        const points: ChartDataPoint[] = [];
        let previousDate = '';

        for (let i = 23; i >= 0; i--) {
          const date = new Date(now);
          date.setMinutes(0, 0, 0);
          date.setHours(date.getHours() - i);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}`;
          const datePart = key.slice(5, 10);
          const hourPart = key.slice(11);
          const label = previousDate !== datePart ? `${datePart} ${hourPart}:00` : `${hourPart}:00`;
          previousDate = datePart;
          const usage = hourlyMap[key];
          points.push({
            date: label,
            Tokens: usage ? sumTokens(usage) : 0,
            breakdown: toBreakdown(hourlyModelMap[key]),
          });
        }

        return points;
      }
      case 'day':
        return toChartPoints(
          allSortedEntries.slice(-7) as [string, TokenUsageWithCost][],
          { month: 'short', day: 'numeric' },
        );
      case 'week': {
        const weekEntries = aggregate(
          allSortedEntries as [string, TokenUsageWithCost][],
          (dateStr) => {
            const date = new Date(dateStr);
            const jan1 = new Date(date.getFullYear(), 0, 1);
            const weekNum = Math.ceil(((date.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
            return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
          },
        );
        return toAggregatedPoints(weekEntries.slice(-4), (key) => key);
      }
      case 'month': {
        const monthEntries = aggregate(
          allSortedEntries as [string, TokenUsageWithCost][],
          (dateStr) => dateStr.slice(0, 7),
        );
        return toAggregatedPoints(
          monthEntries,
          (key) => new Date(`${key}-01`).toLocaleDateString(dateLocale, { year: 'numeric', month: 'short' }),
        );
      }
      default:
        return [];
    }
  }, [dateLocale, granularity, usageStats.dailyHistory, usageStats.hourlyHistory]);

  const granularityOptions = useMemo<{ key: TimeGranularity; label: string }[]>(() => [
    { key: 'hour', label: t('analytics.hour') },
    { key: 'day', label: t('analytics.day') },
    { key: 'week', label: t('analytics.week') },
    { key: 'month', label: t('analytics.month') },
  ], [t]);

  return (
    <>
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {t('analytics.tokenDistribution')}
          </h3>
          <div className="flex items-center gap-2">
            <div className="glass-subtle flex items-center gap-0.5 rounded-lg p-0.5">
              {granularityOptions.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (granularity === key) {
                      return;
                    }
                    setAnimateTokenChart(true);
                    startTransition(() => setGranularity(key));
                  }}
                  className={cn(
                    'h-7 rounded-md px-3 text-xs transition-all duration-150',
                    granularity === key
                      ? 'seg-active text-foreground'
                      : 'seg-hover text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={isRefreshing}
              onClick={() => void onRefresh()}
              className="seg-hover flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        {chartData.length === 0 ? (
          <EmptyState icon={BarChart3} message={t('analytics.noDataYet')} />
        ) : (
          <TokenChart data={chartData} seriesKeys={['Tokens']} animate={animateTokenChart} />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            {t('analytics.modelDistribution')}
          </h3>
          <ModelDistribution byModel={usageStats.byModel} />
        </Card>

        <Card className="p-4">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            {t('analytics.dailyTokens')}
          </h3>
          <DailyTokenBar dailyHistory={usageStats.dailyHistory} />
        </Card>
      </div>

      <NextMilestone milestones={milestones} />
    </>
  );
});
