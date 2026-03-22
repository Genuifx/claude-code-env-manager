import { useEffect, useState } from 'react';
import { Bot, MessageSquareWarning, Play, QrCode, Square } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/locales';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import type { WeixinBridgeStatus, WeixinLoginSession, WeixinSettings } from '@/lib/tauri-ipc';

function parsePeerIdsInput(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[\s,]+/)
        .map((part) => part.trim())
        .filter(Boolean)
    )
  );
}

function ToggleSetting({ checked, onChange, title, description, disabled }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description: string;
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
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </label>
  );
}

function getInitialSettings(): WeixinSettings {
  return {
    enabled: false,
    apiBaseUrl: 'https://ilinkai.weixin.qq.com',
    botToken: null,
    botAccountId: null,
    allowedPeerIds: [],
    defaultEnvName: null,
    defaultPermMode: null,
    defaultWorkingDir: null,
    flushIntervalMs: 3000,
  };
}

export function WeixinPanel() {
  const { t } = useLocale();
  const {
    getWeixinSettings,
    saveWeixinSettings,
    getWeixinBridgeStatus,
    startWeixinBridge,
    stopWeixinBridge,
    startWeixinLogin,
    pollWeixinLogin,
  } = useTauriCommands();

  const [settings, setSettings] = useState<WeixinSettings>(getInitialSettings);
  const [status, setStatus] = useState<WeixinBridgeStatus>({
    configured: false,
    running: false,
  });
  const [allowedPeerIdsInput, setAllowedPeerIdsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginSession, setLoginSession] = useState<WeixinLoginSession | null>(null);
  const [isStartingLogin, setIsStartingLogin] = useState(false);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  const applyLoadedSettings = (nextSettings: WeixinSettings) => {
    setSettings({
      enabled: nextSettings.enabled ?? false,
      apiBaseUrl: nextSettings.apiBaseUrl || 'https://ilinkai.weixin.qq.com',
      botToken: nextSettings.botToken ?? null,
      botAccountId: nextSettings.botAccountId ?? null,
      allowedPeerIds: nextSettings.allowedPeerIds ?? [],
      defaultEnvName: nextSettings.defaultEnvName ?? null,
      defaultPermMode: nextSettings.defaultPermMode ?? null,
      defaultWorkingDir: nextSettings.defaultWorkingDir ?? null,
      flushIntervalMs: nextSettings.flushIntervalMs ?? 3000,
    });
    setAllowedPeerIdsInput((nextSettings.allowedPeerIds ?? []).join('\n'));
  };

  const buildNormalizedSettings = (current: WeixinSettings): WeixinSettings => ({
    ...current,
    apiBaseUrl: current.apiBaseUrl.trim() || 'https://ilinkai.weixin.qq.com',
    allowedPeerIds: parsePeerIdsInput(allowedPeerIdsInput),
    defaultEnvName: current.defaultEnvName || null,
    defaultPermMode: current.defaultPermMode || null,
    defaultWorkingDir: current.defaultWorkingDir || null,
    flushIntervalMs: Math.max(500, Number(current.flushIntervalMs) || 3000),
  });

  const refreshStatus = async () => {
    const nextStatus = await getWeixinBridgeStatus();
    setStatus(nextStatus);
    return nextStatus;
  };

  const persistSettings = async (current: WeixinSettings) => {
    if (!hasLoadedSettings) {
      throw new Error('Weixin settings are still loading. Wait for the bridge status to appear first.');
    }
    const normalized = buildNormalizedSettings(current);
    await saveWeixinSettings(normalized);
    setSettings(normalized);
    setAllowedPeerIdsInput((normalized.allowedPeerIds ?? []).join('\n'));
    await refreshStatus();
    return normalized;
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [nextSettings, nextStatus] = await Promise.all([
          getWeixinSettings(),
          getWeixinBridgeStatus(),
        ]);
        if (cancelled) return;
        applyLoadedSettings(nextSettings);
        setStatus(nextStatus);
        setHasLoadedSettings(true);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load Weixin bridge state:', error);
        }
      }
    };

    void load();
    const intervalId = window.setInterval(() => {
      void getWeixinBridgeStatus()
        .then((nextStatus) => {
          if (!cancelled) {
            setStatus(nextStatus);
          }
        })
        .catch(() => {});
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [getWeixinBridgeStatus, getWeixinSettings]);

  useEffect(() => {
    if (!loginDialogOpen || !loginSession || !['pending', 'scanned'].includes(loginSession.status)) {
      return;
    }

    let cancelled = false;
    const timerId = window.setTimeout(() => {
      void pollWeixinLogin(loginSession.sessionKey)
        .then(async (nextSession) => {
          if (cancelled) return;
          setLoginSession(nextSession);

          if (nextSession.status !== 'confirmed') {
            return;
          }

          const nextSettings = await getWeixinSettings();
          if (cancelled) return;
          applyLoadedSettings(nextSettings);

          let nextStatus = await getWeixinBridgeStatus();
          if (cancelled) return;

          if (!nextStatus.running) {
            try {
              nextStatus = await startWeixinBridge();
            } catch (error) {
              toast.error(t('settings.weixinStartFailed').replace('{error}', String(error)));
            }
          }

          if (cancelled) return;
          setStatus(nextStatus);
          setLoginDialogOpen(false);
          toast.success(t('settings.weixinLoginSuccess'));
        })
        .catch((error) => {
          if (cancelled) return;
          setLoginSession((current) => current ? {
            ...current,
            status: 'failed',
            message: String(error),
          } : null);
        });
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [
    getWeixinBridgeStatus,
    getWeixinSettings,
    loginDialogOpen,
    loginSession,
    pollWeixinLogin,
    startWeixinBridge,
    t,
  ]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await persistSettings(settings);
      toast.success(t('settings.weixinSaved'));
    } catch (error) {
      toast.error(t('settings.weixinSaveFailed').replace('{error}', String(error)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStart = async () => {
    setIsToggling(true);
    try {
      await persistSettings(settings);
      setStatus(await startWeixinBridge());
      toast.success(t('settings.weixinStarted'));
    } catch (error) {
      toast.error(t('settings.weixinStartFailed').replace('{error}', String(error)));
    } finally {
      setIsToggling(false);
    }
  };

  const handleStop = async () => {
    setIsToggling(true);
    try {
      setStatus(await stopWeixinBridge());
      toast.success(t('settings.weixinStopped'));
    } catch (error) {
      toast.error(t('settings.weixinStopFailed').replace('{error}', String(error)));
    } finally {
      setIsToggling(false);
    }
  };

  const handleStartLogin = async () => {
    setIsStartingLogin(true);
    try {
      await persistSettings(settings);
      const session = await startWeixinLogin();
      setLoginSession(session);
      setLoginDialogOpen(true);
    } catch (error) {
      toast.error(t('settings.weixinLoginStartFailed').replace('{error}', String(error)));
    } finally {
      setIsStartingLogin(false);
    }
  };

  const controlsDisabled = !hasLoadedSettings;

  return (
    <>
      <Card className="p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bot className="h-4 w-4 text-primary" />
              {t('settings.weixinTitle')}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('settings.weixinDesc')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <ToggleSetting
            checked={settings.enabled}
            onChange={(enabled) => setSettings((current) => ({ ...current, enabled }))}
            title={t('settings.weixinEnabled')}
            description={t('settings.weixinEnabledDesc')}
            disabled={controlsDisabled}
          />

          <div className="grid gap-2">
            <Label htmlFor="weixin-peer-ids">{t('settings.weixinAllowedPeers')}</Label>
            <textarea
              id="weixin-peer-ids"
              value={allowedPeerIdsInput}
              onChange={(event) => setAllowedPeerIdsInput(event.target.value)}
              placeholder={t('settings.weixinAllowedPeersPlaceholder')}
              disabled={controlsDisabled}
              className="min-h-[96px] w-full rounded-xl border border-black/[0.08] bg-black/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/[0.08] dark:bg-white/[0.06]"
            />
            <p className="text-xs text-muted-foreground">{t('settings.weixinAllowedPeersDesc')}</p>
          </div>

          <div className="space-y-2 rounded-2xl border border-black/8 bg-black/[0.02] px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-sm font-medium text-foreground">{t('settings.weixinCapabilityTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('settings.weixinCapabilityDesc')}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t glass-divider pt-4">
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              {t('settings.weixinStatusLine').replace(
                '{status}',
                status.running
                  ? t('settings.weixinRunning')
                  : status.configured
                    ? t('settings.weixinConfigured')
                    : t('settings.weixinNotConfigured')
              )}
            </p>
            {settings.botAccountId ? (
              <p>{t('settings.weixinBotAccount').replace('{accountId}', settings.botAccountId)}</p>
            ) : null}
            {status.lastError ? (
              <p className="flex items-center gap-1.5 text-destructive">
                <MessageSquareWarning className="h-3.5 w-3.5" />
                {status.lastError}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="glass-btn-outline"
              onClick={handleSave}
              disabled={controlsDisabled || isSaving}
            >
              {isSaving ? t('common.loading') : t('settings.weixinSave')}
            </Button>
            <Button
              variant="outline"
              className="glass-btn-outline"
              onClick={handleStartLogin}
              disabled={controlsDisabled || isStartingLogin || status.running}
            >
              <QrCode className="mr-1.5 h-3.5 w-3.5" />
              {t('settings.weixinLogin')}
            </Button>
            {status.running ? (
              <Button
                variant="outline"
                className="glass-btn-outline"
                onClick={handleStop}
                disabled={controlsDisabled || isToggling}
              >
                <Square className="mr-1.5 h-3.5 w-3.5" />
                {t('settings.weixinStop')}
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                disabled={controlsDisabled || isToggling || !(settings.botToken || '').trim()}
              >
                <Play className="mr-1.5 h-3.5 w-3.5" />
                {t('settings.weixinStart')}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.weixinLoginTitle')}</DialogTitle>
            <DialogDescription>{loginSession?.message ?? t('settings.weixinLoginDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loginSession?.qrCodeUrl ? (
              <div className="flex justify-center rounded-2xl border border-black/8 bg-white p-4 dark:border-white/[0.08]">
                <QRCodeSVG
                  value={loginSession.qrCodeUrl}
                  size={280}
                  level="M"
                  includeMargin
                  bgColor="#ffffff"
                  fgColor="#111111"
                />
              </div>
            ) : null}
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>{t('settings.weixinLoginState').replace('{status}', loginSession?.status ?? 'pending')}</p>
              {loginSession?.botAccountId ? (
                <p>{t('settings.weixinBotAccount').replace('{accountId}', loginSession.botAccountId)}</p>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
