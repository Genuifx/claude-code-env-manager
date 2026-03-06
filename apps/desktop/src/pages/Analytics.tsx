// apps/desktop/src/pages/Analytics.tsx
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Flame, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { HeatmapCalendar } from '@/components/analytics/HeatmapCalendar';
import { useAppStore } from '@/store';
import { generateMockMilestones, generateMockUsageStats } from '@/lib/mockAnalytics';
import { useLocale } from '@/locales';
import { AnalyticsSkeleton } from '@/components/ui/skeleton-states';
import { useCountUp } from '@/hooks/useCountUp';
import type { DailyActivity, UsageStats } from '@/types/analytics';
import { shallow } from 'zustand/shallow';

type UsageSourceFilter = 'all' | 'claude' | 'codex';
const ANALYTICS_CACHE_TTL_MS = 60_000;

interface AnalyticsCacheResult {
  stats: UsageStats;
  streakDays: number;
}

interface AnalyticsSourceCacheEntry {
  stats?: UsageStats;
  streakDays?: number;
  fetchedAt: number;
  promise?: Promise<AnalyticsCacheResult>;
}

const analyticsSourceCache = new Map<UsageSourceFilter, AnalyticsSourceCacheEntry>();

function calculateStreakDays(dailyHistory: UsageStats['dailyHistory']): number {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  let streak = 0;
  while (true) {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (!dailyHistory[dateKey]) {
      return streak;
    }
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
}

function primeAnalyticsSourceCache(source: UsageSourceFilter, stats: UsageStats, fetchedAt = Date.now()) {
  analyticsSourceCache.set(source, {
    stats,
    streakDays: calculateStreakDays(stats.dailyHistory),
    fetchedAt,
  });
}

async function fetchAnalyticsSource(source: UsageSourceFilter, force = false): Promise<AnalyticsCacheResult> {
  const cached = analyticsSourceCache.get(source);

  if (!force && cached?.stats && Date.now() - cached.fetchedAt < ANALYTICS_CACHE_TTL_MS) {
    return {
      stats: cached.stats,
      streakDays: cached.streakDays ?? calculateStreakDays(cached.stats.dailyHistory),
    };
  }

  if (!force && cached?.promise) {
    return cached.promise;
  }

  const request = invoke<UsageStats>('get_usage_stats', {
    source: source === 'all' ? null : source,
  })
    .then((stats) => {
      const result = {
        stats,
        streakDays: calculateStreakDays(stats.dailyHistory),
      };
      analyticsSourceCache.set(source, {
        ...result,
        fetchedAt: Date.now(),
      });
      return result;
    })
    .catch((error) => {
      if (cached) {
        analyticsSourceCache.set(source, cached);
      } else {
        analyticsSourceCache.delete(source);
      }
      throw error;
    });

  analyticsSourceCache.set(source, {
    stats: cached?.stats,
    streakDays: cached?.streakDays,
    fetchedAt: cached?.fetchedAt ?? 0,
    promise: request,
  });

  return request;
}

const LazyAnalyticsInsights = lazy(async () =>
  import('@/components/analytics/AnalyticsInsights').then((module) => ({ default: module.AnalyticsInsights }))
);

function AnalyticsInsightsFallback() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-4 h-5 w-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-2xl bg-muted" />
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-4 h-5 w-32 animate-pulse rounded-xl bg-muted" />
          <div className="h-40 w-full animate-pulse rounded-2xl bg-muted" />
        </Card>
        <Card className="p-4">
          <div className="mb-4 h-5 w-28 animate-pulse rounded-xl bg-muted" />
          <div className="h-40 w-full animate-pulse rounded-2xl bg-muted" />
        </Card>
      </div>
      <div className="flex items-center gap-3 py-2">
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-2 flex-1 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-8 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function primeAnalyticsPage() {
  void import('@/components/analytics/AnalyticsInsights');
}

export function Analytics() {
  const { t } = useLocale();
  const {
    usageStats,
    milestones,
    continuousUsageDays,
    isLoadingStats,
    setUsageStats,
    setMilestones,
    setContinuousUsageDays,
  } = useAppStore(
    (state) => ({
      usageStats: state.usageStats,
      milestones: state.milestones,
      continuousUsageDays: state.continuousUsageDays,
      isLoadingStats: state.isLoadingStats,
      setUsageStats: state.setUsageStats,
      setMilestones: state.setMilestones,
      setContinuousUsageDays: state.setContinuousUsageDays,
    }),
    shallow
  );

  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [usageSource, setUsageSource] = useState<UsageSourceFilter>('all');
  const requestSeqRef = useRef(0);
  const [, startTransition] = useTransition();

  const buildMilestones = useCallback((stats: UsageStats, streakDays: number) => {
    const totalTokens = stats.total.inputTokens + stats.total.outputTokens + stats.total.cacheReadTokens + stats.total.cacheCreationTokens;
    const totalCost = stats.total.cost;

    return [
      {
        id: 'tokens-100k',
        type: 'tokens' as const,
        title: t('analytics.milestone100kTitle'),
        description: t('analytics.milestone100kDesc'),
        target: 100000,
        current: totalTokens,
        achieved: totalTokens >= 100000,
      },
      {
        id: 'tokens-1m',
        type: 'tokens' as const,
        title: t('analytics.milestone1mTitle'),
        description: t('analytics.milestone1mDesc'),
        target: 1000000,
        current: totalTokens,
        achieved: totalTokens >= 1000000,
      },
      {
        id: 'tokens-5m',
        type: 'tokens' as const,
        title: t('analytics.milestone5mTitle'),
        description: t('analytics.milestone5mDesc'),
        target: 5000000,
        current: totalTokens,
        achieved: totalTokens >= 5000000,
      },
      {
        id: 'cost-10',
        type: 'cost' as const,
        title: t('analytics.firstTenTitle'),
        description: t('analytics.firstTenDesc'),
        target: 10,
        current: totalCost,
        achieved: totalCost >= 10,
      },
      {
        id: 'cost-100',
        type: 'cost' as const,
        title: t('analytics.hundredTitle'),
        description: t('analytics.hundredDesc'),
        target: 100,
        current: totalCost,
        achieved: totalCost >= 100,
      },
      {
        id: 'streak-7',
        type: 'streak' as const,
        title: t('analytics.sevenDayTitle'),
        description: t('analytics.sevenDayDesc'),
        target: 7,
        current: streakDays,
        achieved: streakDays >= 7,
      },
    ];
  }, [t]);

  const applyAnalyticsData = useCallback((result: AnalyticsCacheResult) => {
    setUsageStats(result.stats);
    setIsUsingMockData(false);
    setContinuousUsageDays(result.streakDays);
    setMilestones(buildMilestones(result.stats, result.streakDays));
  }, [buildMilestones, setContinuousUsageDays, setMilestones, setUsageStats]);

  const loadRealData = useCallback(async (force = false) => {
    const requestSeq = ++requestSeqRef.current;

    try {
      setLoadError(false);
      const result = await fetchAnalyticsSource(usageSource, force);

      if (requestSeq !== requestSeqRef.current) {
        return;
      }

      applyAnalyticsData(result);
    } catch (err) {
      if (requestSeq !== requestSeqRef.current) {
        return;
      }

      console.error('Failed to load analytics data:', err);
      const hasExistingStats = useAppStore.getState().usageStats !== null;

      if (import.meta.env.DEV && !hasExistingStats) {
        const mockStats = generateMockUsageStats();
        primeAnalyticsSourceCache('all', mockStats);
        setUsageStats(mockStats);
        setMilestones(generateMockMilestones());
        setContinuousUsageDays(calculateStreakDays(mockStats.dailyHistory));
        setIsUsingMockData(true);
      } else {
        setLoadError(true);
      }
    }
  }, [applyAnalyticsData, setContinuousUsageDays, setMilestones, setUsageStats, usageSource]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadRealData(true);
    setIsRefreshing(false);
  }, [loadRealData]);

  useEffect(() => {
    loadRealData();
  }, [loadRealData]);

  useEffect(() => {
    if (usageSource === 'all' && usageStats && !analyticsSourceCache.has('all')) {
      primeAnalyticsSourceCache('all', usageStats);
    }
  }, [usageSource, usageStats]);

  useEffect(() => {
    localStorage.setItem('ccem-ftue-analytics-seen', 'true');
  }, []);

  const totalTokensRaw = usageStats
    ? usageStats.total.inputTokens + usageStats.total.outputTokens + usageStats.total.cacheReadTokens + usageStats.total.cacheCreationTokens
    : 0;
  const weeklyCostRaw = usageStats?.week.cost ?? 0;
  const streakDays = continuousUsageDays ?? 0;

  const animatedTotalTokens = useCountUp(totalTokensRaw);
  const animatedWeeklyCostCents = useCountUp(Math.round(weeklyCostRaw * 100));
  const animatedStreakDays = useCountUp(streakDays);

  const tokenChange = useMemo(() => {
    if (!usageStats) {
      return null;
    }

    const sorted = Object.entries(usageStats.dailyHistory)
      .sort(([a], [b]) => a.localeCompare(b));
    const thisWeekEntries = sorted.slice(-7);
    const prevWeekEntries = sorted.slice(-14, -7);
    const sumTokens = (entries: typeof thisWeekEntries) =>
      entries.reduce((acc, [, usage]) => (
        acc + usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheCreationTokens
      ), 0);

    const thisWeekTokens = sumTokens(thisWeekEntries);
    const prevWeekTokens = sumTokens(prevWeekEntries);

    return prevWeekEntries.length > 0 && prevWeekTokens > 0
      ? ((thisWeekTokens - prevWeekTokens) / prevWeekTokens) * 100
      : null;
  }, [usageStats]);

  const dailyActivities: DailyActivity[] = useMemo(() => {
    if (!usageStats?.dailyHistory) {
      return [];
    }

    const entries = Object.entries(usageStats.dailyHistory);
    const tokenCounts = entries.map(([, usage]) => (
      usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheCreationTokens
    ));
    const maxTokens = Math.max(...tokenCounts, 1);
    const dataMap = new Map<string, { tokens: number; cost: number }>();

    entries.forEach(([date, usage]) => {
      const tokens = usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheCreationTokens;
      dataMap.set(date, { tokens, cost: usage.cost });
    });

    const result: DailyActivity[] = [];
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - 89);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

  if (isLoadingStats || !usageStats) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="page-transition-enter space-y-6">
      {loadError && !isUsingMockData && (
        <ErrorBanner
          message={t('analytics.failedToLoad')}
          retryLabel={t('common.retry')}
          onRetry={() => {
            setLoadError(false);
            void loadRealData();
          }}
        />
      )}

      {import.meta.env.DEV && isUsingMockData && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
          <span>
            <strong>{t('analytics.demoData')}</strong> — {t('analytics.demoDataHint')}
          </span>
        </div>
      )}

      <div className="stat-card glass-noise px-5 py-4">
        <div className="mb-3 flex justify-start">
          <div className="glass-subtle flex items-center gap-0.5 rounded-lg p-0.5">
            {(['all', 'claude', 'codex'] as UsageSourceFilter[]).map((source) => (
              <button
                key={source}
                type="button"
                onClick={() => startTransition(() => setUsageSource(source))}
                className={cn(
                  'h-7 rounded-md px-3 text-xs transition-all duration-150',
                  usageSource === source
                    ? 'seg-active text-foreground'
                    : 'seg-hover text-muted-foreground hover:text-foreground'
                )}
              >
                {source === 'all' && t('analytics.sourceAll')}
                {source === 'claude' && t('analytics.sourceClaude')}
                {source === 'codex' && t('analytics.sourceCodex')}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex items-baseline gap-3">
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
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {Math.abs(tokenChange).toFixed(1)}%
            </div>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-foreground">
                ${(animatedWeeklyCostCents / 100).toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('analytics.costThisWeek')}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <span className="text-lg font-semibold text-foreground">
                  {animatedStreakDays}
                </span>
                <Flame className={`h-4 w-4 ${streakDays >= 7 ? 'text-orange-500' : 'text-muted-foreground'}`} />
              </div>
              <span className="text-xs text-muted-foreground">
                {t('analytics.streak')}
              </span>
            </div>
          </div>

          <div className="flex-shrink-0">
            <HeatmapCalendar activities={dailyActivities} compact={true} />
          </div>
        </div>
      </div>

      <Suspense fallback={<AnalyticsInsightsFallback />}>
        <LazyAnalyticsInsights
          usageStats={usageStats}
          milestones={milestones}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      </Suspense>
    </div>
  );
}
