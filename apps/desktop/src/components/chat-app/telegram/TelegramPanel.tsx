import { useState, useEffect } from 'react';
import { Bot, Play, Square, MessageSquareWarning, ChevronDown, ChevronUp, FolderOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import { useLocale } from '@/locales';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TelegramBridgeStatus, TelegramSettings } from '@/lib/tauri-ipc';
import { TelegramTopicBindingsEditor } from './TelegramTopicBindingsEditor';
import { TelegramStatusBadge } from './TelegramStatusBadge';
import { BindToTelegramDialog } from '@/components/telegram/BindToTelegramDialog';

const MODE_DISPLAY_NAMES: Record<PermissionModeName, string> = {
  yolo: 'YOLO',
  dev: 'Developer',
  readonly: 'Read Only',
  safe: 'Safe',
  ci: 'CI / CD',
  audit: 'Audit',
};

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

function telegramStatusEqual(left: TelegramBridgeStatus, right: TelegramBridgeStatus) {
  return left.configured === right.configured
    && left.running === right.running
    && left.botUsername === right.botUsername
    && left.lastError === right.lastError
    && left.allowedChatId === right.allowedChatId;
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

export function TelegramPanel() {
  const { t } = useLocale();
  const { defaultWorkingDir, environments } = useAppStore();
  const {
    openDirectoryPicker,
    getTelegramSettings,
    saveTelegramSettings,
    getTelegramBridgeStatus,
    startTelegramBridge,
    stopTelegramBridge,
  } = useTauriCommands();

  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    enabled: false,
    botToken: '',
    allowedUserIds: [],
    allowedChatId: null,
    notificationsChatId: null,
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

  // Load telegram settings + poll status every 5s
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
          notificationsChatId: settings.notificationsChatId ?? null,
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
        setTelegramStatus((current) => (telegramStatusEqual(current, status) ? current : status));
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
          setTelegramStatus((current) => (telegramStatusEqual(current, status) ? current : status));
        }
      }).catch(() => {});
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [getTelegramBridgeStatus, getTelegramSettings]);

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
        notificationsChatId: telegramSettings.notificationsChatId,
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
    <>
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
                        {t('settings.telegramNotificationsChatId')}
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                        value={telegramSettings.notificationsChatId ?? ''}
                        onChange={(event) => setTelegramSettings((current) => ({
                          ...current,
                          notificationsChatId: event.target.value ? Number(event.target.value) : null,
                        }))}
                        placeholder={t('settings.telegramNotificationsChatIdPlaceholder')}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {t('settings.telegramNotificationsChatIdDesc')}
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
    </>
  );
}
