import { memo, useMemo } from 'react';
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
import { formatTokenAxisValue, formatTokens, getYAxisWidth } from '@/lib/utils';
import type { TokenUsageWithCost } from '@/types/analytics';

interface DailyTokenBarProps {
  dailyHistory: Record<string, TokenUsageWithCost>;
}

interface DailyTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ value?: number }>;
}

function DailyTooltip({ active, label, payload }: DailyTooltipProps) {
  if (!active || !payload?.length) return null;

  const value = payload[0]?.value ?? 0;

  return (
    <div
      className="min-w-[140px] rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--surface))] px-4 py-3 shadow-sm"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <div className="mb-2 text-[13px] font-medium tracking-[-0.01em] text-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: 'hsl(var(--chart-4))' }}
        />
        <span
          className="text-[17px] font-semibold tabular-nums tracking-[-0.02em]"
          style={{ color: 'hsl(var(--chart-4))' }}
        >
          {formatTokens(value)}
        </span>
      </div>
    </div>
  );
}

export const DailyTokenBar = memo(function DailyTokenBar({ dailyHistory }: DailyTokenBarProps) {
  const { lang } = useLocale();
  const dateLocale = lang === 'zh' ? 'zh-CN' : 'en-US';

  const chartData = useMemo(() => {
    const entries = Object.entries(dailyHistory)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14);

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
      <BarChart data={chartData} margin={{ left: 4, top: 12, right: 4, bottom: 4 }}>
        <CartesianGrid
          horizontal={true}
          vertical={false}
          strokeOpacity={0.4}
          className="stroke-border"
        />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          dy={8}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickFormatter={formatTokenAxisValue}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          domain={[0, 'auto']}
          width={yAxisWidth}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--chart-4) / 0.08)', radius: 4 }}
          content={<DailyTooltip />}
        />
        <Bar
          dataKey="tokens"
          fill="hsl(var(--chart-4))"
          radius={[5, 5, 0, 0]}
          isAnimationActive={false}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  );
});
