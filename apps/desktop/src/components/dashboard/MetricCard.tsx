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
        'stat-card glass-noise text-card-foreground p-4 cursor-pointer interactive-card',
        borderAlert && 'border-destructive/30'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={cn('w-3.5 h-3.5', iconColor)} />
        <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider truncate">
          {label}
        </span>
      </div>
      <div className="gradient-text text-2xl font-bold tabular-nums leading-tight">
        {formatValue(animated)}
      </div>
      {sublabel && (
        <div className={cn('text-2xs mt-1.5 truncate', sublabelColor || 'text-muted-foreground')}>
          {sublabel}
        </div>
      )}
    </div>
  );
}
