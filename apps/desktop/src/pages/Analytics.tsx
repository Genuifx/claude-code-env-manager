// apps/desktop/src/pages/Analytics.tsx
import { useEffect } from 'react';
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

export function Analytics() {
  const { usageStats, milestones, continuousUsageDays, setUsageStats, setMilestones, setContinuousUsageDays } =
    useAppStore();

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

  // Prepare chart data from daily history
  const chartData: ChartDataPoint[] = Object.entries(usageStats.dailyHistory)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7) // Last 7 days
    .map(([date, usage]) => ({
      date: new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      official: Math.floor((usage.inputTokens + usage.outputTokens) * 0.6),
      'GLM-4': Math.floor((usage.inputTokens + usage.outputTokens) * 0.25),
      DeepSeek: Math.floor((usage.inputTokens + usage.outputTokens) * 0.15),
    }));

  const environments = ['official', 'GLM-4', 'DeepSeek'];

  // Calculate week-over-week change
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const tokenChange = calculateChange(
    usageStats.week.inputTokens + usageStats.week.outputTokens,
    (usageStats.week.inputTokens + usageStats.week.outputTokens) * 0.85 // Mock previous week
  );

  const costChange = calculateChange(usageStats.week.cost, usageStats.week.cost * 0.87);

  const dailyActivities = generateMockDailyActivity();

  return (
    <div className="p-6 space-y-6">
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
            🎉 新纪录!
          </div>
        </Card>
      </div>

      {/* Token Consumption Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Token 消耗分布
        </h3>
        <TokenChart data={chartData} environments={environments} />
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
