// apps/desktop/src/components/analytics/HeatmapCalendar.tsx
import type { DailyActivity } from '@/types/analytics';
import { useLocale } from '@/locales';

interface HeatmapCalendarProps {
  activities: DailyActivity[];
  compact?: boolean;
}

const LEVEL_COLORS = {
  0: 'bg-muted/50',
  1: 'bg-primary/15',
  2: 'bg-primary/40',
  3: 'bg-primary/70',
  4: 'bg-primary',
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

export function HeatmapCalendar({ activities, compact = false }: HeatmapCalendarProps) {
  const { lang, t } = useLocale();
  const dateLocale = lang === 'zh' ? 'zh-CN' : 'en-US';

  const formatTooltip = (activity: DailyActivity): string => {
    const date = new Date(activity.date).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const tokens = formatTokens(activity.tokens);
    const cost = `$${activity.cost.toFixed(2)}`;
    return `${date} — ${tokens} tokens — ${cost}`;
  };
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
      const month = new Date(firstActivity.date).toLocaleDateString(dateLocale, { month: 'short' });
      if (month !== lastMonth) {
        monthLabels.push({ label: month, weekIndex });
        lastMonth = month;
      }
    }
  });

  const cellSize = compact ? 'w-2.5 h-2.5' : 'w-3 h-3';
  const gapClass = compact ? 'gap-0.5' : 'gap-1';
  const displayWeeks = compact ? weeks.slice(-12) : weeks;

  return (
    <div className={`heatmap-enter ${compact ? '' : 'space-y-4'}`}>
      {/* Month Labels — hide in compact mode */}
      {!compact && (
        <div className="flex gap-1 text-xs text-muted-foreground pl-12 relative" style={{ height: '16px' }}>
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
      )}

      {/* Calendar Grid */}
      <div className={`flex ${gapClass}`}>
        {/* Day Labels — hide in compact mode */}
        {!compact && (
          <div className="flex flex-col gap-1 text-xs text-muted-foreground w-10 shrink-0">
            {DAY_LABELS.map((label) => (
              <div key={label} className="h-3 flex items-center">
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Heatmap — each week is a column, each row is a weekday */}
        <div className={`flex ${gapClass} flex-1 overflow-x-auto`}>
          {displayWeeks.map((week, weekIndex) => (
            <div key={weekIndex} className={`flex flex-col ${gapClass}`}>
              {week.map((activity, dayIndex) =>
                activity ? (
                  <div
                    key={activity.date}
                    className={`${cellSize} rounded-sm ${
                      LEVEL_COLORS[activity.level]
                    } hover:brightness-110 hover:ring-2 hover:ring-primary/40 cursor-pointer transition-[filter,box-shadow] duration-150`}
                    title={formatTooltip(activity)}
                  />
                ) : (
                  // Invisible spacer for null padding cells
                  <div key={`empty-${weekIndex}-${dayIndex}`} className={cellSize} />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend — hide in compact mode */}
      {!compact && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t('analytics.legendLow')}</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`w-3 h-3 rounded-sm ${
                LEVEL_COLORS[level as keyof typeof LEVEL_COLORS]
              }`}
            />
          ))}
          <span>{t('analytics.legendHigh')}</span>
        </div>
      )}
    </div>
  );
}
