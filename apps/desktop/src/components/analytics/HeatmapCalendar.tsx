// apps/desktop/src/components/analytics/HeatmapCalendar.tsx
import { useMemo } from 'react';
import type { DailyActivity } from '@/types/analytics';
import { useLocale } from '@/locales';
import { cn, formatTokens } from '@/lib/utils';

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

const COMPACT_WEEK_COUNT = 12;
const MOBILE_WEEK_COUNT = 13;
const DESKTOP_WEEK_COUNT = 26;
const GRID_LABEL_COLUMN = '1.75rem';

type HeatmapDensity = 'mobile' | 'desktop';

type ActivityWeek = (DailyActivity | null)[];

function getMonthLabelsForWeeks(weeks: ActivityWeek[], dateLocale: string) {
  const labels: { label: string; weekIndex: number }[] = [];
  let lastMonth = '';

  weeks.forEach((week, weekIndex) => {
    const firstActivity = week.find((a) => a !== null);
    if (!firstActivity) return;

    const month = new Date(firstActivity.date).toLocaleDateString(dateLocale, { month: 'short' });
    if (month !== lastMonth) {
      labels.push({ label: month, weekIndex });
      lastMonth = month;
    }
  });

  return labels.map((month, index) => ({
    ...month,
    span: Math.max(1, (labels[index + 1]?.weekIndex ?? weeks.length) - month.weekIndex),
  }));
}

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
  const weeks = useMemo(() => {
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

    return computedWeeks;
  }, [activities]);

  const cellSize = compact ? 'w-3 h-3' : 'w-3 h-3';
  const gapClass = compact ? 'gap-[3px]' : 'gap-[3px]';
  const displayWeeks = compact ? weeks.slice(-COMPACT_WEEK_COUNT) : weeks.slice(-DESKTOP_WEEK_COUNT);
  const mobileDisplayWeeks = weeks.slice(-MOBILE_WEEK_COUNT);
  const desktopMonthLabels = getMonthLabelsForWeeks(displayWeeks, dateLocale);
  const mobileMonthLabels = getMonthLabelsForWeeks(mobileDisplayWeeks, dateLocale);
  const getExpandedGridStyle = (weekCount: number, density: HeatmapDensity): React.CSSProperties => ({
    gridTemplateColumns: `${GRID_LABEL_COLUMN} repeat(${Math.max(weekCount, 1)}, ${density === 'mobile' ? '0.875rem' : '0.875rem'})`,
    columnGap: density === 'mobile'
      ? 'clamp(0.45rem, 1.45cqw, 1rem)'
      : 'clamp(0.3rem, 0.82cqw, 0.75rem)',
    justifyContent: 'center',
  });

  if (compact) {
    return (
      <div className="heatmap-enter">
        <div className={`flex ${gapClass}`}>
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
      </div>
    );
  }

  return (
    <div className="heatmap-enter w-full">
      <div className="lg:hidden">
        <div className="w-full [container-type:inline-size]">
          <HeatmapGrid
            weeks={mobileDisplayWeeks}
            monthLabels={mobileMonthLabels}
            dayLabels={dayLabels}
            density="mobile"
            formatTooltip={formatTooltip}
            getExpandedGridStyle={getExpandedGridStyle}
          />
          <HeatmapLegend t={t} className="mt-3" />
        </div>
      </div>

      <div className="hidden overflow-x-auto [scrollbar-width:none] lg:block [&::-webkit-scrollbar]:hidden">
        <div className="min-w-[640px] [container-type:inline-size]">
          <div className="mb-2 flex justify-end">
            <HeatmapLegend t={t} />
          </div>
          <HeatmapGrid
            weeks={displayWeeks}
            monthLabels={desktopMonthLabels}
            dayLabels={dayLabels}
            density="desktop"
            formatTooltip={formatTooltip}
            getExpandedGridStyle={getExpandedGridStyle}
          />
        </div>
      </div>
    </div>
  );
}

interface HeatmapGridProps {
  weeks: ActivityWeek[];
  monthLabels: { label: string; weekIndex: number; span: number }[];
  dayLabels: string[];
  density: HeatmapDensity;
  formatTooltip: (activity: DailyActivity) => string;
  getExpandedGridStyle: (weekCount: number, density: HeatmapDensity) => React.CSSProperties;
}

function HeatmapGrid({
  weeks,
  monthLabels,
  dayLabels,
  density,
  formatTooltip,
  getExpandedGridStyle,
}: HeatmapGridProps) {
  const expandedGridStyle = getExpandedGridStyle(weeks.length, density);

  return (
    <>
      <div className="mb-2 grid text-[11px] text-muted-foreground/90" style={expandedGridStyle}>
        <span aria-hidden="true" />
        {monthLabels.map(({ label, weekIndex, span }, i) => (
          <div
            key={i}
            className="min-w-0 leading-none"
            style={{ gridColumn: `${weekIndex + 2} / span ${span}` }}
          >
            {label}
          </div>
        ))}
      </div>

      <div className={cn('grid', density === 'mobile' ? 'gap-y-1' : 'gap-y-[3px]')} style={expandedGridStyle}>
        {dayLabels.map((label, index) => (
          <div
            key={label}
            className="flex items-center text-[11px] leading-none text-muted-foreground/90"
            style={{ gridColumn: 1, gridRow: index + 1 }}
          >
            {label}
          </div>
        ))}

        {weeks.map((week, weekIndex) => (
          week.map((activity, dayIndex) =>
            activity ? (
              <div
                key={activity.date}
                role="button"
                tabIndex={0}
                aria-label={formatTooltip(activity)}
                className={cn(
                  'relative aspect-square w-full cursor-pointer shadow-[inset_0_1px_0_hsl(var(--surface)/0.35)] transition-[filter,box-shadow,transform] duration-150 hover:-translate-y-px hover:brightness-110 hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  density === 'mobile' ? 'rounded-[4px]' : 'rounded-[4px]'
                )}
                style={{
                  ...LEVEL_STYLES[activity.level],
                  gridColumn: weekIndex + 2,
                  gridRow: dayIndex + 1,
                }}
                title={formatTooltip(activity)}
              >
                <span className="absolute -inset-1.5" aria-hidden="true" />
              </div>
            ) : (
              <div
                key={`empty-${weekIndex}-${dayIndex}`}
                className="aspect-square w-full"
                style={{ gridColumn: weekIndex + 2, gridRow: dayIndex + 1 }}
              />
            ),
          )
        ))}
      </div>
    </>
  );
}

function HeatmapLegend({ t, className }: { t: (key: string) => string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 text-xs text-muted-foreground', className)}>
      <span>{t('analytics.legendLow')}</span>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className="h-3 w-3 rounded-[3px]"
            style={LEVEL_STYLES[level]}
          />
        ))}
      </div>
      <span>{t('analytics.legendHigh')}</span>
    </div>
  );
}
