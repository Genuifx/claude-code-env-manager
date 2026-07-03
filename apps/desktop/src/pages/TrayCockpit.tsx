import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  Activity,
  Bot,
  Check,
  Clock3,
  Compass,
  Minus,
  Play,
  RefreshCw,
  Settings2,
  TerminalSquare,
  Workflow,
  Zap,
} from 'lucide-react';
import { LocaleProvider, useLocale } from '@/locales';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { CronTask, DesktopSettings, PlatformCapabilities, TelegramBridgeStatus } from '@/lib/tauri-ipc';
import type { UsageStats } from '@/types/analytics';
import { cn, formatTokens } from '@/lib/utils';

gsap.registerPlugin(useGSAP);

interface TraySession {
  id: string;
  client?: string | null;
  envName: string;
  permMode: string;
  workingDir: string;
  status: string;
  startedAt: string;
}

interface TauriSession {
  id: string;
  client?: string | null;
  env_name: string;
  perm_mode: string;
  working_dir: string;
  start_time: string;
  status: string;
}

interface TraySnapshot {
  currentEnv: string;
  permissionMode: string;
  usage: UsageStats;
  sessions: TraySession[];
  cronTasks: CronTask[];
  platform: PlatformCapabilities | null;
  telegram: TelegramBridgeStatus | null;
  version: string | null;
  source: 'live' | 'fallback';
  loadedAt: number;
}

interface ChartPoint {
  x: number;
  y: number;
  value: number;
  index: number;
}

type QuickTween = (value: number) => void;
type ChartHoverTarget = HTMLDivElement | SVGGElement;

const REFRESH_INTERVAL_MS = 7000;

const FALLBACK_USAGE: UsageStats = {
  today: {
    inputTokens: 92_400,
    outputTokens: 41_200,
    cacheReadTokens: 21_300,
    cacheCreationTokens: 1_900,
    cost: 3.12,
  },
  week: {
    inputTokens: 620_000,
    outputTokens: 288_000,
    cacheReadTokens: 130_000,
    cacheCreationTokens: 10_000,
    cost: 21.4,
  },
  month: {
    inputTokens: 2_100_000,
    outputTokens: 930_000,
    cacheReadTokens: 480_000,
    cacheCreationTokens: 38_000,
    cost: 72.8,
  },
  total: {
    inputTokens: 8_200_000,
    outputTokens: 3_400_000,
    cacheReadTokens: 1_900_000,
    cacheCreationTokens: 124_000,
    cost: 286.5,
  },
  dailyHistory: {},
  hourlyHistory: {},
  byModel: {},
  byEnvironment: {},
  lastUpdated: new Date().toISOString(),
};

const FALLBACK_SESSIONS: TraySession[] = [
  {
    id: 'preview-ccem',
    client: 'codex',
    envName: 'official',
    permMode: 'dev',
    workingDir: '/Users/wzt/G/Github/claude-code-env-manager',
    status: 'running',
    startedAt: new Date().toISOString(),
  },
  {
    id: 'preview-baymax',
    client: 'claude',
    envName: 'official',
    permMode: 'safe',
    workingDir: '/Users/wzt/Documents/baymax',
    status: 'idle',
    startedAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
  },
];

const FALLBACK_CRON_TASKS: CronTask[] = [
  {
    id: 'preview-radar',
    name: 'upstream radar',
    cronExpression: '0 */2 * * *',
    prompt: '',
    workingDir: '/Users/wzt/G/Github/claude-code-env-manager',
    envName: 'official',
    executionProfile: 'standard',
    enabled: true,
    timeoutSecs: 600,
    templateId: null,
    triggerType: 'schedule',
    parentTaskId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'preview-release',
    name: 'release check',
    cronExpression: '0 */6 * * *',
    prompt: '',
    workingDir: '/Users/wzt/G/Github/claude-code-env-manager',
    envName: 'official',
    executionProfile: 'conservative',
    enabled: true,
    timeoutSecs: 600,
    templateId: null,
    triggerType: 'schedule',
    parentTaskId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_SNAPSHOT: TraySnapshot = {
  currentEnv: 'official',
  permissionMode: 'dev',
  usage: FALLBACK_USAGE,
  sessions: [],
  cronTasks: [],
  platform: null,
  telegram: null,
  version: null,
  source: 'fallback',
  loadedAt: Date.now(),
};

function toTraySession(session: TauriSession): TraySession {
  return {
    id: session.id,
    client: session.client,
    envName: session.env_name,
    permMode: session.perm_mode,
    workingDir: session.working_dir,
    status: session.status,
    startedAt: session.start_time,
  };
}

function usageTokenTotal(usage: UsageStats['today']): number {
  return usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheCreationTokens;
}

function formatCost(cost: number): string {
  if (!Number.isFinite(cost)) {
    return '$0.00';
  }
  return `$${cost.toFixed(cost >= 10 ? 1 : 2)}`;
}

function getProjectName(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || path;
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return 'now';
  }
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return 'now';
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  return `${Math.floor(hours / 24)}d`;
}

function hourlyKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-') + `T${String(date.getHours()).padStart(2, '0')}`;
}

function buildHourlySeries(usage: UsageStats): number[] {
  const now = new Date();
  const values: number[] = [];
  for (let index = 11; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setHours(now.getHours() - index, 0, 0, 0);
    values.push(usageTokenTotal(usage.hourlyHistory[hourlyKey(date)] ?? {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      cost: 0,
    }));
  }

  if (values.some((value) => value > 0)) {
    return values;
  }

  return [4, 9, 7, 15, 13, 26, 21, 31, 28, 37, 34, 43].map((value) => value * 1000);
}

function chartPoints(values: number[]): ChartPoint[] {
  const width = 320;
  const height = 88;
  const max = Math.max(...values, 1);
  const step = width / Math.max(values.length - 1, 1);
  return values.map((value, index) => ({
    x: index * step,
    y: height - (value / max) * (height - 8) - 4,
    value,
    index,
  }));
}

function chartPath(points: ChartPoint[]): string {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
}

function providerBreakdown(sessions: TraySession[]) {
  const counts = [
    { key: 'codex', label: 'Codex', value: 0 },
    { key: 'claude', label: 'Claude', value: 0 },
    { key: 'opencode', label: 'OpenCode', value: 0 },
  ];

  sessions.forEach((session) => {
    const client = (session.client || '').toLowerCase();
    const target = counts.find((item) => client.includes(item.key)) ?? counts[1];
    target.value += 1;
  });

  const total = counts.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return [
      { ...counts[0], value: 45 },
      { ...counts[1], value: 35 },
      { ...counts[2], value: 20 },
    ];
  }

  return counts.map((item) => ({
    ...item,
    value: Math.max(6, Math.round((item.value / total) * 100)),
  }));
}

type StatusTone = 'success' | 'warning' | 'destructive' | 'muted';

function statusTone(status: string): StatusTone {
  const normalized = status.toLowerCase();
  if (normalized === 'running') {
    return 'success';
  }
  if (normalized === 'idle' || normalized === 'interrupted') {
    return 'warning';
  }
  if (normalized === 'error' || normalized === 'failed') {
    return 'destructive';
  }
  return 'muted';
}

function statusDotClass(tone: StatusTone): string {
  switch (tone) {
    case 'success':
      return 'bg-success';
    case 'warning':
      return 'bg-warning';
    case 'destructive':
      return 'bg-destructive';
    default:
      return 'bg-[var(--tray-text-3)]';
  }
}

function statusBadgeClass(tone: StatusTone): string {
  switch (tone) {
    case 'success':
      return 'bg-success/15 text-success';
    case 'warning':
      return 'bg-warning/15 text-warning';
    case 'destructive':
      return 'bg-destructive/15 text-destructive';
    default:
      return 'bg-[var(--tray-surface-2)] text-[var(--tray-text-3)]';
  }
}

async function readSnapshot(): Promise<TraySnapshot> {
  const [envResult, settingsResult, usageResult, sessionResult, cronResult, platformResult, telegramResult, versionResult] =
    await Promise.allSettled([
      invoke<string | null>('get_current_env'),
      invoke<DesktopSettings>('get_settings'),
      invoke<UsageStats>('get_usage_stats'),
      invoke<TauriSession[]>('list_interactive_sessions'),
      invoke<CronTask[]>('list_cron_tasks'),
      invoke<PlatformCapabilities>('get_platform_capabilities'),
      invoke<TelegramBridgeStatus>('get_telegram_bridge_status'),
      invoke<string>('get_app_version'),
    ]);

  const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
  const liveSessions = sessionResult.status === 'fulfilled'
    ? sessionResult.value.map(toTraySession)
    : FALLBACK_SESSIONS;
  const liveCronTasks = cronResult.status === 'fulfilled' ? cronResult.value : FALLBACK_CRON_TASKS;

  return {
    currentEnv: envResult.status === 'fulfilled' && envResult.value ? envResult.value : 'official',
    permissionMode: settings?.defaultMode || 'dev',
    usage: usageResult.status === 'fulfilled' ? usageResult.value : FALLBACK_USAGE,
    sessions: liveSessions,
    cronTasks: liveCronTasks,
    platform: platformResult.status === 'fulfilled' ? platformResult.value : null,
    telegram: telegramResult.status === 'fulfilled' ? telegramResult.value : null,
    version: versionResult.status === 'fulfilled' ? versionResult.value : null,
    source: usageResult.status === 'fulfilled' || sessionResult.status === 'fulfilled' ? 'live' : 'fallback',
    loadedAt: Date.now(),
  };
}

function applyTheme(theme: string | null | undefined) {
  const root = document.documentElement;
  const previewTheme = new URLSearchParams(window.location.search).get('theme');
  const effectiveTheme = previewTheme === 'dark' || previewTheme === 'light'
    ? previewTheme
    : theme || 'system';
  if (effectiveTheme === 'dark') {
    root.classList.remove('light');
    return;
  }
  if (effectiveTheme === 'light') {
    root.classList.add('light');
    return;
  }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.classList.toggle('light', !prefersDark);
}

async function showMainTab(tab: string) {
  const main = await WebviewWindow.getByLabel('main');
  if (main) {
    await main.show();
    await main.unminimize();
    await emit('tray-open-tab', { tab });
    await main.setFocus();
  }
  await WebviewWindow.getCurrent().hide();
}

function TrayCockpitContent() {
  const { t } = useLocale();
  const cockpitRef = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] = useState<TraySnapshot>(INITIAL_SNAPSHOT);
  const [refreshing, setRefreshing] = useState(false);
  const [launching, setLaunching] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await readSnapshot();
      setSnapshot(next);
      const settings = await invoke<DesktopSettings>('get_settings').catch(() => null);
      applyTheme(settings?.theme);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const intervalId = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    let disposed = false;
    const unlisteners: Array<() => void> = [];
    const setupListeners = async () => {
      for (const eventName of [
        'tray-cockpit-refresh',
        'session-updated',
        'native-session-updated',
        'task-completed',
        'task-error',
        'env-changed',
        'perm-changed',
      ]) {
        const unlisten = await listen(eventName, () => {
          void refresh();
        });
        if (disposed) {
          unlisten();
        } else {
          unlisteners.push(unlisten);
        }
      }
    };
    void setupListeners();

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [refresh]);

  const runningSessions = useMemo(
    () => snapshot.sessions.filter((session) => session.status.toLowerCase() === 'running'),
    [snapshot.sessions],
  );
  const visibleSessions = snapshot.sessions.length > 0 ? snapshot.sessions.slice(0, 3) : [];
  const visibleCronTasks = snapshot.cronTasks.filter((task) => task.enabled).slice(0, 3);
  const chartValues = useMemo(() => buildHourlySeries(snapshot.usage), [snapshot.usage]);
  const points = useMemo(() => chartPoints(chartValues), [chartValues]);
  const path = useMemo(() => chartPath(points), [points]);
  const providers = useMemo(() => providerBreakdown(snapshot.sessions), [snapshot.sessions]);
  const todayTokens = usageTokenTotal(snapshot.usage.today);

  const healthItems = useMemo(() => [
    {
      key: 'tmux',
      label: t('trayCockpit.healthTmux'),
      ok: snapshot.platform?.tmuxInstalled ?? true,
      detail: snapshot.platform?.tmuxInstalled === false ? t('trayCockpit.healthMissing') : t('trayCockpit.healthOk'),
    },
    {
      key: 'bridge',
      label: t('trayCockpit.healthBridge'),
      ok: snapshot.telegram?.running ?? false,
      detail: snapshot.telegram?.running
        ? t('trayCockpit.healthOnline')
        : snapshot.telegram?.configured
          ? t('trayCockpit.healthOffline')
          : t('trayCockpit.healthNotSet'),
    },
    {
      key: 'cron',
      label: t('trayCockpit.healthCron'),
      ok: visibleCronTasks.length > 0,
      detail: `${visibleCronTasks.length}`,
    },
    {
      key: 'version',
      label: t('trayCockpit.healthVersion'),
      ok: Boolean(snapshot.version),
      detail: snapshot.version ? `v${snapshot.version}` : t('trayCockpit.healthUnknown'),
    },
  ], [snapshot, visibleCronTasks.length, t]);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set(
        '.tray-cockpit-panel, .tray-cockpit-panel > header, .tray-cockpit-body > *, .tray-cockpit-panel > footer, .tray-provider-bar',
        { autoAlpha: 1, y: 0, scale: 1, scaleX: 1 },
      );
    });

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        '.tray-cockpit-panel',
        { autoAlpha: 0, y: -8, scale: 0.985 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.22, clearProps: 'transform,opacity,visibility' },
      )
        .fromTo(
          '.tray-cockpit-panel > header, .tray-cockpit-body > *, .tray-cockpit-panel > footer',
          { autoAlpha: 0, y: 8 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.28,
            stagger: 0.035,
            clearProps: 'transform,opacity,visibility',
          },
          '<0.05',
        )
        .fromTo(
          '.tray-provider-bar',
          { scaleX: 0 },
          { scaleX: 1, duration: 0.34, stagger: 0.04, clearProps: 'transform' },
          '<0.08',
        );
    });

    return () => mm.revert();
  }, { scope: cockpitRef });

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      const main = await WebviewWindow.getByLabel('main');
      if (main) {
        await main.show();
        await main.unminimize();
        await emit('tray-open-tab', { tab: 'workspace' });
        await main.setFocus();
      }
      await emit('tray-launch-claude', {});
      await WebviewWindow.getCurrent().hide();
    } finally {
      setLaunching(false);
    }
  };

  const liveLabel = snapshot.source === 'live' ? t('trayCockpit.live') : t('trayCockpit.preview');
  const updatedLabel = t('trayCockpit.updated').replace('{time}', formatRelativeTime(snapshot.usage.lastUpdated));
  const monthCostLabel = t('trayCockpit.monthCost').replace('{cost}', formatCost(snapshot.usage.month.cost));

  return (
    <div ref={cockpitRef} className="tray-cockpit-window flex min-h-screen w-full items-start justify-center bg-transparent px-[32px] pb-[48px] pt-2 font-sans">
      <section className="tray-cockpit-panel relative flex h-[700px] w-[390px] flex-col overflow-hidden rounded-[14px] text-[var(--tray-text-1)]">
        <header className="relative flex items-center gap-2.5 px-4 pb-2 pt-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <TrayLogo />
            <div className="min-w-0 leading-none">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-[14.5px] font-semibold tracking-[-0.01em] text-[var(--tray-text-1)]">
                  {t('trayCockpit.title')}
                </h1>
                <span
                  className={cn(
                    'inline-block h-1.5 w-1.5 shrink-0 rounded-full ring-2 ring-[var(--tray-bg-solid)]',
                    snapshot.source === 'live' ? 'bg-[var(--tray-accent)]' : 'bg-[var(--tray-text-3)]',
                  )}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-1 text-[10.5px] text-[var(--tray-text-3)]">
                <span className="truncate">{liveLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{updatedLabel}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label={t('trayCockpit.refresh')}
            onClick={() => void refresh()}
            className="tray-icon-button grid h-7 w-7 shrink-0 place-items-center rounded-[10px] text-[var(--tray-text-3)] hover:bg-[var(--tray-surface-3)] hover:text-[var(--tray-text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          </button>
        </header>

        <div className="tray-cockpit-body relative flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <StatStrip
            items={[
              { label: t('trayCockpit.env'), value: snapshot.currentEnv, icon: <Compass className="h-3 w-3" /> },
              { label: t('trayCockpit.perm'), value: snapshot.permissionMode, icon: <Zap className="h-3 w-3" /> },
              { label: t('trayCockpit.sessions'), value: `${runningSessions.length}`, icon: <TerminalSquare className="h-3 w-3" /> },
            ]}
          />

          <div className="grid grid-cols-2 gap-2">
            <MetricTile
              label={t('trayCockpit.tokensToday')}
              value={formatTokens(todayTokens)}
              detail={updatedLabel}
            />
            <MetricTile
              accent
              label={t('trayCockpit.costToday')}
              value={formatCost(snapshot.usage.today.cost)}
              detail={monthCostLabel}
            />
          </div>

          <ActivityChart points={points} path={path} label={t('trayCockpit.activity')} />

          <ProviderSplit providers={providers} label={t('trayCockpit.providerSplit')} caption={t('trayCockpit.sessions')} />

          <div className="grid grid-cols-2 gap-2">
            <InfoColumn
              title={t('trayCockpit.activeProjects')}
              count={visibleSessions.length}
              empty={t('trayCockpit.noSessions')}
            >
              {visibleSessions.slice(0, 2).map((session) => {
                const tone = statusTone(session.status);
                return (
                  <div key={session.id} className="flex min-w-0 items-center gap-2 py-[3px]">
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusDotClass(tone))} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-[var(--tray-text-1)]">
                      {getProjectName(session.workingDir)}
                    </span>
                    <span className={cn('shrink-0 rounded-full px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-[0.04em]', statusBadgeClass(tone))}>
                      {session.status}
                    </span>
                  </div>
                );
              })}
            </InfoColumn>

            <InfoColumn
              title={t('trayCockpit.scheduled')}
              count={visibleCronTasks.length}
              empty={t('trayCockpit.noCron')}
            >
              {visibleCronTasks.slice(0, 2).map((task) => (
                <div key={task.id} className="flex min-w-0 items-center gap-2 py-[3px]">
                  <Clock3 className="h-3 w-3 shrink-0 text-[var(--tray-text-3)]" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-[var(--tray-text-1)]">{task.name}</span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--tray-text-3)]">
                    {task.cronExpression}
                  </span>
                </div>
              ))}
            </InfoColumn>
          </div>

          <HealthRow items={healthItems} />
        </div>

        <footer className="flex items-center gap-1 border-t border-[var(--tray-hairline)] bg-[var(--tray-surface-1)] px-2 py-1.5">
          <DockButton icon={<Play className="h-3.5 w-3.5" />} label={t('trayCockpit.launch')} busy={launching} onClick={handleLaunch} primary />
          <DockButton icon={<Workflow className="h-3.5 w-3.5" />} label={t('trayCockpit.workspace')} onClick={() => void showMainTab('workspace')} />
          <DockButton icon={<Bot className="h-3.5 w-3.5" />} label={t('trayCockpit.sessionsPage')} onClick={() => void showMainTab('sessions')} />
          <DockButton icon={<Settings2 className="h-3.5 w-3.5" />} label={t('trayCockpit.diagnostics')} onClick={() => void showMainTab('proxy-debug')} />
        </footer>
      </section>
    </div>
  );
}

function TrayLogo() {
  return (
    <div className="tray-logo relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]">
      <span className="tray-logo-ring absolute inset-0 rounded-[10px]" aria-hidden="true" />
      <img
        src="/logo_preview.png"
        alt="CCEM"
        className="tray-logo-image relative h-7 w-7 object-contain"
        draggable={false}
      />
    </div>
  );
}

function StatStrip({ items }: { items: Array<{ label: string; value: string; icon: ReactNode }> }) {
  return (
    <div className="flex items-stretch rounded-[12px] bg-[var(--tray-surface-2)] px-1 py-2">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            'relative flex min-w-0 flex-1 flex-col gap-1 px-3',
            index > 0 && 'before:absolute before:left-0 before:top-1/2 before:h-3/5 before:w-px before:-translate-y-1/2 before:bg-[var(--tray-divider)]',
          )}
        >
          <div className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[var(--tray-text-3)]">
            <span className="[&>svg]:h-[10px] [&>svg]:w-[10px] [&>svg]:stroke-[1.75]">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </div>
          <div className="truncate text-[13px] font-semibold leading-none tracking-[-0.01em] text-[var(--tray-text-1)] tabular-nums">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricTile({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className={cn(
      'relative flex flex-col gap-1 overflow-hidden rounded-[12px] px-3.5 py-3',
      accent
        ? 'bg-[var(--tray-accent-soft)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[var(--tray-accent)] before:opacity-40'
        : 'bg-[var(--tray-surface-2)]',
    )}>
      <div className={cn(
        'text-[9.5px] font-semibold uppercase tracking-[0.06em]',
        accent ? 'text-[var(--tray-accent)] opacity-80' : 'text-[var(--tray-text-3)]',
      )}>
        {label}
      </div>
      <div
        className={cn(
          'text-[22px] font-semibold leading-none tracking-[-0.02em] tabular-nums',
          accent ? 'text-[var(--tray-accent)]' : 'text-[var(--tray-text-1)]',
        )}
      >
        {value}
      </div>
      <div className={cn(
        'truncate text-[10px] font-medium',
        accent ? 'text-[var(--tray-text-2)]' : 'text-[var(--tray-text-3)]',
      )}>{detail}</div>
    </div>
  );
}

function ActivityChart({
  points,
  path,
  label,
}: {
  points: ChartPoint[];
  path: string;
  label: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const cursorLineRef = useRef<SVGGElement>(null);
  const cursorDotRef = useRef<SVGGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const cursorLineXTo = useRef<QuickTween | null>(null);
  const cursorDotXTo = useRef<QuickTween | null>(null);
  const cursorDotYTo = useRef<QuickTween | null>(null);
  const tooltipXTo = useRef<QuickTween | null>(null);
  const tooltipYTo = useRef<QuickTween | null>(null);
  const [hovered, setHovered] = useState<ChartPoint | null>(null);
  const lastPoint = points[points.length - 1] ?? { x: 320, y: 84, value: 0, index: 0 };

  useGSAP(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const quickDuration = reducedMotion ? 0 : 0.16;

    if (cursorLineRef.current) {
      gsap.set(cursorLineRef.current, { x: lastPoint.x, autoAlpha: 0 });
      cursorLineXTo.current = gsap.quickTo(cursorLineRef.current, 'x', { duration: quickDuration, ease: 'power3.out' });
    }
    if (cursorDotRef.current) {
      gsap.set(cursorDotRef.current, { x: lastPoint.x, y: lastPoint.y, autoAlpha: 0 });
      cursorDotXTo.current = gsap.quickTo(cursorDotRef.current, 'x', { duration: quickDuration, ease: 'power3.out' });
      cursorDotYTo.current = gsap.quickTo(cursorDotRef.current, 'y', { duration: quickDuration, ease: 'power3.out' });
    }
    if (tooltipRef.current) {
      gsap.set(tooltipRef.current, { autoAlpha: 0, x: 0, y: 0 });
      tooltipXTo.current = gsap.quickTo(tooltipRef.current, 'x', { duration: quickDuration, ease: 'power3.out' });
      tooltipYTo.current = gsap.quickTo(tooltipRef.current, 'y', { duration: quickDuration, ease: 'power3.out' });
    }

    if (reducedMotion) {
      gsap.set('.tray-chart-area, .tray-chart-line, .tray-chart-dot', {
        autoAlpha: 1,
        scale: 1,
        strokeDashoffset: 0,
      });
      return () => {
        cursorLineXTo.current = null;
        cursorDotXTo.current = null;
        cursorDotYTo.current = null;
        tooltipXTo.current = null;
        tooltipYTo.current = null;
      };
    }

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.fromTo('.tray-chart-area', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.24 }, 0)
      .fromTo('.tray-chart-line', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.56 }, 0.04)
      .fromTo(
        '.tray-chart-dot',
        { autoAlpha: 0, scale: 0.65, transformOrigin: 'center center' },
        { autoAlpha: 1, scale: 1, duration: 0.24 },
        0.38,
      );

    return () => {
      cursorLineXTo.current = null;
      cursorDotXTo.current = null;
      cursorDotYTo.current = null;
      tooltipXTo.current = null;
      tooltipYTo.current = null;
    };
  }, { scope: chartRef, dependencies: [path], revertOnUpdate: true });

  const updateHoverPoint = useCallback((event: PointerEvent<SVGRectElement>) => {
    if (points.length === 0) {
      return null;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const chartX = Math.min(320, Math.max(0, ((event.clientX - rect.left) / rect.width) * 320));
    const point = points.reduce((best, candidate) => (
      Math.abs(candidate.x - chartX) < Math.abs(best.x - chartX) ? candidate : best
    ), points[0]);
    const tooltipWidth = 92;
    const tooltipHeight = 32;
    const tooltipX = Math.min(
      Math.max(0, rect.width - tooltipWidth),
      Math.max(0, (point.x / 320) * rect.width - tooltipWidth / 2),
    );
    const tooltipY = Math.min(
      Math.max(0, rect.height - tooltipHeight),
      Math.max(0, (point.y / 88) * rect.height - tooltipHeight - 4),
    );

    setHovered((previous) => (previous?.index === point.index ? previous : point));
    cursorLineXTo.current?.(point.x);
    cursorDotXTo.current?.(point.x);
    cursorDotYTo.current?.(point.y);
    tooltipXTo.current?.(tooltipX);
    tooltipYTo.current?.(tooltipY);

    return point;
  }, [points]);

  const showHover = useCallback((event: PointerEvent<SVGRectElement>) => {
    updateHoverPoint(event);
    const targets = [cursorLineRef.current, cursorDotRef.current, tooltipRef.current]
      .filter((target): target is ChartHoverTarget => Boolean(target));
    gsap.to(targets, {
      autoAlpha: 1,
      duration: 0.12,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, [updateHoverPoint]);

  const moveHover = useCallback((event: PointerEvent<SVGRectElement>) => {
    updateHoverPoint(event);
  }, [updateHoverPoint]);

  const hideHover = useCallback(() => {
    setHovered(null);
    const targets = [cursorLineRef.current, cursorDotRef.current, tooltipRef.current]
      .filter((target): target is ChartHoverTarget => Boolean(target));
    gsap.to(targets, {
      autoAlpha: 0,
      duration: 0.14,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, []);
  const tooltipPoint = hovered ?? lastPoint;

  return (
    <div ref={chartRef} className="tray-chart-card group rounded-[12px] bg-[var(--tray-surface-2)] px-3 pb-2 pt-2.5 transition-[background-color] duration-[var(--tray-duration)] ease-[var(--tray-ease)] hover:bg-[var(--tray-surface-3)]">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--tray-text-1)]">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--tray-accent-soft)] text-[var(--tray-accent)]">
            <Activity className="h-2.5 w-2.5" />
          </span>
          {label}
        </div>
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[var(--tray-text-3)]">
          12h
        </span>
      </div>
      <div className="relative h-[88px]">
        <div
          ref={tooltipRef}
          className="tray-chart-tooltip pointer-events-none absolute left-0 top-0 z-10 flex w-[92px] flex-col rounded-[9px] bg-[var(--tray-bg-solid)] px-2 py-1 opacity-0 shadow-[0_8px_24px_hsl(220_30%_4%_/_0.4)] ring-1 ring-[var(--tray-hairline)]"
          aria-hidden="true"
        >
          <span className="text-[9px] font-semibold uppercase leading-none tracking-[0.06em] text-[var(--tray-text-3)]">
            {`${tooltipPoint.index + 1}/12`}
          </span>
          <span className="mt-0.5 truncate text-[11px] font-semibold leading-none tabular-nums text-[var(--tray-text-1)]">
            {formatTokens(tooltipPoint.value)}
          </span>
        </div>
        <svg viewBox="0 0 320 88" className="h-[88px] w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="tray-cockpit-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--tray-accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--tray-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            x2="320"
            y1="88"
            y2="88"
            stroke="var(--tray-divider)"
            strokeWidth="1"
          />
          <path className="tray-chart-area" d={`${path} L ${lastPoint.x.toFixed(1)} 88 L 0 88 Z`} fill="url(#tray-cockpit-area)" />
          <path
            className="tray-chart-line"
            d={path}
            fill="none"
            pathLength={1}
            stroke="var(--tray-accent)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <circle
            className="tray-chart-dot"
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={3}
            fill="var(--tray-bg-solid)"
            stroke="var(--tray-accent)"
            strokeWidth="1.75"
          />
          <g ref={cursorLineRef} className="tray-chart-cursor" opacity={0}>
            <line
              y1="0"
              y2="88"
              stroke="var(--tray-accent)"
              strokeDasharray="3 4"
              strokeOpacity="0.4"
              strokeWidth="1"
            />
          </g>
          <g ref={cursorDotRef} className="tray-chart-cursor" opacity={0}>
            <circle
              r={4}
              fill="var(--tray-bg-solid)"
              stroke="var(--tray-accent)"
              strokeWidth="1.75"
            />
          </g>
          <rect
            className="tray-chart-hitbox"
            x="0"
            y="0"
            width="320"
            height="88"
            fill="transparent"
            onPointerEnter={showHover}
            onPointerMove={moveHover}
            onPointerLeave={hideHover}
          />
        </svg>
      </div>
    </div>
  );
}

function ProviderSplit({
  providers,
  label,
  caption,
}: {
  providers: Array<{ key: string; label: string; value: number }>;
  label: string;
  caption: string;
}) {
  return (
    <div className="rounded-[12px] bg-[var(--tray-surface-2)] px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between text-[11.5px] font-semibold text-[var(--tray-text-1)]">
        <span className="flex items-center gap-1.5">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--tray-accent-soft)] text-[var(--tray-accent)]">
            <Workflow className="h-2.5 w-2.5" />
          </span>
          {label}
        </span>
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[var(--tray-text-3)]">
          {caption}
        </span>
      </div>
      <div className="space-y-1.5">
        {providers.map((item) => (
          <div key={item.key} className="grid grid-cols-[68px_1fr_34px] items-center gap-2 text-[11px]">
            <span className="truncate font-medium text-[var(--tray-text-2)]">{item.label}</span>
            <div className="h-1 overflow-hidden rounded-full bg-[var(--tray-divider)]">
              <div
                className="tray-provider-bar h-full rounded-full bg-[var(--tray-accent)] transition-[width] duration-[var(--tray-duration)] ease-[var(--tray-ease)]"
                style={{ width: `${item.value}%`, opacity: 0.6 + (item.value / 100) * 0.4 }}
              />
            </div>
            <span className="text-right text-[10.5px] font-semibold tabular-nums text-[var(--tray-text-3)]">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoColumn({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="flex min-w-0 flex-col rounded-[12px] bg-[var(--tray-surface-2)] px-3 py-2.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-[11.5px] font-semibold text-[var(--tray-text-1)]">{title}</span>
        <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[var(--tray-divider)] px-1 text-[9.5px] font-bold tabular-nums text-[var(--tray-text-2)]">
          {count}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        {hasChildren ? children : (
          <div className="rounded-[8px] bg-[var(--tray-surface-1)] px-2 py-1 text-[10.5px] text-[var(--tray-text-3)]">{empty}</div>
        )}
      </div>
    </div>
  );
}

function HealthRow({ items }: { items: Array<{ key: string; label: string; ok: boolean; detail: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-[12px] bg-[var(--tray-surface-2)] p-1">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex min-w-0 items-center gap-1.5 rounded-[9px] bg-[var(--tray-surface-1)] px-2 py-1"
          title={item.detail}
        >
          <span
            className={cn(
              'grid h-4 w-4 shrink-0 place-items-center rounded-full',
              item.ok ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning',
            )}
            aria-hidden="true"
          >
            {item.ok ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <Minus className="h-2.5 w-2.5" strokeWidth={3} />}
          </span>
          <div className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-[10px] font-semibold text-[var(--tray-text-2)]">{item.label}</span>
            <span className="mt-0.5 truncate text-[9px] font-medium text-[var(--tray-text-3)]">{item.detail}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DockButton({
  icon,
  label,
  busy = false,
  primary = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  busy?: boolean;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            'tray-dock-button group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[10px] px-1 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            primary
              ? 'bg-[var(--tray-accent-soft)] text-[var(--tray-accent)] before:absolute before:inset-x-2 before:top-0 before:h-px before:bg-[var(--tray-accent)] before:opacity-50 hover:bg-[var(--tray-accent-softer)]'
              : 'text-[var(--tray-text-3)] hover:bg-[var(--tray-surface-3)] hover:text-[var(--tray-text-1)]',
          )}
        >
          <span className="flex h-[18px] w-[18px] items-center justify-center [&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:stroke-[1.75]">
            {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : icon}
          </span>
          <span className="max-w-full truncate text-[9.5px] font-semibold tracking-[0.01em]">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function TrayCockpit() {
  return (
    <LocaleProvider>
      <TooltipProvider>
        <TrayCockpitContent />
      </TooltipProvider>
    </LocaleProvider>
  );
}
