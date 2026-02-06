// apps/desktop/src/components/analytics/ModelDistribution.tsx
import type { TokenUsageWithCost } from '@/types/analytics';

interface ModelDistributionProps {
  byModel: Record<string, TokenUsageWithCost>;
}

const COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
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
            <span className="font-medium text-slate-900 dark:text-white">
              {name}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-slate-600 dark:text-slate-400">
                {percentage.toFixed(1)}%
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                ${usage.cost.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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
