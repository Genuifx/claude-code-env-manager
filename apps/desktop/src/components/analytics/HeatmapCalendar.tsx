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

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function HeatmapCalendar({ activities }: HeatmapCalendarProps) {
  // Bug #25 fix: Group by actual weeks (columns) aligned to weekday (rows)
  // Each column = one week, each row = a day of the week (Mon-Sun)
  const weeks: (DailyActivity | null)[][] = [];
  let currentWeek: (DailyActivity | null)[] = [];

  // Pad the first week with nulls for days before the first activity
  if (activities.length > 0) {
    const firstDay = new Date(activities[0].date).getDay();
    // Convert Sunday=0 to Monday-based: Mon=0, Tue=1, ..., Sun=6
    const mondayBasedDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < mondayBasedDay; i++) {
      currentWeek.push(null);
    }
  }

  activities.forEach((activity) => {
    currentWeek.push(activity);
    if (currentWeek.length === 7) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  // Pad the last week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  // Get month labels positioned at the correct week columns
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = '';
  weeks.forEach((week, weekIndex) => {
    // Find the first non-null activity in this week
    const firstActivity = week.find((a) => a !== null);
    if (firstActivity) {
      const month = new Date(firstActivity.date).toLocaleDateString('zh-CN', { month: 'short' });
      if (month !== lastMonth) {
        monthLabels.push({ label: month, weekIndex });
        lastMonth = month;
      }
    }
  });

  return (
    <div className="space-y-4">
      {/* Month Labels */}
      <div className="flex gap-1 text-xs text-slate-600 dark:text-slate-400 pl-12 relative" style={{ height: '16px' }}>
        {monthLabels.map(({ label, weekIndex }, i) => (
          <div
            key={i}
            className="absolute text-xs"
            style={{ left: `calc(48px + ${weekIndex} * (12px + 4px))` }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex gap-1">
        {/* Day Labels — all 7 days (Mon through Sun) */}
        <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400 w-10 shrink-0">
          {DAY_LABELS.map((label) => (
            <div key={label} className="h-3 flex items-center">
              {label}
            </div>
          ))}
        </div>

        {/* Heatmap — each week is a column, each row is a weekday */}
        <div className="flex gap-1 flex-1 overflow-x-auto">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((activity, dayIndex) =>
                activity ? (
                  <div
                    key={activity.date}
                    className={`w-3 h-3 rounded-sm ${
                      LEVEL_COLORS[activity.level]
                    } hover:ring-2 hover:ring-slate-400 dark:hover:ring-slate-500 cursor-pointer transition-all`}
                    title={`${activity.date}: ${activity.tokens.toLocaleString()} tokens, $${activity.cost.toFixed(3)}`}
                  />
                ) : (
                  // Invisible spacer for null padding cells
                  <div key={`empty-${weekIndex}-${dayIndex}`} className="w-3 h-3" />
                ),
              )}
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
