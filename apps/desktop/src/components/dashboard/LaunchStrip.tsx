import { useState, useRef, useEffect } from 'react';
import { FolderOpen, ChevronDown, Globe, Shield, Play, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/locales';
import { getProjectName } from '@/lib/utils';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';

interface LaunchStripProps {
  currentEnv: string;
  environments: { name: string }[];
  permissionMode: PermissionModeName;
  selectedWorkingDir: string | null;
  recentDirs: string[];
  launched: boolean;
  onSwitchEnv: (name: string) => void;
  onSetPermMode: (mode: PermissionModeName) => void;
  onSelectDir: () => void;
  onPickRecentDir: (dir: string) => void;
  onLaunch: () => void;
}

function getEnvColorClass(envName: string): string {
  const lower = envName.toLowerCase();
  if (lower === 'official') return 'bg-chart-1';
  if (lower.includes('glm')) return 'bg-chart-2';
  if (lower.includes('deepseek')) return 'bg-chart-3';
  if (lower.includes('kimi')) return 'bg-chart-4';
  if (lower.includes('minimax')) return 'bg-chart-5';
  return 'bg-primary';
}

export function LaunchStrip({
  currentEnv,
  environments,
  permissionMode,
  selectedWorkingDir,
  recentDirs,
  launched,
  onSwitchEnv,
  onSetPermMode,
  onSelectDir,
  onPickRecentDir,
  onLaunch,
}: LaunchStripProps) {
  const { t } = useLocale();
  const [dirMenuOpen, setDirMenuOpen] = useState(false);
  const dirMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dirMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dirMenuRef.current && !dirMenuRef.current.contains(e.target as Node)) {
        setDirMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dirMenuOpen]);

  const dirDisplay = selectedWorkingDir
    ? getProjectName(selectedWorkingDir)
    : t('dashboard.selectDirPlaceholder');

  return (
    <div className="h-12 flex items-center gap-0 rounded-xl glass-card glass-noise overflow-hidden">
      {/* Environment color bar */}
      <div className={`w-[3px] self-stretch flex-shrink-0 ${getEnvColorClass(currentEnv)}`} />

      {/* Environment badge + native select */}
      <div className="flex items-center px-3 border-r border-white/[0.08] h-full">
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary cursor-pointer">
            <Globe className="w-3.5 h-3.5" />
            {currentEnv}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </div>
          <select
            className="absolute inset-0 opacity-0 cursor-pointer"
            value={currentEnv}
            onChange={(e) => onSwitchEnv(e.target.value)}
          >
            {environments.map(env => (
              <option key={env.name} value={env.name}>{env.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Permission badge + native select */}
      <div className="flex items-center px-3 border-r border-white/[0.08] h-full">
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-chart-4/10 text-chart-4 cursor-pointer">
            <Shield className="w-3.5 h-3.5" />
            {permissionMode}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </div>
          <select
            className="absolute inset-0 opacity-0 cursor-pointer"
            value={permissionMode}
            onChange={(e) => onSetPermMode(e.target.value as PermissionModeName)}
          >
            {Object.keys(PERMISSION_PRESETS).map((mode) => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory section with dropdown */}
      <div className="flex-1 flex items-center px-3 min-w-0 h-full relative" ref={dirMenuRef}>
        <button
          onClick={() => setDirMenuOpen(!dirMenuOpen)}
          className="flex items-center gap-2 min-w-0 text-sm text-muted-foreground hover:text-foreground transition-colors"
          title={selectedWorkingDir || t('dashboard.selectDirPlaceholder')}
        >
          <FolderOpen className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{dirDisplay}</span>
          <ChevronDown className="w-3 h-3 opacity-60 flex-shrink-0" />
        </button>

        {dirMenuOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 rounded-xl glass-dropdown glass-noise z-50 py-1">
            {recentDirs.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-2xs text-muted-foreground uppercase tracking-wider">
                  {t('dashboard.recentDirs')}
                </div>
                {recentDirs.map((dir) => (
                  <button
                    key={dir}
                    onClick={() => { onPickRecentDir(dir); setDirMenuOpen(false); }}
                    className="glass-dropdown-item w-full text-left px-3 py-2 text-sm flex items-center gap-2"
                  >
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="truncate">{getProjectName(dir)}</span>
                  </button>
                ))}
                <div className="border-t border-white/[0.08] my-1" />
              </>
            )}
            <button
              onClick={() => { onSelectDir(); setDirMenuOpen(false); }}
              className="glass-dropdown-item w-full text-left px-3 py-2 text-sm flex items-center gap-2"
            >
              <FolderOpen className="w-3.5 h-3.5 text-primary" />
              <span>{t('dashboard.browse')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Launch button */}
      <Button
        onClick={onLaunch}
        title={t('dashboard.launchShortcut')}
        className={`h-12 px-6 rounded-none rounded-r-xl gap-2 font-medium text-sm shadow-none hover:shadow-none active:translate-y-0.5 transition-all duration-150 ${
          launched ? 'bg-success hover:bg-success' : ''
        }`}
      >
        {launched ? (
          <>
            <Check className="w-4 h-4" />
            {t('dashboard.launchBtnDone')}
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            {t('dashboard.launchBtn')}
          </>
        )}
      </Button>
    </div>
  );
}
