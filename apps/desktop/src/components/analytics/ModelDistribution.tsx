import { memo, useMemo } from 'react';
import type { TokenUsageWithCost } from '@/types/analytics';
import { useLocale } from '@/locales';

interface ModelDistributionProps {
  byModel: Record<string, TokenUsageWithCost>;
}

/** Purple palette at descending opacity — cohesive with the other charts. */
const BAR_COLORS = [
  'hsl(var(--chart-4))',
  'hsl(var(--chart-4) / 0.72)',
  'hsl(var(--chart-4) / 0.50)',
  'hsl(var(--chart-4) / 0.34)',
  'hsl(var(--chart-4) / 0.20)',
];

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(1)}B`;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

export const ModelDistribution = memo(function ModelDistribution({ byModel }: ModelDistributionProps) {
  const { t } = useLocale();

  const models = useMemo(() => {
    const entries = Object.entries(byModel);
    const totalTokens = entries.reduce(
      (sum, [, usage]) => sum + usage.inputTokens + usage.outputTokens,
      0,
    );

    return entries
      .map(([name, usage]) => {
        const tokens = usage.inputTokens + usage.outputTokens;
        const percentage = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0;
        return { name, tokens, percentage };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }, [byModel]);

  if (models.length === 0) {
    return (
      <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">
        {t('analytics.noDataYet')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {models.map(({ name, tokens, percentage }, index) => (
        <div key={name} className="group cursor-default">
          {/* Label row */}
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 max-w-[60%]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: BAR_COLORS[index] ?? BAR_COLORS[BAR_COLORS.length - 1] }}
              />
              <span
                className="text-[13px] font-medium text-foreground truncate"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}
              >
                {name}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-xs tabular-nums text-muted-foreground"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                {formatTokenCount(tokens)}
              </span>
              <span
                className="text-[13px] font-semibold tabular-nums text-foreground"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}
              >
                {percentage.toFixed(1)}%
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2.5 overflow-hidden rounded-full bg-[hsl(var(--border-subtle))]">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out group-hover:brightness-110"
              style={{
                width: `${percentage}%`,
                backgroundColor: BAR_COLORS[index] ?? BAR_COLORS[BAR_COLORS.length - 1],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
});
