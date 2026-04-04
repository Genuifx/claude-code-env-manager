import { useState, useEffect, useRef } from 'react';
import { Moon, Sun, MonitorSmartphone, Lightbulb, Terminal, CheckCircle2, XCircle, Copy, Shield, ShieldCheck, ShieldOff, ShieldAlert, ShieldBan, Search, FolderOpen, X, Sparkles, Clock, Image } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useAppStore } from '@/store';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import { useLocale } from '../locales';
import { SettingsSkeleton } from '@/components/ui/skeleton-states';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { setPerformancePreference as applyPerformancePreference, type PerformancePreference } from '@/lib/performance';
import { shallow } from 'zustand/shallow';

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

function normalizePerformanceMode(value: unknown): PerformancePreference {
  if (value === 'default' || value === 'reduced' || value === 'auto') {
    return value;
  }

  return 'auto';
}

export function Settings() {
  const { defaultMode, setDefaultMode, isLoadingSettings, defaultWorkingDir, environments } = useAppStore(
    (state) => ({
      defaultMode: state.defaultMode,
      setDefaultMode: state.setDefaultMode,
      isLoadingSettings: state.isLoadingSettings,
      defaultWorkingDir: state.defaultWorkingDir,
      environments: state.environments,
    }),
    shallow
  );
  const { t, lang, setLang } = useLocale();
  const {
    openDirectoryPicker,
    saveDefaultWorkingDir,
  } = useTauriCommands();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [performanceMode, setPerformanceMode] = useState<PerformancePreference>('auto');
  const [autoStart, setAutoStart] = useState(false);
  const [startMinimized, setStartMinimized] = useState(false);
  const [closeToTray, setCloseToTray] = useState(true);
  const [installStatus, setInstallStatus] = useState<InstallStatusState>({
    ccem: null,
    claude: null,
    codex: null,
    tmux: null,
  });
  const [aiEnhanced, setAiEnhanced] = useState(false);
  const [aiEnvName, setAiEnvName] = useState<string | null>(null);
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
        const settings = await invoke<{
          theme: string;
          autoStart: boolean;
          startMinimized: boolean;
          closeToTray: boolean;
          defaultMode: string | null;
          performanceMode?: PerformancePreference;
          aiEnhanced: boolean;
          aiEnvName: string | null;
        }>('get_settings');
        const nextPerformanceMode = normalizePerformanceMode(settings.performanceMode);
        setTheme(settings.theme as 'light' | 'dark' | 'system');
        setPerformanceMode(nextPerformanceMode);
        setAutoStart(settings.autoStart);
        setStartMinimized(settings.startMinimized);
        setCloseToTray(settings.closeToTray);
        setAiEnhanced(settings.aiEnhanced ?? false);
        setAiEnvName(settings.aiEnvName ?? null);
        applyPerformancePreference(nextPerformanceMode);
        localStorage.setItem('ccem-settings', JSON.stringify({
          ...settings,
          performanceMode: nextPerformanceMode,
        }));
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
            const nextPerformanceMode = normalizePerformanceMode(settings.performanceMode);
            setPerformanceMode(nextPerformanceMode);
            setAutoStart(settings.autoStart ?? false);
            setStartMinimized(settings.startMinimized ?? false);
            setCloseToTray(settings.closeToTray ?? true);
            applyPerformancePreference(nextPerformanceMode);
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

  useEffect(() => {
    applyPerformancePreference(performanceMode);
  }, [performanceMode]);

  // Auto-save whenever settings change (skip initial load)
  useEffect(() => {
    if (!loaded.current) return;
    const settings = {
      theme,
      autoStart,
      startMinimized,
      closeToTray,
      defaultMode,
      performanceMode,
      aiEnhanced,
      aiEnvName,
    };
    localStorage.setItem('ccem-settings', JSON.stringify(settings));
    (async () => {
      try {
        await invoke('save_settings', { settings });
      } catch (e) {
        toast.error(t('settings.saveFailed'));
      }
    })();
  }, [theme, autoStart, startMinimized, closeToTray, defaultMode, performanceMode, aiEnhanced, aiEnvName]);

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

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t('settings.performanceMode')}
              </label>
              <p className="text-xs text-muted-foreground/80 mb-2">
                {t('settings.performanceModeDesc')}
              </p>
              <Select
                value={performanceMode}
                onValueChange={(value) => setPerformanceMode(value as PerformancePreference)}
              >
                <SelectTrigger className="w-full h-auto px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t('settings.performanceModeAuto')}</SelectItem>
                  <SelectItem value="reduced">{t('settings.performanceModeReduced')}</SelectItem>
                  <SelectItem value="default">{t('settings.performanceModeDefault')}</SelectItem>
                </SelectContent>
              </Select>
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
          </div>
        </Card>
      </div>

      {/* Row 2: AI Enhancement */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {t('settings.aiEnhancement')}
        </h3>
        <div className="space-y-4">
          {/* Default Working Directory */}
          <div>
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
                  {t('workspace.changeDir')}
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

          <div className="pt-2 border-t glass-divider">
            <ToggleSetting
              checked={aiEnhanced}
              onChange={setAiEnhanced}
              title={t('settings.aiEnhancementToggle')}
              description={t('settings.aiEnhancementToggleDesc')}
            />
          </div>

          <div className={`space-y-3 transition-opacity duration-150 ${aiEnhanced ? '' : 'opacity-50 pointer-events-none'}`}>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t('settings.aiEnhancementEnv')}
              </label>
              <p className="text-xs text-muted-foreground/80 mb-2">{t('settings.aiEnhancementEnvDesc')}</p>
              <Select value={aiEnvName ?? '__default__'} onValueChange={(v) => setAiEnvName(v === '__default__' ? null : v)}>
                <SelectTrigger className="w-full h-auto px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-sm">
                  <SelectValue placeholder={t('settings.aiEnhancementEnvPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">{t('settings.aiEnhancementEnvPlaceholder')}</SelectItem>
                  {environments.map((env) => (
                    <SelectItem key={env.name} value={env.name}>{env.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 border-t glass-divider">
              <p className="text-xs text-muted-foreground mb-2">{t('settings.aiEnhancementFeatures')}</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Search className="w-3.5 h-3.5 text-primary shrink-0" />
                  {t('settings.aiEnhancementFeatureSkill')}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                  {t('settings.aiEnhancementFeatureCron')}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Image className="w-3.5 h-3.5 text-primary shrink-0" />
                  {t('settings.aiEnhancementFeaturePoster')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Row 3: Default Permission — full width card grid */}
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

      {/* Row 4: About */}
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
