// apps/desktop/src/components/workspace/StreakChart.tsx
// Compact area chart tailored for the streak usage popover.
// Forked from analytics/TokenChart.tsx with these differences:
//   - No Y-axis (trend matters, absolute numbers don't, in a glance view)
//   - No CartesianGrid (popover is too narrow for gridlines to add value)
//   - Shorter X-axis labels: "M/D" via bucketKey, not the pre-formatted date
//   - Taller default height (160 vs 140) so peaks read clearly
//   - Softer gradient stops for less visual noise in a small surface
//   - Minimal tooltip: just date + total tokens, no per-model breakdown
import { memo, useId, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ChartDataPoint } from '@/types/analytics';
import { useLocale } from '@/locales';
import { formatTokens } from '@/lib/utils';

interface StreakChartProps {
  data: ChartDataPoint[];
  height?: number;
}

interface StreakTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: ChartDataPoint }>;
}

function StreakTooltip({ active, payload }: StreakTooltipProps) {
  const { t } = useLocale();
  const point = payload?.[0]?.payload;
  if (!active || !point || typeof point.Tokens !== 'number') return null;

  return (
    <div className="min-w-[120px] rounded-lg border border-[hsl(var(--glass-border-light))] bg-[hsl(var(--surface))] px-3 py-2 shadow-sm">
      <div className="text-[11px] text-muted-foreground">{point.bucketKey}</div>
      <div
        className="mt-0.5 text-[14px] font-semibold tabular-nums"
        style={{ color: 'hsl(var(--chart-4))' }}
      >
        {formatTokens(point.Tokens)}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
        {t('analytics.totalTokens')}
      </div>
    </div>
  );
}

function formatShortDate(bucketKey: string, lang: 'zh' | 'en'): string {
  // bucketKey is YYYY-MM-DD
  const [, month, day] = bucketKey.split('-');
  const m = Number(month);
  const d = Number(day);
  return lang === 'zh' ? `${m}/${d}` : `${m}/${d}`;
}

export const StreakChart = memo(function StreakChart({
  data,
  height = 160,
}: StreakChartProps) {
  const reactId = useId();
  const gradientId = `streak-chart-gradient-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { lang } = useLocale();

  const formattedData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        shortDate: formatShortDate(point.bucketKey, lang),
      })),
    [data, lang],
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formattedData} margin={{ left: 2, top: 8, right: 2, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.28} />
            <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="shortDate"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          dy={6}
          interval={0}
        />
        <Tooltip
          cursor={{ stroke: 'hsl(var(--chart-4) / 0.4)', strokeDasharray: '3 3', strokeOpacity: 0.8 }}
          content={<StreakTooltip />}
        />
        <Area
          type="monotone"
          dataKey="Tokens"
          stroke="hsl(var(--chart-4))"
          strokeWidth={1.75}
          fillOpacity={1}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: 'hsl(var(--chart-4))' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});
