// apps/desktop/src/components/analytics/HeatmapCalendar.tsx
import { useMemo } from 'react';
import type { DailyActivity } from '@/types/analytics';
import { useLocale } from '@/locales';
import { formatTokens } from '@/lib/utils';

interface HeatmapCalendarProps {
  activities: DailyActivity[];
  compact?: boolean;
}

const LEVEL_STYLES: Record<number, React.CSSProperties> = {
  0: { backgroundColor: 'hsl(var(--heatmap-0))' },
  1: { backgroundColor: 'hsl(var(--heatmap-1))' },
  2: { backgroundColor: 'hsl(var(--heatmap-2))' },
  3: { backgroundColor: 'hsl(var(--heatmap-3))' },
  4: { backgroundColor: 'hsl(var(--heatmap-4))' },
};

export function HeatmapCalendar({ activities, compact = false }: HeatmapCalendarProps) {
  const { lang, t } = useLocale();
  const dateLocale = lang === 'zh' ? 'zh-CN' : 'en-US';

  const dayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(dateLocale, { weekday: 'short' });
    // Generate Mon-Sun labels using known dates (2024-01-01 is Monday)
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(2024, 0, 1 + i);
      return formatter.format(date);
    });
  }, [dateLocale]);

  const formatTooltip = (activity: DailyActivity): string => {
    const date = new Date(activity.date).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const tokens = formatTokens(activity.tokens);
    const cost = `$${activity.cost.toFixed(2)}`;
    return `${date}, ${tokens} tokens, ${cost}`;
  };

  // Memoize the expensive week/month computation
  const { weeks, monthLabels } = useMemo(() => {
    const computedWeeks: (DailyActivity | null)[][] = [];
    let currentWeek: (DailyActivity | null)[] = [];

    // Pad the first week with nulls for days before the first activity
    if (activities.length > 0) {
      const firstDay = new Date(activities[0].date).getDay();
      const mondayBasedDay = firstDay === 0 ? 6 : firstDay - 1;
      for (let i = 0; i < mondayBasedDay; i++) {
        currentWeek.push(null);
      }
    }

    activities.forEach((activity) => {
      currentWeek.push(activity);
      if (currentWeek.length === 7) {
        computedWeeks.push([...currentWeek]);
        currentWeek = [];
      }
    });

    // Pad the last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      computedWeeks.push(currentWeek);
    }

    // Get month labels positioned at the correct week columns
    const computedMonthLabels: { label: string; weekIndex: number }[] = [];
    let lastMonth = '';
    computedWeeks.forEach((week, weekIndex) => {
      const firstActivity = week.find((a) => a !== null);
      if (firstActivity) {
        const month = new Date(firstActivity.date).toLocaleDateString(dateLocale, { month: 'short' });
        if (month !== lastMonth) {
          computedMonthLabels.push({ label: month, weekIndex });
          lastMonth = month;
        }
      }
    });

    return { weeks: computedWeeks, monthLabels: computedMonthLabels };
  }, [activities, dateLocale]);

  const cellSize = compact ? 'w-3 h-3' : 'w-3 h-3';
  const gapClass = compact ? 'gap-[3px]' : 'gap-[3px]';
  const displayWeeks = compact ? weeks.slice(-12) : weeks;

  return (
    <div className="heatmap-enter">
      {/* Month Labels — hide in compact mode */}
      {!compact && (
        <div className="relative mb-2 text-xs text-muted-foreground" style={{ height: '16px' }}>
          {monthLabels.map(({ label, weekIndex }, i) => (
            <div
              key={i}
              className="absolute text-xs"
              style={{ left: `calc(2.5rem + 3px + ${weekIndex} * (12px + 3px))` }}
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
          <div className="flex flex-col gap-[3px] text-xs text-muted-foreground w-10 shrink-0">
            {dayLabels.map((label) => (
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
                    role="button"
                    tabIndex={0}
                    aria-label={formatTooltip(activity)}
                    className={`${cellSize} rounded-sm hover:brightness-110 hover:ring-2 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer transition-[filter,box-shadow] duration-150 relative`}
                    style={LEVEL_STYLES[activity.level]}
                    title={formatTooltip(activity)}
                  >
                    {/* Invisible touch target expander */}
                    <span className="absolute -inset-1.5" aria-hidden="true" />
                  </div>
                ) : (
                  <div key={`empty-${weekIndex}-${dayIndex}`} className={cellSize} />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend — hide in compact mode */}
      {!compact && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t('analytics.legendLow')}</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className="w-3 h-3 rounded-sm"
              style={LEVEL_STYLES[level]}
            />
          ))}
          <span>{t('analytics.legendHigh')}</span>
        </div>
      )}
    </div>
  );
}
