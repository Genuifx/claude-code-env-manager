// apps/desktop/src/components/analytics/TokenChart.tsx
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

interface TokenChartProps {
  data: ChartDataPoint[];
  seriesKeys: string[];
}

const AMBER = 'hsl(38 92% 50%)';
const AMBER_LIGHT = 'hsl(45 93% 58%)';

const formatAxisValue = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
};

export function TokenChart({ data, seriesKeys }: TokenChartProps) {
  const dataKey = seriesKeys[0] ?? 'Tokens';

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
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
          tickFormatter={formatAxisValue}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--surface-overlay))',
            border: '1px solid hsl(var(--glass-border-light) / 0.3)',
            borderRadius: '8px',
            backdropFilter: 'blur(12px)',
          }}
          formatter={(value: number | undefined) => [formatAxisValue(value ?? 0), undefined]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={AMBER}
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#amber-gradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
