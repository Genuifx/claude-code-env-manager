// apps/desktop/src/components/analytics/TokenChart.tsx
import { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import type { ChartDataPoint } from '@/types/analytics';

type ChartType = 'line' | 'bar';
type TimeGranularity = 'hour' | 'day' | 'week' | 'month';

interface TokenChartProps {
  data: ChartDataPoint[];
  environments: string[];
  /** Controlled granularity from parent (Bug #23 fix) */
  granularity: TimeGranularity;
  /** Callback when user changes granularity */
  onGranularityChange: (g: TimeGranularity) => void;
}

const COLORS = {
  official: '#3b82f6',
  'GLM-4': '#10b981',
  DeepSeek: '#8b5cf6',
  KIMI: '#f59e0b',
  MiniMax: '#ec4899',
};

export function TokenChart({ data, environments, granularity, onGranularityChange }: TokenChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line');

  const Chart = chartType === 'line' ? LineChart : BarChart;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={granularity === 'hour' ? 'default' : 'outline'}
            onClick={() => onGranularityChange('hour')}
          >
            小时
          </Button>
          <Button
            size="sm"
            variant={granularity === 'day' ? 'default' : 'outline'}
            onClick={() => onGranularityChange('day')}
          >
            日
          </Button>
          <Button
            size="sm"
            variant={granularity === 'week' ? 'default' : 'outline'}
            onClick={() => onGranularityChange('week')}
          >
            周
          </Button>
          <Button
            size="sm"
            variant={granularity === 'month' ? 'default' : 'outline'}
            onClick={() => onGranularityChange('month')}
          >
            月
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={chartType === 'line' ? 'default' : 'outline'}
            onClick={() => setChartType('line')}
          >
            📈 折线图
          </Button>
          <Button
            size="sm"
            variant={chartType === 'bar' ? 'default' : 'outline'}
            onClick={() => setChartType('bar')}
          >
            📊 柱状图
          </Button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <Chart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis
            dataKey="date"
            className="text-xs text-slate-600 dark:text-slate-400"
          />
          <YAxis className="text-xs text-slate-600 dark:text-slate-400" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          />
          <Legend />
          {environments.map((env) => {
            const color = COLORS[env as keyof typeof COLORS] || '#6b7280';
            return chartType === 'line' ? (
              <Line
                key={env}
                type="monotone"
                dataKey={env}
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            ) : (
              <Bar key={env} dataKey={env} fill={color} />
            );
          })}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
