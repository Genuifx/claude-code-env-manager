// apps/desktop/src/components/analytics/ModelDistribution.tsx
import type { TokenUsageWithCost } from '@/types/analytics';

interface ModelDistributionProps {
  byModel: Record<string, TokenUsageWithCost>;
}

const COLORS = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
];

export function ModelDistribution({ byModel }: ModelDistributionProps) {
  const models = Object.entries(byModel);
  const totalTokens = models.reduce(
    (sum, [, usage]) => sum + usage.inputTokens + usage.outputTokens,
    0
  );

  const modelsWithPercentage = models
    .map(([name, usage]) => {
      const tokens = usage.inputTokens + usage.outputTokens;
      const percentage = (tokens / totalTokens) * 100;
      return { name, usage, tokens, percentage };
    })
    .sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="space-y-3">
      {modelsWithPercentage.map(({ name, usage, percentage }, index) => (
        <div key={name} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {name}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                {percentage.toFixed(1)}%
              </span>
              <span className="font-semibold text-foreground">
                ${usage.cost.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${COLORS[index % COLORS.length]} transition-all duration-500`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
