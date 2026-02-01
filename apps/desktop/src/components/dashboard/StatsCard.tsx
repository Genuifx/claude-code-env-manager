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
  emerald: 'from-emerald-400 to-teal-500',
  blue: 'from-blue-400 to-indigo-500',
  amber: 'from-amber-400 to-orange-500',
  rose: 'from-rose-400 to-pink-500',
  violet: 'from-violet-400 to-purple-500',
};

const accentBg = {
  emerald: 'bg-emerald-500/10',
  blue: 'bg-blue-500/10',
  amber: 'bg-amber-500/10',
  rose: 'bg-rose-500/10',
  violet: 'bg-violet-500/10',
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
    <div className="group relative bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-5 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
      {/* Gradient accent line */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity',
        accentColors[accentColor]
      )} />

      {/* Icon */}
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3',
        accentBg[accentColor]
      )}>
        {icon}
      </div>

      {/* Value */}
      <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
        {value}
      </div>

      {/* Label */}
      <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
        {label}
      </div>

      {/* Sublabel with trend */}
      {sublabel && (
        <div className={cn(
          'text-xs mt-2 font-medium',
          trend === 'up' && 'text-emerald-500',
          trend === 'down' && 'text-rose-500',
          trend === 'neutral' && 'text-slate-400'
        )}>
          {trend === 'up' && '↑ '}
          {trend === 'down' && '↓ '}
          {sublabel}
        </div>
      )}
    </div>
  );
}
