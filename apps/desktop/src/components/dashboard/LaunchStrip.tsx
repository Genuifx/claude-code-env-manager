import { useState } from 'react';
import { FolderOpen, ChevronDown, Globe, Shield, Check, Clock, Sparkles } from 'lucide-react';
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

function getEnvColorClass(envName: string): string {
  const lower = envName.toLowerCase();
  if (lower === 'official') return 'bg-chart-1';
  if (lower.includes('glm')) return 'bg-chart-2';
  if (lower.includes('deepseek')) return 'bg-chart-3';
  if (lower.includes('kimi')) return 'bg-chart-4';
  if (lower.includes('minimax')) return 'bg-chart-5';
  return 'bg-primary';
}

function getEnvGlowColor(envName: string): string {
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
    : t('dashboard.selectDirPlaceholder');

  const envGlow = getEnvGlowColor(currentEnv);

  return (
    <div className="relative rounded-2xl">
      {/* Ambient glow behind the strip */}
      <div
        className="absolute inset-0 opacity-[0.07] rounded-2xl pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 10% 50%, hsl(${envGlow}) 0%, transparent 60%),
                       radial-gradient(ellipse at 90% 50%, hsl(var(--primary)) 0%, transparent 50%)`,
        }}
      />

      <div className="relative h-14 flex items-center gap-0 hero-gradient glass-noise rounded-2xl">
        {/* Environment color bar */}
        <div className="relative self-stretch flex-shrink-0">
          <div className={cn('w-1 self-stretch h-full', getEnvColorClass(currentEnv))} />
          <div
            className="absolute inset-0 w-1 blur-[3px]"
            style={{ background: `hsl(${envGlow})` }}
          />
        </div>

        {/* Environment Select */}
        <div className="flex items-center px-3.5 border-r border-white/[0.06] h-full">
          <Select value={currentEnv} onValueChange={onSwitchEnv}>
            <SelectTrigger variant="badge" badgeColor="var(--primary)" className="hover:bg-primary/[0.18]">
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
        </div>

        {/* Permission Select */}
        <div className="flex items-center px-3 border-r border-white/[0.06] h-full">
          <Select value={permissionMode} onValueChange={(v) => onSetPermMode(v as PermissionModeName)}>
            <SelectTrigger variant="badge" badgeColor="var(--chart-4)" className="hover:bg-chart-4/[0.18]">
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
        </div>

        {/* Directory Popover */}
        <div className="flex-1 flex items-center px-3.5 min-w-0 h-full">
          <Popover.Root open={dirOpen} onOpenChange={setDirOpen}>
            <Popover.Trigger asChild>
              <button
                className="flex items-center gap-2 min-w-0 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={selectedWorkingDir || t('dashboard.selectDirPlaceholder')}
              >
                <FolderOpen className="w-4 h-4 flex-shrink-0 text-muted-foreground/70" />
                <span className="truncate">{dirDisplay}</span>
                <ChevronDown className="w-3 h-3 opacity-50 flex-shrink-0" />
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

        {/* Launch button */}
        <Button
          onClick={onLaunch}
          title={t('dashboard.launchShortcut')}
          className={cn(
            'h-14 px-7 rounded-none rounded-r-2xl gap-2.5 font-semibold text-sm shadow-none transition-all duration-200',
            launched
              ? 'bg-success hover:bg-success text-success-foreground shadow-[0_0_20px_hsl(var(--success)/0.3)]'
              : 'bg-primary text-primary-foreground glass-launch-btn hover:shadow-[0_0_24px_hsl(var(--primary)/0.35)]'
          )}
        >
          {launched ? (
            <>
              <Check className="w-4 h-4" />
              {t('dashboard.launchBtnDone')}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {t('dashboard.launchBtn')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
