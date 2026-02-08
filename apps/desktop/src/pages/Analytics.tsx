// apps/desktop/src/pages/Analytics.tsx
import { useEffect, useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorBanner } from '@/components/ui/EmptyState';
import {
  TokenChart,
  ModelDistribution,
  HeatmapCalendar,
  MilestoneCard,
} from '@/components/analytics';
import { useAppStore } from '@/store';
import {
  generateMockUsageStats,
  generateMockMilestones,
} from '@/lib/mockAnalytics';
import { useLocale } from '../locales';
import { AnalyticsSkeleton } from '@/components/ui/skeleton-states';
import type { ChartDataPoint, DailyActivity, UsageStats } from '@/types/analytics';

type TimeGranularity = 'hour' | 'day' | 'week' | 'month';

export function Analytics() {
  const { t, lang } = useLocale();
  const { usageStats, milestones, continuousUsageDays, isLoadingStats, setUsageStats, setMilestones, setContinuousUsageDays } =
    useAppStore();

  // Granularity state lives here and is passed down to TokenChart
  const [granularity, setGranularity] = useState<TimeGranularity>('day');

  // Dynamic mock indicator — true only when real data failed to load
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  // Error state for failed data load
  const [loadError, setLoadError] = useState(false);

  // Dynamic date locale based on current language
  const dateLocale = lang === 'zh' ? 'zh-CN' : 'en-US';

  // Load real data from Tauri backend, fall back to mock only if it fails
  const loadRealData = async () => {
    try {
      const stats = await invoke<UsageStats>('get_usage_stats');
      setUsageStats(stats);
      setIsUsingMockData(false);

      // Load continuous usage days
      let days = 0;
      try {
        days = await invoke<number>('get_continuous_usage_days');
        setContinuousUsageDays(days);
      } catch {
        setContinuousUsageDays(0);
      }

      // Generate milestones from real data
      const totalTokens = stats.total.inputTokens + stats.total.outputTokens;
      const totalCost = stats.total.cost;
      setMilestones([
        {
          id: 'tokens-100k', type: 'tokens', title: t('analytics.milestone100kTitle'),
          description: t('analytics.milestone100kDesc'), target: 100000,
          current: totalTokens, achieved: totalTokens >= 100000,
        },
        {
          id: 'tokens-1m', type: 'tokens', title: t('analytics.milestone1mTitle'),
          description: t('analytics.milestone1mDesc'), target: 1000000,
          current: totalTokens, achieved: totalTokens >= 1000000,
        },
        {
          id: 'tokens-5m', type: 'tokens', title: t('analytics.milestone5mTitle'),
          description: t('analytics.milestone5mDesc'), target: 5000000,
          current: totalTokens, achieved: totalTokens >= 5000000,
        },
        {
          id: 'cost-10', type: 'cost', title: t('analytics.firstTenTitle'),
          description: t('analytics.firstTenDesc'), target: 10,
          current: totalCost, achieved: totalCost >= 10,
        },
        {
          id: 'cost-100', type: 'cost', title: t('analytics.hundredTitle'),
          description: t('analytics.hundredDesc'), target: 100,
          current: totalCost, achieved: totalCost >= 100,
        },
        {
          id: 'streak-7', type: 'streak', title: t('analytics.sevenDayTitle'),
          description: t('analytics.sevenDayDesc'), target: 7,
          current: days, achieved: days >= 7,
        },
      ]);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      if (import.meta.env.DEV && !usageStats) {
        // Dev-only fallback to mock data
        setUsageStats(generateMockUsageStats());
        setMilestones(generateMockMilestones());
        setContinuousUsageDays(42);
        setIsUsingMockData(true);
      } else {
        setLoadError(true);
      }
    }
  };

  useEffect(() => {
    loadRealData();
  }, []);

  // FTUE: mark analytics as seen on first visit
  useEffect(() => {
    localStorage.setItem('ccem-ftue-analytics-seen', 'true');
  }, []);

  // ALL hooks must be called before any early return (Rules of Hooks)
  // Build chart data based on granularity — uses real input/output token breakdown
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!usageStats) return [];

    const allSortedEntries = Object.entries(usageStats.dailyHistory)
      .sort(([a], [b]) => a.localeCompare(b));

    // Transform entries into ChartDataPoint[] with real input/output breakdown
    const toChartPoints = (
      entries: [string, { inputTokens: number; outputTokens: number }][],
      dateFormat: Intl.DateTimeFormatOptions,
    ): ChartDataPoint[] =>
      entries.map(([date, usage]) => ({
        date: new Date(date).toLocaleDateString(dateLocale, dateFormat),
        'Input Tokens': usage.inputTokens,
        'Output Tokens': usage.outputTokens,
      }));

    // Aggregate entries by a grouping key
    const aggregate = (
      entries: [string, { inputTokens: number; outputTokens: number }][],
      keyFn: (dateStr: string) => string,
    ): [string, { inputTokens: number; outputTokens: number }][] => {
      const grouped: Record<string, { inputTokens: number; outputTokens: number }> = {};
      entries.forEach(([date, usage]) => {
        const key = keyFn(date);
        if (!grouped[key]) {
          grouped[key] = { inputTokens: 0, outputTokens: 0 };
        }
        grouped[key].inputTokens += usage.inputTokens;
        grouped[key].outputTokens += usage.outputTokens;
      });
      return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    };

    const toPoint = (entries: [string, { inputTokens: number; outputTokens: number }][], labelFn: (key: string) => string): ChartDataPoint[] =>
      entries.map(([key, usage]) => ({
        date: labelFn(key),
        'Input Tokens': usage.inputTokens,
        'Output Tokens': usage.outputTokens,
      }));

    switch (granularity) {
      case 'hour':
        return toChartPoints(
          allSortedEntries.slice(-24) as [string, { inputTokens: number; outputTokens: number }][],
          { month: 'short', day: 'numeric' },
        );
      case 'day':
        return toChartPoints(
          allSortedEntries.slice(-7) as [string, { inputTokens: number; outputTokens: number }][],
          { month: 'short', day: 'numeric' },
        );
      case 'week': {
        const weekEntries = aggregate(
          allSortedEntries as [string, { inputTokens: number; outputTokens: number }][],
          (dateStr) => {
            const d = new Date(dateStr);
            const jan1 = new Date(d.getFullYear(), 0, 1);
            const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
            return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
          },
        );
        return toPoint(weekEntries.slice(-4), (key) => key);
      }
      case 'month': {
        const monthEntries = aggregate(
          allSortedEntries as [string, { inputTokens: number; outputTokens: number }][],
          (dateStr) => dateStr.slice(0, 7),
        );
        return toPoint(monthEntries, (key) =>
          new Date(key + '-01').toLocaleDateString(dateLocale, { year: 'numeric', month: 'short' }),
        );
      }
      default:
        return [];
    }
  }, [granularity, usageStats, dateLocale]);

  // Loading state — skeleton screen, never spinners (taste spec)
  if (isLoadingStats || !usageStats) {
    return <AnalyticsSkeleton />;
  }

  // Chart series keys — real input/output breakdown instead of fake env splits
  const chartSeriesKeys = ['Input Tokens', 'Output Tokens'];

  // Bug #21 fix: Calculate real week-over-week change from dailyHistory data
  const computeWeekOverWeekChange = () => {
    const sorted = Object.entries(usageStats.dailyHistory)
      .sort(([a], [b]) => a.localeCompare(b));

    const thisWeekEntries = sorted.slice(-7);
    const prevWeekEntries = sorted.slice(-14, -7);

    const sumTokens = (entries: typeof thisWeekEntries) =>
      entries.reduce((acc, [, u]) => acc + u.inputTokens + u.outputTokens, 0);
    const sumCost = (entries: typeof thisWeekEntries) =>
      entries.reduce((acc, [, u]) => acc + u.cost, 0);

    const thisWeekTokens = sumTokens(thisWeekEntries);
    const prevWeekTokens = sumTokens(prevWeekEntries);
    const thisWeekCost = sumCost(thisWeekEntries);
    const prevWeekCost = sumCost(prevWeekEntries);

    const tokenPct = prevWeekEntries.length > 0 && prevWeekTokens > 0
      ? ((thisWeekTokens - prevWeekTokens) / prevWeekTokens) * 100
      : null;
    const costPct = prevWeekEntries.length > 0 && prevWeekCost > 0
      ? ((thisWeekCost - prevWeekCost) / prevWeekCost) * 100
      : null;

    return { tokenPct, costPct };
  };

  const { tokenPct: tokenChange, costPct: costChange } = computeWeekOverWeekChange();

  // Build heatmap from real dailyHistory data instead of mock
  const dailyActivities: DailyActivity[] = useMemo(() => {
    if (!usageStats?.dailyHistory) return [];
    const entries = Object.entries(usageStats.dailyHistory)
      .sort(([a], [b]) => a.localeCompare(b));

    if (entries.length === 0) return [];

    // Find max tokens for level calculation
    const tokenCounts = entries.map(([, u]) => u.inputTokens + u.outputTokens);
    const maxTokens = Math.max(...tokenCounts, 1);

    return entries.map(([date, usage]) => {
      const tokens = usage.inputTokens + usage.outputTokens;
      const ratio = tokens / maxTokens;
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (ratio > 0.75) level = 4;
      else if (ratio > 0.5) level = 3;
      else if (ratio > 0.25) level = 2;
      else if (tokens > 0) level = 1;

      return { date, tokens, cost: usage.cost, level };
    });
  }, [usageStats]);

  return (
    <div className="page-transition-enter space-y-6">
      {/* Error banner — inline, never full-page */}
      {loadError && !isUsingMockData && (
        <ErrorBanner
          message={t('analytics.failedToLoad')}
          retryLabel={t('common.retry')}
          onRetry={() => {
            setLoadError(false);
            loadRealData();
          }}
        />
      )}

      {/* Demo data banner — only visible in dev mode */}
      {import.meta.env.DEV && isUsingMockData && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <span>
            <strong>{t('analytics.demoData')}</strong> — {t('analytics.demoDataHint')}
          </span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Analytics
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('analytics.subtitle')}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="text-sm text-muted-foreground">
              {t('analytics.tokenThisWeek')}
            </div>
            {tokenChange !== null ? (
              <div
                className={`flex items-center gap-1 text-xs ${
                  tokenChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {tokenChange >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(tokenChange).toFixed(1)}%
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">&mdash;</div>
            )}
          </div>
          <div className="text-2xl font-bold text-foreground mb-1">
            {((usageStats.week.inputTokens + usageStats.week.outputTokens) / 1000).toFixed(1)}K
          </div>
          <div className="text-xs text-muted-foreground">
            {t('analytics.vsLastWeek')}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="text-sm text-muted-foreground">
              {t('analytics.costThisWeek')}
            </div>
            {costChange !== null ? (
              <div
                className={`flex items-center gap-1 text-xs ${
                  costChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {costChange >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(costChange).toFixed(1)}%
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">&mdash;</div>
            )}
          </div>
          <div className="text-2xl font-bold text-foreground mb-1">
            ${usageStats.week.cost.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('analytics.vsLastWeek')}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-2">
            {t('analytics.streak')}
          </div>
          <div className="text-2xl font-bold text-foreground mb-1">
            {continuousUsageDays} {t('analytics.days')}
          </div>
        </Card>
      </div>

      {/* Token Consumption Chart */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t('analytics.tokenDistribution')}
        </h3>
        {chartData.length === 0 ? (
          <EmptyState icon={BarChart3} message={t('analytics.noDataYet')} />
        ) : (
          <TokenChart
            data={chartData}
            environments={chartSeriesKeys}
            granularity={granularity}
            onGranularityChange={setGranularity}
          />
        )}
      </Card>

      {/* Model Distribution + Activity Heatmap side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t('analytics.modelDistribution')}
          </h3>
          <ModelDistribution byModel={usageStats.byModel} />
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t('analytics.heatmap')}
          </h3>
          <HeatmapCalendar activities={dailyActivities} />
        </Card>
      </div>

      {/* Milestones */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t('analytics.milestones')}
        </h3>
        <div className="flex gap-3 overflow-x-auto">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="min-w-[200px] flex-shrink-0">
              <MilestoneCard milestone={milestone} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
