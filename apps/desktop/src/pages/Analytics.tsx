// apps/desktop/src/pages/Analytics.tsx
import { useEffect, useState, useMemo } from 'react';
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
  generateMockDailyActivity,
} from '@/lib/mockAnalytics';
import type { ChartDataPoint } from '@/types/analytics';

type TimeGranularity = 'hour' | 'day' | 'week' | 'month';

export function Analytics() {
  const { usageStats, milestones, continuousUsageDays, setUsageStats, setMilestones, setContinuousUsageDays } =
    useAppStore();

  // Granularity state lives here and is passed down to TokenChart
  const [granularity, setGranularity] = useState<TimeGranularity>('day');

  // TODO: Replace mock data with real Tauri commands (e.g., invoke('get_usage_stats'))
  // Currently using mock data as fallback until analytics backend is wired up.
  const isUsingMockData = true; // Set to false once real Tauri commands are integrated

  // Load mock data on mount (TODO: Replace with real Tauri commands)
  useEffect(() => {
    if (!usageStats) {
      setUsageStats(generateMockUsageStats());
      setMilestones(generateMockMilestones());
      setContinuousUsageDays(42);
    }
  }, [usageStats, setUsageStats, setMilestones, setContinuousUsageDays]);

  if (!usageStats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500 dark:text-slate-400">加载中...</div>
      </div>
    );
  }

  // Prepare all sorted daily history entries for chart data
  const allSortedEntries = Object.entries(usageStats.dailyHistory)
    .sort(([a], [b]) => a.localeCompare(b));

  // Transform a list of [date, usage] entries into ChartDataPoint[]
  const toChartPoints = (
    entries: [string, { inputTokens: number; outputTokens: number }][],
    dateFormat: Intl.DateTimeFormatOptions,
  ): ChartDataPoint[] =>
    entries.map(([date, usage]) => ({
      date: new Date(date).toLocaleDateString('zh-CN', dateFormat),
      // TODO: Per-env breakdown requires backend support (Bug #22). Using ratio split as placeholder.
      official: Math.floor((usage.inputTokens + usage.outputTokens) * 0.6),
      'GLM-4': Math.floor((usage.inputTokens + usage.outputTokens) * 0.25),
      DeepSeek: Math.floor((usage.inputTokens + usage.outputTokens) * 0.15),
    }));

  // Aggregate entries by a grouping key and return aggregated entries
  const aggregateEntries = (
    entries: [string, { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreationTokens: number; cost: number }][],
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

  // Build chart data based on granularity (Bug #23 fix)
  const chartData: ChartDataPoint[] = useMemo(() => {
    switch (granularity) {
      case 'hour':
        // Show last 24 entries (simulating hourly view with available daily data)
        return toChartPoints(
          allSortedEntries.slice(-24) as [string, { inputTokens: number; outputTokens: number }][],
          { month: 'short', day: 'numeric' },
        );
      case 'day':
        // Show last 7 days (default)
        return toChartPoints(
          allSortedEntries.slice(-7) as [string, { inputTokens: number; outputTokens: number }][],
          { month: 'short', day: 'numeric' },
        );
      case 'week': {
        // Aggregate by ISO week, show last 4 weeks
        const weekEntries = aggregateEntries(
          allSortedEntries as [string, { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreationTokens: number; cost: number }][],
          (dateStr) => {
            const d = new Date(dateStr);
            // Get ISO week number
            const jan1 = new Date(d.getFullYear(), 0, 1);
            const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
            return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
          },
        );
        return weekEntries.slice(-4).map(([weekKey, usage]) => ({
          date: weekKey,
          official: Math.floor((usage.inputTokens + usage.outputTokens) * 0.6),
          'GLM-4': Math.floor((usage.inputTokens + usage.outputTokens) * 0.25),
          DeepSeek: Math.floor((usage.inputTokens + usage.outputTokens) * 0.15),
        }));
      }
      case 'month': {
        // Aggregate by month, show all available months
        const monthEntries = aggregateEntries(
          allSortedEntries as [string, { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreationTokens: number; cost: number }][],
          (dateStr) => dateStr.slice(0, 7), // YYYY-MM
        );
        return monthEntries.map(([monthKey, usage]) => ({
          date: new Date(monthKey + '-01').toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' }),
          official: Math.floor((usage.inputTokens + usage.outputTokens) * 0.6),
          'GLM-4': Math.floor((usage.inputTokens + usage.outputTokens) * 0.25),
          DeepSeek: Math.floor((usage.inputTokens + usage.outputTokens) * 0.15),
        }));
      }
      default:
        return [];
    }
  }, [granularity, allSortedEntries]);

  const environments = ['official', 'GLM-4', 'DeepSeek'];

  // Bug #21 fix: Calculate real week-over-week change from dailyHistory data
  // instead of using fake multiplier-based percentages
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

    // If no previous week data, return null to indicate unavailable
    const tokenPct = prevWeekEntries.length > 0 && prevWeekTokens > 0
      ? ((thisWeekTokens - prevWeekTokens) / prevWeekTokens) * 100
      : null;
    const costPct = prevWeekEntries.length > 0 && prevWeekCost > 0
      ? ((thisWeekCost - prevWeekCost) / prevWeekCost) * 100
      : null;

    return { tokenPct, costPct };
  };

  const { tokenPct: tokenChange, costPct: costChange } = computeWeekOverWeekChange();

  const dailyActivities = generateMockDailyActivity();

  // Bug #24 fix: Only show "新纪录!" if continuousUsageDays >= 30
  const streakLabel = continuousUsageDays >= 30
    ? '🎉 新纪录!'
    : '继续保持!';

  return (
    <div className="p-6 space-y-6">
      {/* Demo data banner (Bugs #20, #26) */}
      {isUsingMockData && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <span>📊</span>
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
            🔥 {continuousUsageDays} 天
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
          environments={environments}
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
