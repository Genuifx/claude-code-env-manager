// apps/desktop/src/pages/Analytics.tsx
import { useEffect, useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
import type { ChartDataPoint, DailyActivity, UsageStats } from '@/types/analytics';

type TimeGranularity = 'hour' | 'day' | 'week' | 'month';

export function Analytics() {
  const { usageStats, milestones, continuousUsageDays, setUsageStats, setMilestones, setContinuousUsageDays } =
    useAppStore();

  // Granularity state lives here and is passed down to TokenChart
  const [granularity, setGranularity] = useState<TimeGranularity>('day');

  // Dynamic mock indicator — true only when real data failed to load
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  // Load real data from Tauri backend, fall back to mock only if it fails
  useEffect(() => {
    const loadRealData = async () => {
      try {
        const stats = await invoke<UsageStats>('get_usage_stats');
        setUsageStats(stats);
        setIsUsingMockData(false);

        // Load continuous usage days
        try {
          const days = await invoke<number>('get_continuous_usage_days');
          setContinuousUsageDays(days);
        } catch {
          setContinuousUsageDays(0);
        }

        // Generate milestones from real data
        const totalTokens = stats.total.inputTokens + stats.total.outputTokens;
        const totalCost = stats.total.cost;
        setMilestones([
          {
            id: 'tokens-100k', type: 'tokens', title: '100K Tokens',
            description: '累计使用 100K tokens', target: 100000,
            current: totalTokens, achieved: totalTokens >= 100000,
          },
          {
            id: 'tokens-1m', type: 'tokens', title: '1M Tokens',
            description: '累计使用 1M tokens', target: 1000000,
            current: totalTokens, achieved: totalTokens >= 1000000,
          },
          {
            id: 'tokens-5m', type: 'tokens', title: '5M Tokens',
            description: '累计使用 5M tokens', target: 5000000,
            current: totalTokens, achieved: totalTokens >= 5000000,
          },
          {
            id: 'cost-10', type: 'cost', title: '第一个 $10',
            description: '累计消费 $10', target: 10,
            current: totalCost, achieved: totalCost >= 10,
          },
          {
            id: 'cost-100', type: 'cost', title: '$100 消费',
            description: '累计消费 $100', target: 100,
            current: totalCost, achieved: totalCost >= 100,
          },
          {
            id: 'streak-7', type: 'streak', title: '7 天连续',
            description: '连续使用 7 天', target: 7,
            current: continuousUsageDays, achieved: continuousUsageDays >= 7,
          },
        ]);
      } catch {
        // Tauri backend not available — fall back to mock data
        if (!usageStats) {
          setUsageStats(generateMockUsageStats());
          setMilestones(generateMockMilestones());
          setContinuousUsageDays(42);
          setIsUsingMockData(true);
        }
      }
    };

    loadRealData();
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
        date: new Date(date).toLocaleDateString('zh-CN', dateFormat),
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
          new Date(key + '-01').toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' }),
        );
      }
      default:
        return [];
    }
  }, [granularity, usageStats]);

  // Loading state — after all hooks
  if (!usageStats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500 dark:text-slate-400">加载中...</div>
      </div>
    );
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

  // Bug #24 fix: Only show "新纪录!" if continuousUsageDays >= 30
  const streakLabel = continuousUsageDays >= 30
    ? '新纪录!'
    : '继续保持!';

  return (
    <div className="page-transition-enter space-y-6">
      {/* Demo data banner (Bugs #20, #26) */}
      {isUsingMockData && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <span>
            <strong>Demo 数据</strong> — 当前显示的是模拟数据。连接 Tauri 后端后将展示真实统计信息。
          </span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Analytics
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Token 使用统计和成本分析
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Token (本周)
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
              <div className="text-xs text-slate-400">—</div>
            )}
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {((usageStats.week.inputTokens + usageStats.week.outputTokens) / 1000).toFixed(1)}K
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            较上周
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              费用 (本周)
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
              <div className="text-xs text-slate-400">—</div>
            )}
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            ${usageStats.week.cost.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            较上周
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            连续使用
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {continuousUsageDays} 天
          </div>
          <div className="text-xs text-green-600 dark:text-green-400">
            {streakLabel}
          </div>
        </Card>
      </div>

      {/* Token Consumption Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Token 消耗分布
        </h3>
        <TokenChart
          data={chartData}
          environments={chartSeriesKeys}
          granularity={granularity}
          onGranularityChange={setGranularity}
        />
      </Card>

      {/* Model Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          模型分布
        </h3>
        <ModelDistribution byModel={usageStats.byModel} />
      </Card>

      {/* Activity Heatmap */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          活跃热力图 (按日历)
        </h3>
        <HeatmapCalendar activities={dailyActivities} />
      </Card>

      {/* Milestones */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          里程碑
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {milestones.map((milestone) => (
            <MilestoneCard key={milestone.id} milestone={milestone} />
          ))}
        </div>
      </div>
    </div>
  );
}
