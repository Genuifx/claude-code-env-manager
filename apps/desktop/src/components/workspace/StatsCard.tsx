import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: string;
  value: string | number;
  label: string;
  sublabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  accentColor?: 'emerald' | 'blue' | 'amber' | 'rose' | 'violet';
}

const accentColors = {
  emerald: 'from-chart-1 to-chart-2',
  blue: 'from-chart-3 to-chart-4',
  amber: 'from-primary to-chart-5',
  rose: 'from-destructive to-chart-5',
  violet: 'from-chart-4 to-chart-3',
};

const accentBg = {
  emerald: 'bg-chart-1/10',
  blue: 'bg-chart-3/10',
  amber: 'bg-primary/10',
  rose: 'bg-destructive/10',
  violet: 'bg-chart-4/10',
};

export function StatsCard({
  icon,
  value,
  label,
  sublabel,
  trend = 'neutral',
  accentColor = 'emerald'
}: StatsCardProps) {
  return (
    <div className="group relative bg-card rounded-2xl border border-border p-5 hover:shadow-xl hover:shadow-foreground/5 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
      {/* Gradient accent line */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity',
        accentColors[accentColor]
      )} />

      {/* Icon */}
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3',
        accentBg[accentColor]
      )}>
        {icon}
      </div>

      {/* Value */}
      <div className="text-2xl font-bold text-foreground tracking-tight">
        {value}
      </div>

      {/* Label */}
      <div className="text-sm text-muted-foreground mt-0.5">
        {label}
      </div>

      {/* Sublabel with trend */}
      {sublabel && (
        <div className={cn(
          'text-xs mt-2 font-medium',
          trend === 'up' && 'text-primary',
          trend === 'down' && 'text-destructive',
          trend === 'neutral' && 'text-muted-foreground'
        )}>
          {trend === 'up' && '↑ '}
          {trend === 'down' && '↓ '}
          {sublabel}
        </div>
      )}
    </div>
  );
}
