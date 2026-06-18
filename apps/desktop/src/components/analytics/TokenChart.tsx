// apps/desktop/src/components/analytics/TokenChart.tsx
import { Fragment, memo, useId, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ChartDataPoint } from '@/types/analytics';
import { useLocale } from '@/locales';
import { formatTokenAxisValue, formatTokens, getYAxisWidth } from '@/lib/utils';

interface TokenChartProps {
  data: ChartDataPoint[];
  seriesKeys: string[];
  animate?: boolean;
  height?: number;
  showAllTicks?: boolean;
}

interface TokenTooltipPayloadItem {
  color?: string;
  payload?: ChartDataPoint;
  dataKey?: string | number;
  name?: string;
  value?: number;
}

interface TokenTooltipContentProps {
  active?: boolean;
  label?: string;
  payload?: TokenTooltipPayloadItem[];
}

function TokenTooltipContent({ active, label, payload }: TokenTooltipContentProps) {
  const { t } = useLocale();
  const seriesRows = (payload ?? []).filter(
    (item): item is TokenTooltipPayloadItem & { value: number } => typeof item.value === 'number',
  );
  const breakdown = seriesRows[0]?.payload?.breakdown;
  const breakdownRows = breakdown
    ? Object.entries(breakdown)
        .filter(([, value]) => value > 0)
        .sort(([, left], [, right]) => right - left)
    : [];

  if (!active || (seriesRows.length === 0 && breakdownRows.length === 0)) {
    return null;
  }

  const chartTotalUsage = seriesRows.reduce((sum, item) => sum + item.value, 0);
  const totalUsage = seriesRows.length > 0
    ? chartTotalUsage
    : breakdownRows.reduce((sum, [, value]) => sum + value, 0);

  const resolveSeriesLabel = (item: TokenTooltipPayloadItem) => {
    const rawLabel = typeof item.name === 'string' && item.name.length > 0
      ? item.name
      : typeof item.dataKey === 'string'
        ? item.dataKey
        : '';

    return rawLabel === 'Tokens' ? t('analytics.totalTokens') : rawLabel;
  };

  return (
    <div
      className="min-w-[196px] rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--surface))] px-4 py-3 shadow-sm"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="text-[13px] font-medium tracking-[-0.01em] text-foreground">
          {label}
        </div>
        <div
          className="text-right text-[18px] font-semibold tracking-[-0.02em] tabular-nums"
          style={{ color: 'hsl(var(--chart-4))' }}
        >
          {formatTokens(totalUsage)}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/65">
          {t('analytics.tooltipModel')}
        </span>
        <span className="text-right text-[11px] uppercase tracking-[0.18em] text-muted-foreground/65">
          {t('analytics.tooltipUsage')}
        </span>
        {(breakdownRows.length > 0
          ? breakdownRows.map(([model, value]) => ({ label: model, value, color: 'hsl(var(--chart-4))' }))
          : seriesRows.map((item) => ({
              label: resolveSeriesLabel(item),
              value: item.value,
              color: item.color ?? 'hsl(var(--chart-4))',
            }))
        ).map((item) => (
          <Fragment key={`${item.label}-${item.value}`}>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium">{item.label}</span>
            </div>
            <span className="text-right text-[15px] font-semibold tracking-[-0.01em] tabular-nums" style={{ color: 'hsl(var(--chart-4))' }}>
              {formatTokens(item.value)}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export const TokenChart = memo(function TokenChart({
  data,
  seriesKeys,
  animate = false,
  height = 300,
  showAllTicks = false,
}: TokenChartProps) {
  const dataKey = seriesKeys[0] ?? 'Tokens';
  const reactId = useId();
  const gradientId = `chart-area-gradient-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const yAxisWidth = useMemo(() => {
    const values = data
      .map((point) => point[dataKey])
      .filter((value): value is number => typeof value === 'number');

    return getYAxisWidth(values, formatTokenAxisValue);
  }, [data, dataKey]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: 4, top: 12, right: 4, bottom: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.2} />
            <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
          interval={showAllTicks ? 0 : 'preserveStartEnd'}
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
          cursor={{ stroke: 'hsl(var(--chart-4) / 0.4)', strokeDasharray: '4 4', strokeOpacity: 0.9 }}
          content={<TokenTooltipContent />}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke="hsl(var(--chart-4))"
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#${gradientId})`}
          isAnimationActive={animate}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});
