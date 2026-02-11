import { useState, useEffect, useRef } from 'react';
import { Moon, Sun, MonitorSmartphone, Lightbulb, Terminal, CheckCircle2, XCircle, Copy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import { useLocale } from '../locales';
import { SettingsSkeleton } from '@/components/ui/skeleton-states';

export function Settings() {
  const { defaultMode, setDefaultMode, isLoadingSettings } = useAppStore();
  const { t, lang, setLang } = useLocale();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [autoStart, setAutoStart] = useState(false);
  const [startMinimized, setStartMinimized] = useState(false);
  const [closeToTray, setCloseToTray] = useState(true);
  const [ccemInstalled, setCcemInstalled] = useState<boolean | null>(null);
  const loaded = useRef(false);

  // Check if ccem CLI is installed
  useEffect(() => {
    invoke<boolean>('check_ccem_installed')
      .then(setCcemInstalled)
      .catch(() => setCcemInstalled(false));
  }, []);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await invoke<{ theme: string; autoStart: boolean; startMinimized: boolean; closeToTray: boolean; defaultMode: string }>('get_settings');
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
      } catch {
        localStorage.setItem('ccem-settings', JSON.stringify(settings));
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

  return (
    <div className="page-transition-enter space-y-6">
      <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Appearance */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t('settings.appearance')}
        </h3>
        <div className="space-y-4">
          {/* Theme -- segmented control */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
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
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Language -- segmented control */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
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
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
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
        </div>
      </Card>

      {/* Default Permission */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t('settings.defaultPermission')}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('settings.defaultPermissionMode')}
            </label>
            <select
              value={defaultMode || 'dev'}
              onChange={(e) => setDefaultMode(e.target.value as PermissionModeName)}
              className="w-full px-3 py-2 rounded-lg glass-select text-sm"
            >
              {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {key} - {preset.description}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted-foreground">
              <Lightbulb className="w-3.5 h-3.5 inline mr-1 text-primary" /> {t('settings.defaultPermissionHint')}
            </p>
          </div>
        </div>
      </Card>

      {/* About */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t('settings.about')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('settings.version')}
            </span>
            <span className="text-sm font-medium text-foreground">
              v2.0.0
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              {t('settings.cliStatus')}
            </span>
            {ccemInstalled === null ? (
              <span className="text-xs text-muted-foreground">...</span>
            ) : ccemInstalled ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('settings.cliInstalled')}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <XCircle className="w-3.5 h-3.5" />
                  {t('settings.cliNotInstalled')}
                </span>
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
          </div>
          {ccemInstalled === false && (
            <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-primary shrink-0" />
              {t('settings.cliInstallHint')}
            </p>
          )}
          <div className="flex gap-2">
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
    </div>
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
