import { useState, useEffect, useMemo } from 'react';
import { useLocale } from '@/locales';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { cn } from '@/lib/utils';
import { Code } from 'lucide-react';

type Frequency = 'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly';

interface CronEditorProps {
  value: string;
  onChange: (expression: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CronEditor({ value, onChange }: CronEditorProps) {
  const { t } = useLocale();
  const { getCronNextRuns } = useTauriCommands();
  const [advancedMode, setAdvancedMode] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [minute, setMinute] = useState(0);
  const [hour, setHour] = useState(9);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [nextRuns, setNextRuns] = useState<string[]>([]);

  // Parse initial value into visual state on mount
  useEffect(() => {
    if (!value) return;
    const parts = value.split(/\s+/);
    if (parts.length !== 5) return;
    const [min, hr, dom, , dow] = parts;
    if (min === '*' && hr === '*') {
      setFrequency('minute');
    } else if (min !== '*' && hr === '*') {
      setFrequency('hourly');
      setMinute(parseInt(min) || 0);
    } else if (dom === '*' && dow === '*') {
      setFrequency('daily');
      setMinute(parseInt(min) || 0);
      setHour(parseInt(hr) || 9);
    } else if (dom === '*' && dow !== '*') {
      setFrequency('weekly');
      setMinute(parseInt(min) || 0);
      setHour(parseInt(hr) || 9);
      setDayOfWeek(parseInt(dow) || 1);
    } else if (dom !== '*') {
      setFrequency('monthly');
      setMinute(parseInt(min) || 0);
      setHour(parseInt(hr) || 9);
      setDayOfMonth(parseInt(dom) || 1);
    }
  }, []);

  // Build cron expression from visual state
  const expression = useMemo(() => {
    if (advancedMode) return value;
    switch (frequency) {
      case 'minute': return '* * * * *';
      case 'hourly': return `${minute} * * * *`;
      case 'daily': return `${minute} ${hour} * * *`;
      case 'weekly': return `${minute} ${hour} * * ${dayOfWeek}`;
      case 'monthly': return `${minute} ${hour} ${dayOfMonth} * *`;
      default: return '0 9 * * *';
    }
  }, [advancedMode, frequency, minute, hour, dayOfMonth, dayOfWeek, value]);

  // Sync expression to parent
  useEffect(() => {
    if (!advancedMode) {
      onChange(expression);
    }
  }, [expression, advancedMode]);

  // Fetch next runs preview
  useEffect(() => {
    const expr = advancedMode ? value : expression;
    if (!expr || expr.trim().split(/\s+/).length !== 5) {
      setNextRuns([]);
      return;
    }
    getCronNextRuns(expr, 5)
      .then(setNextRuns)
      .catch(() => setNextRuns([]));
  }, [expression, value, advancedMode, getCronNextRuns]);

  const humanReadable = useMemo(() => {
    switch (frequency) {
      case 'minute': return t('cron.everyMinute');
      case 'hourly': return t('cron.everyHourAt').replace('{min}', String(minute));
      case 'daily': return t('cron.everyDayAt').replace('{time}', `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      case 'weekly': return t('cron.everyWeekOn').replace('{day}', WEEKDAYS[dayOfWeek]).replace('{time}', `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      case 'monthly': return t('cron.everyMonthOn').replace('{day}', String(dayOfMonth)).replace('{time}', `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      default: return '';
    }
  }, [frequency, minute, hour, dayOfMonth, dayOfWeek, t]);

  const formatNextRun = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-3">
      {!advancedMode && (
        <div className="space-y-3">
          {/* Frequency pills */}
          <div className="flex gap-1.5">
            {(['minute', 'hourly', 'daily', 'weekly', 'monthly'] as Frequency[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-md transition-colors',
                  frequency === f
                    ? 'bg-primary text-primary-foreground'
                    : 'glass-subtle text-muted-foreground hover:text-foreground'
                )}
              >
                {t(`cron.freq_${f}`)}
              </button>
            ))}
          </div>

          {/* Time pickers */}
          <div className="flex items-center gap-3 flex-wrap">
            {frequency === 'weekly' && (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {t('cron.weekday')}
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="glass-subtle rounded-md px-2 py-1 text-xs text-foreground bg-transparent"
                >
                  {WEEKDAYS.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </label>
            )}
            {frequency === 'monthly' && (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {t('cron.dayOfMonth')}
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  className="glass-subtle rounded-md px-2 py-1 text-xs text-foreground bg-transparent"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
            )}
            {frequency !== 'minute' && (
              <>
                {frequency !== 'hourly' && (
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {t('cron.hour')}
                    <select
                      value={hour}
                      onChange={(e) => setHour(Number(e.target.value))}
                      className="glass-subtle rounded-md px-2 py-1 text-xs text-foreground bg-transparent"
                    >
                      {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                        <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {t('cron.minuteLabel')}
                  <select
                    value={minute}
                    onChange={(e) => setMinute(Number(e.target.value))}
                    className="glass-subtle rounded-md px-2 py-1 text-xs text-foreground bg-transparent"
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{humanReadable}</p>
        </div>
      )}

      {advancedMode && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="* * * * *"
          className="w-full glass-subtle rounded-md px-3 py-1.5 text-sm font-mono text-foreground bg-transparent placeholder:text-muted-foreground/50"
        />
      )}

      {/* Toggle + expression preview */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setAdvancedMode(!advancedMode)}
          className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Code className="w-3 h-3" />
          {advancedMode ? t('cron.visualMode') : t('cron.advancedMode')}
        </button>
        {!advancedMode && (
          <span className="text-2xs font-mono text-muted-foreground/60">{expression}</span>
        )}
      </div>

      {/* Next runs preview */}
      {nextRuns.length > 0 && (
        <div className="space-y-1">
          <p className="text-2xs text-muted-foreground font-medium">{t('cron.nextRuns')}</p>
          <div className="space-y-0.5">
            {nextRuns.map((run, i) => (
              <p key={i} className="text-2xs text-muted-foreground/70 font-mono">
                {formatNextRun(run)}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
