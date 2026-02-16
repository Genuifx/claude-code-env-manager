import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';

interface HeroMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  formatValue: (animated: number) => string;
  sublabel?: string;
  trend?: string;
  onClick: () => void;
}

export function HeroMetricCard({
  icon: Icon,
  label,
  value,
  formatValue,
  sublabel,
  trend,
  onClick,
}: HeroMetricCardProps) {
  const animated = useCountUp(value);

  // Parse trend to determine direction
  const isPositiveTrend = trend && (trend.startsWith('+') || !trend.startsWith('-'));
  const isNegativeTrend = trend && trend.startsWith('-');

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl cursor-pointer interactive-card group',
        'bg-gradient-to-br from-primary/[0.08] via-transparent to-chart-2/[0.04]',
        'border border-white/[0.08]',
        'backdrop-blur-[40px] backdrop-saturate-[180%]',
        'p-5',
        'transition-all duration-200'
      )}
      onClick={onClick}
    >
      {/* Subtle ambient glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/[0.15] rounded-full blur-[60px] pointer-events-none" />

      {/* Top row: icon + label */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            'bg-primary/[0.12] group-hover:bg-primary/[0.18] transition-colors'
          )}>
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-widest">
            {label}
          </span>
        </div>

        {/* Trend badge */}
        {trend && (
          <div className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold',
            isPositiveTrend && 'bg-success/[0.12] text-success',
            isNegativeTrend && 'bg-destructive/[0.12] text-destructive',
            !isPositiveTrend && !isNegativeTrend && 'bg-muted/[0.12] text-muted-foreground'
          )}>
            {isPositiveTrend && <TrendingUp className="w-3 h-3" />}
            {isNegativeTrend && <TrendingDown className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>

      {/* Big value */}
      <div className="relative">
        <div className="text-4xl font-bold tabular-nums tracking-tight gradient-text font-mono">
          {formatValue(animated)}
        </div>

        {/* Sublabel */}
        {sublabel && (
          <div className="text-sm text-muted-foreground/60 mt-1.5 font-medium">
            {sublabel}
          </div>
        )}
      </div>

      {/* Hover indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
