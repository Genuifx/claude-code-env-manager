// apps/desktop/src/components/analytics/TokenChart.tsx
import { Fragment, memo, useMemo } from 'react';
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
}

const AMBER = 'hsl(38 92% 50%)';
const AMBER_LIGHT = 'hsl(45 93% 58%)';

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

  const totalUsage = breakdownRows.length > 0
    ? breakdownRows.reduce((sum, [, value]) => sum + value, 0)
    : seriesRows.reduce((sum, item) => sum + item.value, 0);

  const resolveSeriesLabel = (item: TokenTooltipPayloadItem) => {
    const rawLabel = typeof item.name === 'string' && item.name.length > 0
      ? item.name
      : typeof item.dataKey === 'string'
        ? item.dataKey
        : '';

    return rawLabel === 'Tokens' ? t('analytics.totalTokens') : rawLabel;
  };

  return (
    <div className="min-w-[196px] rounded-[24px] border border-white/45 bg-[hsl(var(--surface-overlay)/0.96)] px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="text-[13px] font-medium tracking-[-0.01em] text-foreground">
          {label}
        </div>
        <div className="text-right text-[18px] font-semibold tracking-[-0.02em] tabular-nums text-[hsl(38_92%_50%)]">
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
          ? breakdownRows.map(([model, value]) => ({ label: model, value, color: AMBER }))
          : seriesRows.map((item) => ({
              label: resolveSeriesLabel(item),
              value: item.value,
              color: item.color ?? AMBER,
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
            <span className="text-right text-[15px] font-semibold tracking-[-0.01em] tabular-nums text-[hsl(38_92%_50%)]">
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
}: TokenChartProps) {
  const dataKey = seriesKeys[0] ?? 'Tokens';
  const yAxisWidth = useMemo(() => {
    const values = data
      .map((point) => point[dataKey])
      .filter((value): value is number => typeof value === 'number');

    return getYAxisWidth(values, formatTokenAxisValue);
  }, [data, dataKey]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ left: 8, top: 8, right: 8 }}>
        <defs>
          <linearGradient id="amber-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={AMBER_LIGHT} stopOpacity={0.35} />
            <stop offset="95%" stopColor={AMBER} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          className="text-xs text-muted-foreground"
        />
        <YAxis
          className="text-xs text-muted-foreground"
          tickFormatter={formatTokenAxisValue}
          domain={[0, 'auto']}
          width={yAxisWidth}
        />
        <Tooltip
          cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '4 4', strokeOpacity: 0.9 }}
          content={<TokenTooltipContent />}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={AMBER}
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#amber-gradient)"
          isAnimationActive={animate}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});
