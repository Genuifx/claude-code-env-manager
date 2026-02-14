// apps/desktop/src/pages/Analytics.tsx
import { useEffect, useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Flame, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorBanner } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import {
  TokenChart,
  ModelDistribution,
  HeatmapCalendar,
} from '@/components/analytics';
import { DailyTokenBar } from '@/components/analytics';
import { useAppStore } from '@/store';
import {
  generateMockUsageStats,
  generateMockMilestones,
} from '@/lib/mockAnalytics';
import { useLocale } from '../locales';
import { AnalyticsSkeleton } from '@/components/ui/skeleton-states';
import { useCountUp } from '@/hooks/useCountUp';
import type { ChartDataPoint, DailyActivity, Milestone, UsageStats } from '@/types/analytics';

type TimeGranularity = 'hour' | 'day' | 'week' | 'month';

/* ─── NextMilestone ──────────────────────────────────────────────── */

function NextMilestone({ milestones }: { milestones: Milestone[] }) {
  const { t } = useLocale();

  // Find the first unachieved milestone
  let next = milestones.find((m) => !m.achieved);

  // If all achieved, create higher targets
  if (!next) {
    const totalTokens = milestones.find((m) => m.type === 'tokens')?.current ?? 0;
    const higherTargets: Milestone[] = [
      {
        id: 'tokens-10m', type: 'tokens', title: t('analytics.milestone10mTitle'),
        description: t('analytics.milestone10mDesc'), target: 10_000_000,
        current: totalTokens, achieved: totalTokens >= 10_000_000,
      },
      {
        id: 'tokens-50m', type: 'tokens', title: t('analytics.milestone50mTitle'),
        description: t('analytics.milestone50mDesc'), target: 50_000_000,
        current: totalTokens, achieved: totalTokens >= 50_000_000,
      },
      {
        id: 'tokens-100m', type: 'tokens', title: t('analytics.milestone100mTitle'),
        description: t('analytics.milestone100mDesc'), target: 100_000_000,
        current: totalTokens, achieved: totalTokens >= 100_000_000,
      },
    ];
    next = higherTargets.find((m) => !m.achieved);
    if (!next) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span>{t('analytics.allMilestonesAchieved')}</span>
        </div>
      );
    }
  }

  const progress = Math.min((next.current / next.target) * 100, 100);
  const Icon = next.type === 'cost' ? DollarSign : next.type === 'streak' ? Flame : BarChart3;

  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm text-muted-foreground flex-shrink-0">
        {t('analytics.nextMilestone')}:
      </span>
      <span className="text-sm font-medium text-foreground flex-shrink-0">
        {next.title}
      </span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0">
        {progress.toFixed(0)}%
      </span>
    </div>
  );
}

/* ─── Analytics Page ─────────────────────────────────────────────── */

export function Analytics() {
  const { t, lang } = useLocale();
  const { usageStats, milestones, continuousUsageDays, isLoadingStats, setUsageStats, setMilestones, setContinuousUsageDays } =
    useAppStore();

  // Granularity state lives here and is passed down to TokenChart
  const [granularity, setGranularity] = useState<TimeGranularity>('hour');

  // Dynamic mock indicator — true only when real data failed to load
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  // Error state for failed data load
  const [loadError, setLoadError] = useState(false);

  // Refreshing state for the manual refresh button
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      const totalTokens = stats.total.inputTokens + stats.total.outputTokens + stats.total.cacheReadTokens + stats.total.cacheCreationTokens;
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRealData();
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadRealData();
  }, []);

  // FTUE: mark analytics as seen on first visit
  useEffect(() => {
    localStorage.setItem('ccem-ftue-analytics-seen', 'true');
  }, []);

  // Count-up animation for stat card values (hooks must be called before conditional returns)
  const totalTokensRaw = usageStats ? (usageStats.total.inputTokens + usageStats.total.outputTokens + usageStats.total.cacheReadTokens + usageStats.total.cacheCreationTokens) : 0;
  const weeklyCostRaw = usageStats?.week.cost ?? 0;
  const streakDays = continuousUsageDays ?? 0;

  const animatedTotalTokens = useCountUp(totalTokensRaw);
  const animatedWeeklyCostCents = useCountUp(Math.round(weeklyCostRaw * 100));
  const animatedStreakDays = useCountUp(streakDays);

  // ALL hooks must be called before any early return (Rules of Hooks)
  // Build chart data based on granularity — single total tokens line
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!usageStats) return [];

    const allSortedEntries = Object.entries(usageStats.dailyHistory)
      .sort(([a], [b]) => a.localeCompare(b));

    const sumTokens = (u: TokenUsageWithCost) =>
      u.inputTokens + u.outputTokens + u.cacheReadTokens + u.cacheCreationTokens;

    // Transform entries into ChartDataPoint[] with single total
    const toChartPoints = (
      entries: [string, TokenUsageWithCost][],
      dateFormat: Intl.DateTimeFormatOptions,
    ): ChartDataPoint[] =>
      entries.map(([date, usage]) => ({
        date: new Date(date).toLocaleDateString(dateLocale, dateFormat),
        Tokens: sumTokens(usage),
      }));

    // Aggregate entries by a grouping key
    const aggregate = (
      entries: [string, TokenUsageWithCost][],
      keyFn: (dateStr: string) => string,
    ): [string, TokenUsageWithCost][] => {
      const grouped: Record<string, TokenUsageWithCost> = {};
      entries.forEach(([date, usage]) => {
        const key = keyFn(date);
        if (!grouped[key]) {
          grouped[key] = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, cost: 0 };
        }
        grouped[key].inputTokens += usage.inputTokens;
        grouped[key].outputTokens += usage.outputTokens;
        grouped[key].cacheReadTokens += usage.cacheReadTokens;
        grouped[key].cacheCreationTokens += usage.cacheCreationTokens;
        grouped[key].cost += usage.cost;
      });
      return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    };

    const toPoint = (entries: [string, TokenUsageWithCost][], labelFn: (key: string) => string): ChartDataPoint[] =>
      entries.map(([key, usage]) => ({
        date: labelFn(key),
        Tokens: sumTokens(usage),
      }));

    switch (granularity) {
      case 'hour': {
        // Build a complete 24-hour window ending at the current hour,
        // filling missing hours with 0 so the time axis stays linear.
        const hourlyMap = usageStats.hourlyHistory ?? {};
        const now = new Date();
        const points: ChartDataPoint[] = [];
        let prevDate = '';
        for (let i = 23; i >= 0; i--) {
          const d = new Date(now);
          d.setMinutes(0, 0, 0);
          d.setHours(d.getHours() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}`;
          const datePart = key.slice(5, 10);
          const hourPart = key.slice(11);
          let label: string;
          if (prevDate !== datePart) {
            label = `${datePart} ${hourPart}:00`;
            prevDate = datePart;
          } else {
            label = `${hourPart}:00`;
          }
          const usage = hourlyMap[key];
          points.push({ date: label, Tokens: usage ? sumTokens(usage) : 0 });
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
          allSortedEntries as [string, TokenUsageWithCost][],
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

  // Chart series keys — single total line
  const chartSeriesKeys = ['Tokens'];

  // Bug #21 fix: Calculate real week-over-week change from dailyHistory data
  const tokenChange = useMemo(() => {
    const sorted = Object.entries(usageStats.dailyHistory)
      .sort(([a], [b]) => a.localeCompare(b));

    const thisWeekEntries = sorted.slice(-7);
    const prevWeekEntries = sorted.slice(-14, -7);

    const sumTokens = (entries: typeof thisWeekEntries) =>
      entries.reduce((acc, [, u]) => acc + u.inputTokens + u.outputTokens + u.cacheReadTokens + u.cacheCreationTokens, 0);

    const thisWeekTokens = sumTokens(thisWeekEntries);
    const prevWeekTokens = sumTokens(prevWeekEntries);

    return prevWeekEntries.length > 0 && prevWeekTokens > 0
      ? ((thisWeekTokens - prevWeekTokens) / prevWeekTokens) * 100
      : null;
  }, [usageStats]);

  // Build heatmap from real dailyHistory data — fill last 90 days up to today
  const dailyActivities: DailyActivity[] = useMemo(() => {
    if (!usageStats?.dailyHistory) return [];
    const entries = Object.entries(usageStats.dailyHistory);

    // Find max tokens for level calculation
    const tokenCounts = entries.map(([, u]) => u.inputTokens + u.outputTokens + u.cacheReadTokens + u.cacheCreationTokens);
    const maxTokens = Math.max(...tokenCounts, 1);

    // Build a lookup map from existing data
    const dataMap = new Map<string, { tokens: number; cost: number }>();
    entries.forEach(([date, usage]) => {
      const tokens = usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheCreationTokens;
      dataMap.set(date, { tokens, cost: usage.cost });
    });

    // Always fill last 90 days up to today
    const result: DailyActivity[] = [];
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - 89); // 90 days including today

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const data = dataMap.get(dateStr);
      const tokens = data?.tokens ?? 0;
      const cost = data?.cost ?? 0;
      const ratio = tokens / maxTokens;
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (ratio > 0.75) level = 4;
      else if (ratio > 0.5) level = 3;
      else if (ratio > 0.25) level = 2;
      else if (tokens > 0) level = 1;

      result.push({ date: dateStr, tokens, cost, level });
    }

    return result;
  }, [usageStats]);

  const granularityOptions = useMemo<{ key: TimeGranularity; label: string }[]>(() => [
    { key: 'hour', label: t('analytics.hour') },
    { key: 'day', label: t('analytics.day') },
    { key: 'week', label: t('analytics.week') },
    { key: 'month', label: t('analytics.month') },
  ], [t]);

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

      {/* Hero Stats Card */}
      <div className="stat-card glass-noise px-5 py-4">
        {/* Top: Hero number + trend (inline) */}
        <div className="flex items-baseline gap-3 mb-3">
          <div
            className="text-4xl font-bold"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--chart-1)), hsl(var(--chart-2)))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {animatedTotalTokens.toLocaleString()}
          </div>
          {tokenChange !== null ? (
            <div
              className={`flex items-center gap-1 text-sm ${
                tokenChange >= 0 ? 'text-chart-2' : 'text-destructive'
              }`}
            >
              {tokenChange >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {Math.abs(tokenChange).toFixed(1)}%
            </div>
          ) : null}
        </div>

        {/* Bottom section: cost + streak | compact heatmap */}
        <div className="flex items-end justify-between gap-4">
          {/* Left: Cost + Streak badges */}
          <div className="flex items-center gap-4">
            {/* Cost badge */}
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-foreground">
                ${(animatedWeeklyCostCents / 100).toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('analytics.costThisWeek')}
              </span>
            </div>

            {/* Streak badge */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <span className="text-lg font-semibold text-foreground">
                  {animatedStreakDays}
                </span>
                <Flame className={`w-4 h-4 ${streakDays >= 7 ? 'text-orange-500' : 'text-muted-foreground'}`} />
              </div>
              <span className="text-xs text-muted-foreground">
                {t('analytics.streak')}
              </span>
            </div>
          </div>

          {/* Right: Compact Heatmap */}
          <div className="flex-shrink-0">
            <HeatmapCalendar activities={dailyActivities} compact={true} />
          </div>
        </div>
      </div>

      {/* Token Consumption Area Chart */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {t('analytics.tokenDistribution')}
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg glass-subtle">
              {granularityOptions.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setGranularity(key)}
                  className={cn(
                    'px-3 h-7 text-xs rounded-md transition-all duration-150',
                    granularity === key
                      ? 'seg-active text-foreground'
                      : 'text-muted-foreground seg-hover hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              disabled={isRefreshing}
              onClick={handleRefresh}
              className="seg-hover h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        {chartData.length === 0 ? (
          <EmptyState icon={BarChart3} message={t('analytics.noDataYet')} />
        ) : (
          <TokenChart
            data={chartData}
            seriesKeys={chartSeriesKeys}
          />
        )}
      </Card>

      {/* Model Distribution + Daily Token Bar side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t('analytics.modelDistribution')}
          </h3>
          <ModelDistribution byModel={usageStats.byModel} />
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t('analytics.dailyTokens')}
          </h3>
          <DailyTokenBar dailyHistory={usageStats.dailyHistory} />
        </Card>
      </div>

      {/* Next Milestone — compact progress bar */}
      <NextMilestone milestones={milestones} />
    </div>
  );
}
