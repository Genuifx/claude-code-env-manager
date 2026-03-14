import { useState, useEffect, useRef } from 'react';
import { Moon, Sun, MonitorSmartphone, Lightbulb, Terminal, CheckCircle2, XCircle, Copy, Shield, ShieldCheck, ShieldOff, ShieldAlert, ShieldBan, Search, FolderOpen, X, Bot, Play, Square, MessageSquareWarning, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import { useLocale } from '../locales';
import { SettingsSkeleton } from '@/components/ui/skeleton-states';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TelegramBridgeStatus, TelegramSettings } from '@/lib/tauri-ipc';
import { TelegramTopicBindingsEditor } from '@/components/settings/TelegramTopicBindingsEditor';
import { BindToTelegramDialog } from '@/components/telegram/BindToTelegramDialog';

const MODE_DISPLAY_NAMES: Record<PermissionModeName, string> = {
  yolo: 'YOLO',
  dev: 'Developer',
  readonly: 'Read Only',
  safe: 'Safe',
  ci: 'CI / CD',
  audit: 'Audit',
};

function getModeIcon(mode: PermissionModeName): typeof Shield {
  const iconMap: Record<PermissionModeName, typeof Shield> = {
    yolo: ShieldOff,
    dev: ShieldCheck,
    readonly: ShieldBan,
    safe: ShieldAlert,
    ci: ShieldCheck,
    audit: Search,
  };
  return iconMap[mode] || Shield;
}

interface InstallStatusState {
  ccem: boolean | null;
  claude: boolean | null;
  codex: boolean | null;
  tmux: boolean | null;
}

function parseTelegramUserIdsInput(input: string): { values: number[]; invalid: string[] } {
  const parts = input
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const values: number[] = [];
  const invalid: string[] = [];

  for (const part of parts) {
    if (!/^-?\d+$/.test(part)) {
      invalid.push(part);
      continue;
    }

    values.push(Number(part));
  }

  return { values, invalid };
}

export function Settings() {
  const { defaultMode, setDefaultMode, isLoadingSettings, defaultWorkingDir, environments } = useAppStore();
  const { t, lang, setLang } = useLocale();
  const {
    openDirectoryPicker,
    saveDefaultWorkingDir,
    getTelegramSettings,
    saveTelegramSettings,
    getTelegramBridgeStatus,
    startTelegramBridge,
    stopTelegramBridge,
  } = useTauriCommands();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [autoStart, setAutoStart] = useState(false);
  const [startMinimized, setStartMinimized] = useState(false);
  const [closeToTray, setCloseToTray] = useState(true);
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    enabled: false,
    botToken: '',
    allowedUserIds: [],
    allowedChatId: null,
    notificationsThreadId: null,
    defaultEnvName: null,
    defaultPermMode: null,
    defaultWorkingDir: null,
    topicBindings: [],
    preferences: {
      showToolCalls: true,
      showLowRiskTools: false,
      flushIntervalMs: 3000,
    },
  });
  const [telegramStatus, setTelegramStatus] = useState<TelegramBridgeStatus>({
    configured: false,
    running: false,
  });
  const [telegramAllowedUserIdsInput, setTelegramAllowedUserIdsInput] = useState('');
  const [showTelegramAdvanced, setShowTelegramAdvanced] = useState(false);
  const [quickBindOpen, setQuickBindOpen] = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [isTogglingTelegram, setIsTogglingTelegram] = useState(false);
  const [installStatus, setInstallStatus] = useState<InstallStatusState>({
    ccem: null,
    claude: null,
    codex: null,
    tmux: null,
  });
  const [webkitVersion, setWebkitVersion] = useState<string | null>(null);
  const loaded = useRef(false);

  // Load CLI install status in parallel so the About card updates once.
  useEffect(() => {
    let cancelled = false;

    const loadInstallStatus = async () => {
      const [ccem, claude, codex, tmux] = await Promise.allSettled([
        invoke<boolean>('check_ccem_installed'),
        invoke<boolean>('check_claude_installed'),
        invoke<boolean>('check_codex_installed'),
        invoke<boolean>('check_tmux_installed'),
      ]);

      if (cancelled) {
        return;
      }

      setInstallStatus({
        ccem: ccem.status === 'fulfilled' ? ccem.value : false,
        claude: claude.status === 'fulfilled' ? claude.value : false,
        codex: codex.status === 'fulfilled' ? codex.value : false,
        tmux: tmux.status === 'fulfilled' ? tmux.value : false,
      });
    };

    void loadInstallStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  // Surface runtime WebKit version for desktop debugging.
  useEffect(() => {
    const match = navigator.userAgent.match(/AppleWebKit\/([\d.]+)/i);
    setWebkitVersion(match?.[1] ?? null);
  }, []);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await invoke<{ theme: string; autoStart: boolean; startMinimized: boolean; closeToTray: boolean; defaultMode: string | null }>('get_settings');
        setTheme(settings.theme as 'light' | 'dark' | 'system');
        setAutoStart(settings.autoStart);
        setStartMinimized(settings.startMinimized);
        setCloseToTray(settings.closeToTray);
        if (settings.defaultMode) {
          setDefaultMode(settings.defaultMode as PermissionModeName);
        }
      } catch {
        // Fallback: load from localStorage
        const saved = localStorage.getItem('ccem-settings');
        if (saved) {
          try {
            const settings = JSON.parse(saved);
            setTheme(settings.theme || 'system');
            setAutoStart(settings.autoStart ?? false);
            setStartMinimized(settings.startMinimized ?? false);
            setCloseToTray(settings.closeToTray ?? true);
            if (settings.defaultMode) {
              setDefaultMode(settings.defaultMode as PermissionModeName);
            }
          } catch { /* ignore parse errors */ }
        }
      }
      loaded.current = true;
    };
    loadSettings();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTelegram = async () => {
      try {
        const [settings, status] = await Promise.all([
          getTelegramSettings(),
          getTelegramBridgeStatus(),
        ]);
        if (cancelled) return;
        setTelegramSettings({
          enabled: settings.enabled ?? false,
          botToken: settings.botToken ?? '',
          allowedUserIds: settings.allowedUserIds ?? [],
          allowedChatId: settings.allowedChatId ?? null,
          notificationsThreadId: settings.notificationsThreadId ?? null,
          defaultEnvName: settings.defaultEnvName ?? null,
          defaultPermMode: settings.defaultPermMode ?? null,
          defaultWorkingDir: settings.defaultWorkingDir ?? null,
          topicBindings: settings.topicBindings ?? [],
          preferences: settings.preferences ?? {
            showToolCalls: true,
            showLowRiskTools: false,
            flushIntervalMs: 3000,
          },
        });
        setTelegramAllowedUserIdsInput((settings.allowedUserIds ?? []).join(', '));
        setTelegramStatus(status);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load telegram bridge state:', error);
        }
      }
    };

    void loadTelegram();
    const intervalId = window.setInterval(() => {
      void getTelegramBridgeStatus().then((status) => {
        if (!cancelled) {
          setTelegramStatus(status);
        }
      }).catch(() => {});
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [getTelegramBridgeStatus, getTelegramSettings]);

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.remove('light');
    } else if (theme === 'light') {
      root.classList.add('light');
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.remove('light');
      } else {
        root.classList.add('light');
      }
    }
  }, [theme]);

  // Auto-save whenever settings change (skip initial load)
  useEffect(() => {
    if (!loaded.current) return;
    const settings = { theme, autoStart, startMinimized, closeToTray, defaultMode };
    (async () => {
      try {
        await invoke('save_settings', { settings });
      } catch (e) {
        // Fallback to localStorage but notify user
        localStorage.setItem('ccem-settings', JSON.stringify(settings));
        toast.error(t('settings.saveFailed'));
      }
    })();
  }, [theme, autoStart, startMinimized, closeToTray, defaultMode]);

  // Delayed skeleton -- only shows if settings load takes >200ms
  if (isLoadingSettings) {
    return <SettingsSkeleton />;
  }

  const themeOptions: { key: 'dark' | 'light' | 'system'; icon: typeof Moon; label: string }[] = [
    { key: 'dark', icon: Moon, label: t('settings.dark') },
    { key: 'light', icon: Sun, label: t('settings.light') },
    { key: 'system', icon: MonitorSmartphone, label: t('settings.system') },
  ];

  const handleSaveTelegram = async () => {
    setIsSavingTelegram(true);
    try {
      const parsedAllowedUserIds = parseTelegramUserIdsInput(telegramAllowedUserIdsInput);
      if (parsedAllowedUserIds.invalid.length > 0) {
        toast.error(
          t('settings.telegramAllowedUserIdsInvalid')
            .replace('{value}', parsedAllowedUserIds.invalid.join(', '))
        );
        return;
      }

      await saveTelegramSettings({
        enabled: telegramSettings.enabled,
        botToken: telegramSettings.botToken?.trim() || null,
        allowedUserIds: parsedAllowedUserIds.values,
        allowedChatId: telegramSettings.allowedChatId,
        notificationsThreadId: telegramSettings.notificationsThreadId,
        defaultEnvName: telegramSettings.defaultEnvName || null,
        defaultPermMode: telegramSettings.defaultPermMode || null,
        defaultWorkingDir: telegramSettings.defaultWorkingDir || null,
        topicBindings: telegramSettings.topicBindings ?? [],
        preferences: telegramSettings.preferences ?? {
          showToolCalls: true,
          showLowRiskTools: false,
          flushIntervalMs: 3000,
        },
      });
      setTelegramSettings((current) => ({
        ...current,
        allowedUserIds: parsedAllowedUserIds.values,
      }));
      setTelegramAllowedUserIdsInput(parsedAllowedUserIds.values.join(', '));
      setTelegramStatus(await getTelegramBridgeStatus());
      toast.success(t('settings.telegramSaved'));
    } catch (error) {
      toast.error(t('settings.telegramSaveFailed').replace('{error}', String(error)));
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleStartTelegram = async () => {
    setIsTogglingTelegram(true);
    try {
      const status = await startTelegramBridge();
      setTelegramStatus(status);
      toast.success(t('settings.telegramStarted'));
    } catch (error) {
      toast.error(t('settings.telegramStartFailed').replace('{error}', String(error)));
    } finally {
      setIsTogglingTelegram(false);
    }
  };

  const handleStopTelegram = async () => {
    setIsTogglingTelegram(true);
    try {
      const status = await stopTelegramBridge();
      setTelegramStatus(status);
      toast.success(t('settings.telegramStopSuccess'));
    } catch (error) {
      toast.error(t('settings.telegramStopFailed').replace('{error}', String(error)));
    } finally {
      setIsTogglingTelegram(false);
    }
  };

  return (
    <div className="page-transition-enter space-y-5">
      {/* Row 1: Appearance + Application side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Appearance */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {t('settings.appearance')}
          </h3>
          <div className="space-y-4">
            {/* Theme -- segmented control */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                {t('settings.theme')}
              </label>
              <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg glass-subtle">
                {themeOptions.map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all duration-150 ${
                      theme === key
                        ? 'seg-active text-foreground'
                        : 'seg-hover text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language -- segmented control */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                语言 / Language
              </label>
              <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg glass-subtle">
                <button
                  onClick={() => setLang('zh')}
                className={`px-3 py-1.5 rounded-md text-sm transition-all duration-150 ${
                    lang === 'zh'
                      ? 'seg-active text-foreground'
                      : 'seg-hover text-muted-foreground hover:text-foreground'
                  }`}
                >
                  中文
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`px-3 py-1.5 rounded-md text-sm transition-all duration-150 ${
                    lang === 'en'
                      ? 'seg-active text-foreground'
                      : 'seg-hover text-muted-foreground hover:text-foreground'
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Application */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {t('settings.application')}
          </h3>
          <div className="space-y-4">
            <ToggleSetting
              checked={autoStart}
              onChange={setAutoStart}
              title={t('settings.autoStart')}
              description={t('settings.autoStartDesc')}
            />
            <ToggleSetting
              checked={startMinimized}
              onChange={setStartMinimized}
              title={t('settings.startMinimized')}
              description={t('settings.startMinimizedDesc')}
            />
            <ToggleSetting
              checked={closeToTray}
              onChange={setCloseToTray}
              title={t('settings.closeToTray')}
              description={t('settings.closeToTrayDesc')}
            />

            {/* Default Working Directory */}
            <div className="pt-2 border-t glass-divider">
              <div className="mb-2">
                <div className="text-sm font-medium text-foreground">{t('settings.defaultWorkingDir')}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t('settings.defaultWorkingDirDesc')}</div>
              </div>
              {defaultWorkingDir ? (
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-sm font-mono text-foreground truncate flex-1">{defaultWorkingDir}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="glass-btn-outline h-7 text-xs"
                    onClick={async () => {
                      const path = await openDirectoryPicker();
                      if (path) await saveDefaultWorkingDir(path);
                    }}
                  >
                    {t('dashboard.changeDir')}
                  </Button>
                  <button
                    onClick={() => saveDefaultWorkingDir(null)}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="glass-btn-outline"
                  onClick={async () => {
                    const path = await openDirectoryPicker();
                    if (path) await saveDefaultWorkingDir(path);
                  }}
                >
                  <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                  {t('settings.selectDir')}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: Default Permission — full width card grid */}
      <Card className="p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            {t('settings.defaultPermission')}
          </h3>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-primary" />
            {t('settings.defaultPermissionHint')}
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(PERMISSION_PRESETS).map(([key]) => {
            const mode = key as PermissionModeName;
            const isActive = (defaultMode || 'dev') === mode;
            const ModeIcon = getModeIcon(mode);
            const displayName = MODE_DISPLAY_NAMES[mode] || key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setDefaultMode(mode)}
                className={`text-left p-3.5 rounded-lg cursor-pointer glass-mode-card ${
                  isActive ? 'active' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ModeIcon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {displayName}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground/60 ml-auto">
                    {key}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {t(`environments.permMode_${key}_desc`)}
                </p>
                {isActive && (
                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed border-t glass-divider pt-2 mt-2">
                    {t(`environments.permMode_${key}_detail`)}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              {t('settings.telegramTitle')}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t('settings.telegramDesc')}
            </p>
          </div>
          <TelegramStatusBadge status={telegramStatus} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <ToggleSetting
              checked={telegramSettings.enabled}
              onChange={(value) => setTelegramSettings((current) => ({ ...current, enabled: value }))}
              title={t('settings.telegramEnabled')}
              description={t('settings.telegramEnabledDesc')}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                {t('settings.telegramBotToken')}
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                value={telegramSettings.botToken ?? ''}
                onChange={(event) => setTelegramSettings((current) => ({ ...current, botToken: event.target.value }))}
                placeholder={t('settings.telegramBotTokenPlaceholder')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                {t('settings.telegramAllowedUserIds')}
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                value={telegramAllowedUserIdsInput}
                onChange={(event) => setTelegramAllowedUserIdsInput(event.target.value)}
                placeholder={t('settings.telegramAllowedUserIdsPlaceholder')}
              />
              <p className="text-[11px] text-muted-foreground">
                {t('settings.telegramAllowedUserIdsDesc')}
              </p>
              {telegramSettings.enabled && telegramAllowedUserIdsInput.trim().length === 0 ? (
                <p className="text-[11px] text-warning">
                  {t('settings.telegramAllowedUserIdsWarning')}
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03]">
              <button
                type="button"
                onClick={() => setShowTelegramAdvanced((current) => !current)}
                className="flex w-full items-center justify-between px-3 py-2 text-left"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{t('settings.telegramAdvanced')}</p>
                  <p className="text-[11px] text-muted-foreground">{t('settings.telegramAdvancedDesc')}</p>
                </div>
                {showTelegramAdvanced ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {showTelegramAdvanced ? (
                <div className="grid grid-cols-1 gap-4 border-t glass-divider px-3 py-3 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-muted-foreground">
                        {t('settings.telegramAllowedChatId')}
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                        value={telegramSettings.allowedChatId ?? ''}
                        onChange={(event) => setTelegramSettings((current) => ({
                          ...current,
                          allowedChatId: event.target.value ? Number(event.target.value) : null,
                        }))}
                        placeholder={t('settings.telegramAllowedChatIdPlaceholder')}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {t('settings.telegramAllowedChatIdDesc')}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-muted-foreground">
                        {t('settings.telegramNotificationsThreadId')}
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                        value={telegramSettings.notificationsThreadId ?? ''}
                        onChange={(event) => setTelegramSettings((current) => ({
                          ...current,
                          notificationsThreadId: event.target.value ? Number(event.target.value) : null,
                        }))}
                        placeholder={t('settings.telegramNotificationsThreadIdPlaceholder')}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {t('settings.telegramNotificationsThreadIdDesc')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-muted-foreground">
                        {t('settings.telegramDefaultEnv')}
                      </label>
                      <Select
                        value={telegramSettings.defaultEnvName || '__current__'}
                        onValueChange={(value) => setTelegramSettings((current) => ({
                          ...current,
                          defaultEnvName: value === '__current__' ? null : value,
                        }))}
                      >
                        <SelectTrigger className="w-full h-auto px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-sm">
                          <SelectValue placeholder={t('settings.telegramUseCurrentEnv')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__current__">{t('settings.telegramUseCurrentEnv')}</SelectItem>
                          {environments.map((env) => (
                            <SelectItem key={env.name} value={env.name}>{env.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-muted-foreground">
                        {t('settings.telegramDefaultPerm')}
                      </label>
                      <Select
                        value={telegramSettings.defaultPermMode || '__app_default__'}
                        onValueChange={(value) => setTelegramSettings((current) => ({
                          ...current,
                          defaultPermMode: value === '__app_default__' ? null : value,
                        }))}
                      >
                        <SelectTrigger className="w-full h-auto px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-sm">
                          <SelectValue placeholder={t('settings.telegramUseDefaultPerm')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__app_default__">{t('settings.telegramUseDefaultPerm')}</SelectItem>
                          {Object.keys(PERMISSION_PRESETS).map((key) => (
                            <SelectItem key={key} value={key}>{MODE_DISPLAY_NAMES[key as PermissionModeName] || key}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-muted-foreground">
                        {t('settings.telegramWorkingDir')}
                      </label>
                      <div className="flex gap-2">
                        <input
                          className="w-full px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all font-mono"
                          value={telegramSettings.defaultWorkingDir ?? ''}
                          onChange={(event) => setTelegramSettings((current) => ({ ...current, defaultWorkingDir: event.target.value || null }))}
                          placeholder={defaultWorkingDir || t('settings.telegramWorkingDirPlaceholder')}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="glass-btn-outline shrink-0"
                          onClick={async () => {
                            const path = await openDirectoryPicker();
                            if (path) {
                              setTelegramSettings((current) => ({ ...current, defaultWorkingDir: path }));
                            }
                          }}
                        >
                          <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                          {t('settings.selectDir')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t glass-divider pt-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>{t('settings.telegramStatusLine').replace('{status}', telegramStatus.running ? t('settings.telegramRunning') : t('settings.telegramStopped'))}</p>
            {telegramStatus.botUsername && (
              <p>{t('settings.telegramBotUsername').replace('{username}', telegramStatus.botUsername)}</p>
            )}
            {telegramStatus.lastError && (
              <p className="text-destructive flex items-center gap-1.5">
                <MessageSquareWarning className="w-3.5 h-3.5" />
                {telegramStatus.lastError}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="glass-btn-outline" onClick={handleSaveTelegram} disabled={isSavingTelegram}>
              {isSavingTelegram ? t('common.loading') : t('settings.telegramSave')}
            </Button>
            {telegramStatus.running ? (
              <Button variant="outline" className="glass-btn-outline" onClick={handleStopTelegram} disabled={isTogglingTelegram}>
                <Square className="w-3.5 h-3.5 mr-1.5" />
                {t('settings.telegramStop')}
              </Button>
            ) : (
              <Button onClick={handleStartTelegram} disabled={isTogglingTelegram || !(telegramSettings.botToken || '').trim()}>
                <Play className="w-3.5 h-3.5 mr-1.5" />
                {t('settings.telegramStart')}
              </Button>
            )}
          </div>
        </div>

        {showTelegramAdvanced ? (
          <TelegramTopicBindingsEditor
            bindings={telegramSettings.topicBindings ?? []}
            environmentNames={environments.map((env) => env.name)}
            defaultWorkingDir={defaultWorkingDir || null}
            onChange={(topicBindings) => setTelegramSettings((current) => ({ ...current, topicBindings }))}
            onPickDirectory={openDirectoryPicker}
            onQuickBind={() => setQuickBindOpen(true)}
          />
        ) : null}
      </Card>

      <BindToTelegramDialog
        open={quickBindOpen}
        onOpenChange={setQuickBindOpen}
        initialProjectDir={telegramSettings.defaultWorkingDir ?? defaultWorkingDir ?? null}
        initialEnvName={telegramSettings.defaultEnvName ?? null}
        initialPermMode={telegramSettings.defaultPermMode ?? null}
        onBound={(binding) => {
          setTelegramSettings((current) => {
            const topicBindings = [
              ...(current.topicBindings ?? []).filter((item) => item.threadId !== binding.threadId),
              binding,
            ].sort((left, right) => left.threadId - right.threadId);
            return { ...current, topicBindings };
          });
        }}
      />

      {/* Row 3: About */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          {t('settings.about')}
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('settings.version')}
            </span>
            <span className="text-sm font-medium text-foreground">
              v2.0.0
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('settings.webkitVersion')}
            </span>
            <span className="text-sm font-medium text-foreground font-mono">
              {webkitVersion ?? t('settings.notAvailable')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              {t('settings.cliStatus')}
            </span>
            <InstallStatusBadge status={installStatus.ccem} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('settings.claudeCodeStatus')}
            </span>
            <InstallStatusBadge status={installStatus.claude} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('settings.codexStatus')}
            </span>
            <InstallStatusBadge status={installStatus.codex} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('settings.tmuxStatus')}
            </span>
            <InstallStatusBadge status={installStatus.tmux} />
          </div>
          {installStatus.ccem === false && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(t('settings.cliInstallCmd'));
                  toast.success(t('settings.cliInstallCmd'));
                }}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:text-primary/80 glass-btn-outline px-2 py-0.5 rounded-md"
              >
                <Copy className="w-3 h-3" />
                {t('settings.cliInstallCmd')}
              </button>
            </div>
          )}
          {installStatus.ccem === false && (
            <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-primary shrink-0" />
              {t('settings.cliInstallHint')}
            </p>
          )}
          {installStatus.tmux === false && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(t('settings.tmuxInstallCmd'));
                  toast.success(t('settings.tmuxInstallCmd'));
                }}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:text-primary/80 glass-btn-outline px-2 py-0.5 rounded-md"
              >
                <Copy className="w-3 h-3" />
                {t('settings.tmuxInstallCmd')}
              </button>
            </div>
          )}
          {installStatus.tmux === false && (
            <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-primary shrink-0" />
              {t('settings.tmuxInstallHint')}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="glass-btn-outline" onClick={() => toast.info(t('settings.upToDate'))}>
              {t('settings.checkUpdate')}
            </Button>
            <Button variant="outline" size="sm" className="glass-btn-outline" onClick={() => window.open('https://github.com/anthropics/claude-code-env-manager', '_blank')}>
              GitHub
            </Button>
            <Button variant="outline" size="sm" className="glass-btn-outline" onClick={() => window.open('https://github.com/anthropics/claude-code-env-manager/issues', '_blank')}>
              {t('settings.feedback')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function InstallStatusBadge({ status }: { status: boolean | null }) {
  const { t } = useLocale();

  if (status === null) {
    return <span className="text-xs text-muted-foreground">...</span>;
  }

  if (status) {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-success">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {t('settings.cliInstalled')}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
      <XCircle className="w-3.5 h-3.5" />
      {t('settings.cliNotInstalled')}
    </span>
  );
}

function TelegramStatusBadge({ status }: { status: TelegramBridgeStatus }) {
  const { t } = useLocale();

  if (status.running) {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-success">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {t('settings.telegramRunning')}
      </span>
    );
  }

  if (status.configured) {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-warning">
        <MessageSquareWarning className="w-3.5 h-3.5" />
        {t('settings.telegramConfigured')}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
      <XCircle className="w-3.5 h-3.5" />
      {t('settings.telegramNotConfigured')}
    </span>
  );
}

function ToggleSetting({ checked, onChange, title, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`glass-toggle ${checked ? 'checked' : ''}`}
      />
      <div>
        <div className="text-sm font-medium text-foreground">
          {title}
        </div>
        <div className="text-xs text-muted-foreground">
          {description}
        </div>
      </div>
    </label>
  );
}
