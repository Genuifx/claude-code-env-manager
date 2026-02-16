import { useState } from 'react';
import { FolderOpen, ChevronDown, Globe, Shield, Check, Clock, Sparkles, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as Popover from '@radix-ui/react-popover';
import { useLocale } from '@/locales';
import { getProjectName } from '@/lib/utils';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import { cn } from '@/lib/utils';

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

function getEnvColorVar(envName: string): string {
  const lower = envName.toLowerCase();
  if (lower === 'official') return 'var(--chart-1)';
  if (lower.includes('glm')) return 'var(--chart-2)';
  if (lower.includes('deepseek')) return 'var(--chart-3)';
  if (lower.includes('kimi')) return 'var(--chart-4)';
  if (lower.includes('minimax')) return 'var(--chart-5)';
  return 'var(--primary)';
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
  const [dirOpen, setDirOpen] = useState(false);

  const dirDisplay = selectedWorkingDir
    ? getProjectName(selectedWorkingDir)
    : null;

  const envColor = getEnvColorVar(currentEnv);

  return (
    <div className="stat-card glass-noise relative overflow-visible p-0">
      {/* Env color accent — top edge glow */}
      <div
        className="absolute top-0 left-4 right-4 h-[2px] rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent 0%, hsl(${envColor}) 30%, hsl(${envColor}) 70%, transparent 100%)`,
          boxShadow: `0 0 12px hsl(${envColor} / 0.4)`,
        }}
      />

      {/* Row 1: Config selectors */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-2.5">
        {/* Environment */}
        <Select value={currentEnv} onValueChange={onSwitchEnv}>
          <SelectTrigger variant="badge" badgeColor={envColor} className="hover:bg-white/[0.08]">
            <Globe className="w-3.5 h-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {environments.map(env => (
              <SelectItem key={env.name} value={env.name}>
                {env.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Permission */}
        <Select value={permissionMode} onValueChange={(v) => onSetPermMode(v as PermissionModeName)}>
          <SelectTrigger variant="badge" badgeColor="var(--chart-4)" className="hover:bg-white/[0.08]">
            <Shield className="w-3.5 h-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(PERMISSION_PRESETS).map((mode) => (
              <SelectItem key={mode} value={mode}>
                {mode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Directory */}
      <Popover.Root open={dirOpen} onOpenChange={setDirOpen}>
          <Popover.Trigger asChild>
            <button
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                'bg-white/[0.06] text-muted-foreground hover:bg-white/[0.10] hover:text-foreground'
              )}
              title={selectedWorkingDir || t('dashboard.selectDirPlaceholder')}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="truncate max-w-[180px]">
                {dirDisplay || t('dashboard.selectDirPlaceholder')}
              </span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="w-72 rounded-xl glass-dropdown glass-noise z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150"
              sideOffset={8}
              align="start"
            >
              {recentDirs.length > 0 && (
                <>
                  <div className="px-3.5 py-1.5 text-2xs text-muted-foreground/70 uppercase tracking-wider font-medium">
                    {t('dashboard.recentDirs')}
                  </div>
                  {recentDirs.map((dir) => (
                    <button
                      key={dir}
                      onClick={() => { onPickRecentDir(dir); setDirOpen(false); }}
                      className="glass-dropdown-item w-full text-left px-3.5 py-2 text-sm flex items-center gap-2.5 rounded-lg mx-1 max-w-[calc(100%-8px)] cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                      <span className="truncate">{getProjectName(dir)}</span>
                    </button>
                  ))}
                  <div className="border-t border-white/[0.06] my-1.5 mx-3" />
                </>
              )}
              <button
                onClick={() => { onSelectDir(); setDirOpen(false); }}
                className="glass-dropdown-item w-full text-left px-3.5 py-2 text-sm flex items-center gap-2.5 rounded-lg mx-1 max-w-[calc(100%-8px)] cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="font-medium">{t('dashboard.browse')}</span>
              </button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      {/* Row 2: Launch button — full width, prominent */}
      <div className="px-4 pb-4 pt-1">
        <button
          onClick={onLaunch}
          title={t('dashboard.launchShortcut')}
          className={cn(
            'w-full h-11 rounded-xl flex items-center justify-center gap-2.5',
            'font-semibold text-sm tracking-wide',
            'transition-all duration-200 cursor-pointer',
            launched
              ? 'bg-success text-success-foreground shadow-[0_0_20px_hsl(var(--success)/0.25)]'
              : 'bg-primary text-primary-foreground glass-launch-btn hover:brightness-110 active:scale-[0.99]'
          )}
        >
          {launched ? (
            <>
              <Check className="w-4 h-4" />
              {t('dashboard.launchBtnDone')}
            </>
          ) : (
            <>
              <Terminal className="w-4 h-4" />
              {t('dashboard.launchBtn')}
              <kbd className="ml-1 text-2xs opacity-60 font-mono bg-white/[0.12] px-1.5 py-0.5 rounded">⌘↵</kbd>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
