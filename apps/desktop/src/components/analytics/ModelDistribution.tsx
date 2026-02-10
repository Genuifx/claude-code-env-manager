import { useState, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector, Label } from 'recharts';
import type { TokenUsageWithCost } from '@/types/analytics';

interface ModelDistributionProps {
  byModel: Record<string, TokenUsageWithCost>;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function formatTotal(tokens: number): string {
  if (tokens >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(1)}B`;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius - 2}
      outerRadius={outerRadius + 4}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      style={{ filter: 'brightness(1.15)', transition: 'all 0.2s ease' }}
    />
  );
};

export function ModelDistribution({ byModel }: ModelDistributionProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const onPieEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  const onPieLeave = useCallback(() => {
    setActiveIndex(undefined);
  }, []);

  const models = Object.entries(byModel);
  const totalTokens = models.reduce(
    (sum, [, usage]) => sum + usage.inputTokens + usage.outputTokens,
    0
  );

  const modelsWithPercentage = models
    .map(([name, usage]) => {
      const tokens = usage.inputTokens + usage.outputTokens;
      const percentage = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0;
      return { name, usage, tokens, percentage };
    })
    .sort((a, b) => b.percentage - a.percentage);

  const pieData = modelsWithPercentage.map(({ name, tokens }) => ({
    name,
    value: tokens,
  }));

  return (
    <div className="flex items-start gap-4">
      {/* Donut */}
      <div className="w-[40%]">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              innerRadius="60%"
              outerRadius="80%"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              strokeWidth={0}
            >
              {pieData.map((_, index) => (
                <Cell
                  key={index}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
              <Label
                value={formatTotal(totalTokens)}
                position="center"
                className="text-lg font-bold fill-foreground"
              />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Model List */}
      <div className="w-[60%] space-y-2 py-2">
        {modelsWithPercentage.map(({ name, percentage }, index) => (
          <div key={name} className="flex items-center gap-2 text-sm">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            />
            <span className="font-medium text-foreground truncate flex-1">{name}</span>
            <span className="text-muted-foreground shrink-0">{percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
