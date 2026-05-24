import { memo, useMemo } from 'react';
import type { ModelBreakdownHistory, TokenUsageWithCost } from '@/types/analytics';
import { useLocale } from '@/locales';

interface ModelDistributionProps {
  /** Time-sliced model breakdown from backend. When provided, aggregates all visible buckets. */
  breakdown?: ModelBreakdownHistory;
  /** Fallback cumulative total when breakdown is not available. */
  byModel?: Record<string, TokenUsageWithCost>;
}

/** Purple palette at descending opacity — cohesive with the other charts. */
const BAR_COLORS = [
  'hsl(var(--chart-4))',
  'hsl(var(--chart-4) / 0.72)',
  'hsl(var(--chart-4) / 0.50)',
  'hsl(var(--chart-4) / 0.34)',
  'hsl(var(--chart-4) / 0.20)',
];

function sumTokens(usage: TokenUsageWithCost): number {
  return usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheCreationTokens;
}

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(1)}B`;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

export const ModelDistribution = memo(function ModelDistribution({ breakdown, byModel }: ModelDistributionProps) {
  const { t } = useLocale();

  const models = useMemo(() => {
    // Aggregate from time-sliced breakdown when available (links to chart granularity).
    if (breakdown && Object.keys(breakdown).length > 0) {
      const modelTotals = new Map<string, number>();

      for (const bucket of Object.values(breakdown)) {
        for (const [model, usage] of Object.entries(bucket)) {
          const tokens = sumTokens(usage);
          modelTotals.set(model, (modelTotals.get(model) ?? 0) + tokens);
        }
      }

      const totalTokens = Array.from(modelTotals.values()).reduce((sum, v) => sum + v, 0);

      return Array.from(modelTotals.entries())
        .map(([name, tokens]) => ({
          name,
          tokens,
          percentage: totalTokens > 0 ? (tokens / totalTokens) * 100 : 0,
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5);
    }

    // Fallback to cumulative byModel.
    const entries = Object.entries(byModel ?? {});
    const totalTokens = entries.reduce((sum, [, usage]) => sum + sumTokens(usage), 0);

    return entries
      .map(([name, usage]) => {
        const tokens = sumTokens(usage);
        const percentage = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0;
        return { name, tokens, percentage };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }, [breakdown, byModel]);

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
