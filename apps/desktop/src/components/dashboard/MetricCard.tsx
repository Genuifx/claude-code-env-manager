import type { LucideIcon } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: number;
  formatValue: (animated: number) => string;
  sublabel?: string;
  sublabelColor?: string;
  borderAlert?: boolean;
  onClick: () => void;
}

export function MetricCard({
  icon: Icon,
  iconColor,
  label,
  value,
  formatValue,
  sublabel,
  sublabelColor,
  borderAlert,
  onClick,
}: MetricCardProps) {
  const animated = useCountUp(value);

  return (
    <div
      className={cn(
        'stat-card glass-noise text-card-foreground p-3.5 cursor-pointer interactive-card group',
        borderAlert && 'border-destructive/30'
      )}
      onClick={onClick}
    >
      {/* Icon + label row */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className={cn(
          'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
          'bg-white/[0.06] group-hover:bg-white/[0.10] transition-colors'
        )}>
          <Icon className={cn('w-3.5 h-3.5', iconColor)} />
        </div>
        <span className="text-2xs font-medium text-muted-foreground/80 uppercase tracking-wider truncate">
          {label}
        </span>
      </div>

      {/* Value */}
      <div className="gradient-text text-xl font-bold tabular-nums leading-none mb-1">
        {formatValue(animated)}
      </div>

      {/* Sublabel */}
      {sublabel && (
        <div className={cn('text-2xs mt-1 truncate opacity-70', sublabelColor || 'text-muted-foreground')}>
          {sublabel}
        </div>
      )}
    </div>
  );
}
