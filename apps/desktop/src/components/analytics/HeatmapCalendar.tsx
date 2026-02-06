// apps/desktop/src/components/analytics/HeatmapCalendar.tsx
import type { DailyActivity } from '@/types/analytics';

interface HeatmapCalendarProps {
  activities: DailyActivity[];
}

const LEVEL_COLORS = {
  0: 'bg-slate-100 dark:bg-slate-800',
  1: 'bg-green-200 dark:bg-green-900/40',
  2: 'bg-green-400 dark:bg-green-700/60',
  3: 'bg-green-600 dark:bg-green-600/80',
  4: 'bg-green-800 dark:bg-green-500',
};

export function HeatmapCalendar({ activities }: HeatmapCalendarProps) {
  // Group activities by week
  const weeks: DailyActivity[][] = [];
  let currentWeek: DailyActivity[] = [];

  activities.forEach((activity, index) => {
    currentWeek.push(activity);
    if (currentWeek.length === 7 || index === activities.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  // Get month labels
  const getMonthLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short' });
  };

  const months = Array.from(
    new Set(activities.map((a) => getMonthLabel(a.date)))
  );

  return (
    <div className="space-y-4">
      {/* Month Labels */}
      <div className="flex gap-1 text-xs text-slate-600 dark:text-slate-400 pl-12">
        {months.map((month, i) => (
          <div key={i} className="flex-1 text-center">
            {month}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex gap-1">
        {/* Day Labels */}
        <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400 justify-around">
          <div>Mon</div>
          <div>Wed</div>
          <div>Fri</div>
        </div>

        {/* Heatmap */}
        <div className="flex gap-1 flex-1 overflow-x-auto">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((activity) => (
                <div
                  key={activity.date}
                  className={`w-3 h-3 rounded-sm ${
                    LEVEL_COLORS[activity.level]
                  } hover:ring-2 hover:ring-slate-400 dark:hover:ring-slate-500 cursor-pointer transition-all`}
                  title={`${activity.date}: ${activity.tokens.toLocaleString()} tokens, $${activity.cost.toFixed(3)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span>少量</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`w-3 h-3 rounded-sm ${
              LEVEL_COLORS[level as keyof typeof LEVEL_COLORS]
            }`}
          />
        ))}
        <span>大量</span>
      </div>
    </div>
  );
}
