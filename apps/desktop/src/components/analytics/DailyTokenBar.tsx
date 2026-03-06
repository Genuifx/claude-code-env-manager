import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useLocale } from '@/locales';
import { formatTokenAxisValue, getYAxisWidth } from '@/lib/utils';
import type { TokenUsageWithCost } from '@/types/analytics';

interface DailyTokenBarProps {
  dailyHistory: Record<string, TokenUsageWithCost>;
}

export function DailyTokenBar({ dailyHistory }: DailyTokenBarProps) {
  const { lang } = useLocale();
  const dateLocale = lang === 'zh' ? 'zh-CN' : 'en-US';

  const chartData = useMemo(() => {
    const entries = Object.entries(dailyHistory)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14); // Last 14 days

    return entries.map(([date, usage]) => ({
      date: new Date(date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' }),
      tokens: usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheCreationTokens,
    }));
  }, [dailyHistory, dateLocale]);
  const yAxisWidth = useMemo(
    () => getYAxisWidth(chartData.map((point) => point.tokens), formatTokenAxisValue),
    [chartData],
  );

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ left: 8, top: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          className="text-xs text-muted-foreground"
          tick={{ fontSize: 11 }}
        />
        <YAxis
          className="text-xs text-muted-foreground"
          tickFormatter={formatTokenAxisValue}
          tick={{ fontSize: 11 }}
          domain={[0, 'auto']}
          width={yAxisWidth}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--surface-overlay))',
            border: '1px solid hsl(var(--glass-border-light) / 0.3)',
            borderRadius: '8px',
            backdropFilter: 'blur(12px)',
          }}
          formatter={(value: number | undefined) => [formatTokenAxisValue(value ?? 0), 'Tokens']}
        />
        <Bar
          dataKey="tokens"
          fill="hsl(var(--chart-1))"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
