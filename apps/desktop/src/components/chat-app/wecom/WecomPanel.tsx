import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Circle,
  FolderOpen,
  KeyRound,
  Play,
  Plus,
  Save,
  Square,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/locales';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import type { WecomBotConfig, WecomBridgeStatus, WecomSettings } from '@/lib/tauri-ipc';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';

const INPUT_CLS =
  'w-full px-3.5 py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all';

const TEXTAREA_CLS = `${INPUT_CLS} min-h-[74px] resize-y`;
const INTENT_WEEKLY = 'weekly_report';

const MODE_DISPLAY_NAMES: Record<PermissionModeName, string> = {
  yolo: 'YOLO',
  dev: 'Developer',
  readonly: 'Read Only',
  safe: 'Safe',
  ci: 'CI / CD',
  audit: 'Audit',
};

function blankBot(): WecomBotConfig {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `bot-${Date.now()}`,
    name: '',
    botId: '',
    secret: '',
    enabled: true,
    workspaceDir: '',
    adminUserIds: [],
    allowedUserIds: [],
    allowedGroupChatIds: [],
    allowedIntents: [INTENT_WEEKLY],
    requireMention: false,
    mentionPatterns: [],
    adminPermMode: 'dev',
    userPermMode: 'readonly',
    defaultEnvName: null,
    wsUrl: 'wss://openws.work.weixin.qq.com',
  };
}

function splitLines(value: string): string[] {
  return Array.from(new Set(value.split(/[\s,]+/).map((part) => part.trim()).filter(Boolean)));
}

function joinLines(value: string[] | undefined): string {
  return (value ?? []).join('\n');
}

function ToggleSetting({ checked, onChange, title, disabled }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`glass-toggle ${checked ? 'checked' : ''}`}
      />
      <span className="text-sm font-medium text-foreground">{title}</span>
    </label>
  );
}

export function WecomPanel() {
  const { t } = useLocale();
  const environments = useAppStore((state) => state.environments);
  const {
    openDirectoryPicker,
    getWecomSettings,
    saveWecomSettings,
    getWecomBridgeStatus,
    startWecomBridge,
    stopWecomBridge,
  } = useTauriCommands();

  const [settings, setSettings] = useState<WecomSettings>({ enabled: false, bots: [] });
  const [status, setStatus] = useState<WecomBridgeStatus>({
    configured: false,
    running: false,
    activeBotCount: 0,
    bots: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const envNames = useMemo(() => Object.keys(environments).sort(), [environments]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [nextSettings, nextStatus] = await Promise.all([
          getWecomSettings(),
          getWecomBridgeStatus(),
        ]);
        if (cancelled) return;
        setSettings({
          enabled: nextSettings.enabled ?? false,
          bots: (nextSettings.bots ?? []).map((bot) => ({ ...blankBot(), ...bot })),
        });
        setStatus(nextStatus);
      } catch (error) {
        if (!cancelled) console.error('Failed to load WeCom settings:', error);
      }
    };

    void load();
    const intervalId = window.setInterval(() => {
      void getWecomBridgeStatus().then((nextStatus) => {
        if (!cancelled) setStatus(nextStatus);
      }).catch(() => {});
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [getWecomBridgeStatus, getWecomSettings]);

  const updateBot = (id: string, patch: Partial<WecomBotConfig>) => {
    setSettings((current) => ({
      ...current,
      bots: current.bots.map((bot) => (bot.id === id ? { ...bot, ...patch } : bot)),
    }));
  };

  const persistSettings = async () => {
    const normalized: WecomSettings = {
      enabled: settings.enabled,
      bots: settings.bots.map((bot) => ({
        ...bot,
        name: bot.name?.trim() ?? '',
        botId: bot.botId.trim(),
        secret: bot.secret?.trim() || null,
        workspaceDir: bot.workspaceDir.trim(),
        adminUserIds: splitLines(joinLines(bot.adminUserIds)),
        allowedUserIds: splitLines(joinLines(bot.allowedUserIds)),
        allowedGroupChatIds: splitLines(joinLines(bot.allowedGroupChatIds)),
        mentionPatterns: splitLines(joinLines(bot.mentionPatterns)),
        allowedIntents: bot.allowedIntents?.length ? bot.allowedIntents : [INTENT_WEEKLY],
        wsUrl: bot.wsUrl?.trim() || 'wss://openws.work.weixin.qq.com',
        defaultEnvName: bot.defaultEnvName || null,
      })),
    };
    await saveWecomSettings(normalized);
    setSettings(normalized);
    setStatus(await getWecomBridgeStatus());
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await persistSettings();
      toast.success(t('settings.wecomSaved'));
    } catch (error) {
      toast.error(t('settings.wecomSaveFailed').replace('{error}', String(error)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStart = async () => {
    setIsToggling(true);
    try {
      await persistSettings();
      setStatus(await startWecomBridge());
      toast.success(t('settings.wecomStarted'));
    } catch (error) {
      toast.error(t('settings.wecomStartFailed').replace('{error}', String(error)));
    } finally {
      setIsToggling(false);
    }
  };

  const handleStop = async () => {
    setIsToggling(true);
    try {
      setStatus(await stopWecomBridge());
      toast.success(t('settings.wecomStopSuccess'));
    } catch (error) {
      toast.error(t('settings.wecomStopFailed').replace('{error}', String(error)));
    } finally {
      setIsToggling(false);
    }
  };

  const runningLabel = status.running
    ? t('settings.wecomRunning').replace('{count}', String(status.activeBotCount ?? 0))
    : t('settings.wecomStopped');

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${status.running ? 'bg-success/10' : 'bg-muted/10'}`}>
              <Circle className={`h-3 w-3 ${status.running ? 'fill-success text-success' : 'fill-muted-foreground/40 text-muted-foreground/40'}`} />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{runningLabel}</div>
              {status.lastError && <div className="mt-1 text-xs text-destructive">{status.lastError}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleSave} disabled={isSaving || isToggling}>
              <Save className="mr-2 h-4 w-4" />
              {t('common.save')}
            </Button>
            {status.running ? (
              <Button variant="destructive" size="sm" onClick={handleStop} disabled={isToggling}>
                <Square className="mr-2 h-4 w-4" />
                {t('settings.stopBridge')}
              </Button>
            ) : (
              <Button size="sm" onClick={handleStart} disabled={isToggling || settings.bots.length === 0}>
                <Play className="mr-2 h-4 w-4" />
                {t('settings.startBridge')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <ToggleSetting
          checked={settings.enabled}
          onChange={(enabled) => setSettings((current) => ({ ...current, enabled }))}
          title={t('settings.wecomEnable')}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSettings((current) => ({ ...current, bots: [...current.bots, blankBot()] }))}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('settings.wecomAddBot')}
        </Button>
      </div>

      <div className="space-y-4">
        {settings.bots.map((bot, index) => {
          const botStatus = status.bots?.find((item) => item.id === bot.id || item.botId === bot.botId);
          return (
            <div key={bot.id} className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">
                    {bot.name || t('settings.wecomBotTitle').replace('{index}', String(index + 1))}
                  </span>
                  {botStatus?.running && <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">{t('settings.running')}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <ToggleSetting
                    checked={bot.enabled}
                    onChange={(enabled) => updateBot(bot.id, { enabled })}
                    title={t('settings.enabled')}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSettings((current) => ({ ...current, bots: current.bots.filter((item) => item.id !== bot.id) }))}
                    aria-label={t('settings.wecomRemoveBot')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2">
                  <Label>{t('settings.wecomBotName')}</Label>
                  <input className={INPUT_CLS} value={bot.name ?? ''} onChange={(e) => updateBot(bot.id, { name: e.target.value })} />
                </label>
                <label className="space-y-2">
                  <Label>{t('settings.wecomBotId')}</Label>
                  <input className={INPUT_CLS} value={bot.botId} onChange={(e) => updateBot(bot.id, { botId: e.target.value })} />
                </label>
                <label className="space-y-2">
                  <Label>{t('settings.wecomSecret')}</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                    <input
                      type="password"
                      className={`${INPUT_CLS} pl-9`}
                      value={bot.secret ?? ''}
                      onChange={(e) => updateBot(bot.id, { secret: e.target.value })}
                    />
                  </div>
                </label>
                <label className="space-y-2">
                  <Label>{t('settings.wecomWorkspace')}</Label>
                  <div className="flex gap-2">
                    <input className={INPUT_CLS} value={bot.workspaceDir} onChange={(e) => updateBot(bot.id, { workspaceDir: e.target.value })} />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        const picked = await openDirectoryPicker();
                        if (picked) updateBot(bot.id, { workspaceDir: picked });
                      }}
                      aria-label={t('common.browse')}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </label>

                <label className="space-y-2">
                  <Label>{t('settings.wecomAdminUsers')}</Label>
                  <textarea className={TEXTAREA_CLS} value={joinLines(bot.adminUserIds)} onChange={(e) => updateBot(bot.id, { adminUserIds: splitLines(e.target.value) })} />
                </label>
                <label className="space-y-2">
                  <Label>{t('settings.wecomAllowedUsers')}</Label>
                  <textarea className={TEXTAREA_CLS} value={joinLines(bot.allowedUserIds)} onChange={(e) => updateBot(bot.id, { allowedUserIds: splitLines(e.target.value) })} />
                </label>
                <label className="space-y-2">
                  <Label>{t('settings.wecomAllowedGroups')}</Label>
                  <textarea className={TEXTAREA_CLS} value={joinLines(bot.allowedGroupChatIds)} onChange={(e) => updateBot(bot.id, { allowedGroupChatIds: splitLines(e.target.value) })} />
                </label>
                <label className="space-y-2">
                  <Label>{t('settings.wecomMentionPatterns')}</Label>
                  <textarea className={TEXTAREA_CLS} value={joinLines(bot.mentionPatterns)} onChange={(e) => updateBot(bot.id, { mentionPatterns: splitLines(e.target.value) })} />
                </label>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t('settings.wecomEnv')}</Label>
                  <Select value={bot.defaultEnvName ?? '__current__'} onValueChange={(value) => updateBot(bot.id, { defaultEnvName: value === '__current__' ? null : value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__current__">{t('settings.telegramUseCurrentEnv')}</SelectItem>
                      {envNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.wecomAdminPerm')}</Label>
                  <Select value={bot.adminPermMode} onValueChange={(value) => updateBot(bot.id, { adminPermMode: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(PERMISSION_PRESETS).map((mode) => (
                        <SelectItem key={mode} value={mode}>{MODE_DISPLAY_NAMES[mode as PermissionModeName] ?? mode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.wecomUserPerm')}</Label>
                  <Select value={bot.userPermMode} onValueChange={(value) => updateBot(bot.id, { userPermMode: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(PERMISSION_PRESETS).map((mode) => (
                        <SelectItem key={mode} value={mode}>{MODE_DISPLAY_NAMES[mode as PermissionModeName] ?? mode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <ToggleSetting
                  checked={bot.allowedIntents.includes(INTENT_WEEKLY)}
                  onChange={(enabled) => updateBot(bot.id, { allowedIntents: enabled ? [INTENT_WEEKLY] : [] })}
                  title={t('settings.wecomWeeklyIntent')}
                />
                <ToggleSetting
                  checked={bot.requireMention}
                  onChange={(requireMention) => updateBot(bot.id, { requireMention })}
                  title={t('settings.wecomRequireMention')}
                />
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {t('settings.wecomUserBoundary')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
