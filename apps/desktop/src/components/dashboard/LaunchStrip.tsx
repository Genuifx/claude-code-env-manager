import { useState } from 'react';
import { FolderOpen, ChevronDown, Globe, Shield, Clock, Copy, Rocket, TerminalSquare } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as Popover from '@radix-ui/react-popover';
import { useLocale } from '@/locales';
import { getProjectName, cn } from '@/lib/utils';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import { LaunchButton } from '@/components/ui/LaunchButton';
import type { LaunchClient } from '@/store';

interface LaunchStripProps {
  launchClient: LaunchClient;
  codexInstalled: boolean;
  currentEnv: string;
  environments: { name: string }[];
  permissionMode: PermissionModeName;
  selectedWorkingDir: string | null;
  recentDirs: string[];
  launched: boolean;
  bindCopied: boolean;
  onSetLaunchClient: (client: LaunchClient) => void;
  onSwitchEnv: (name: string) => void;
  onSetPermMode: (mode: PermissionModeName) => void;
  onSelectDir: () => void;
  onPickRecentDir: (dir: string) => void;
  onLaunch: () => void;
  onCopyBind: () => void;
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
  launchClient,
  codexInstalled,
  currentEnv,
  environments,
  permissionMode,
  selectedWorkingDir,
  recentDirs,
  launched,
  bindCopied,
  onSetLaunchClient,
  onSwitchEnv,
  onSetPermMode,
  onSelectDir,
  onPickRecentDir,
  onLaunch,
  onCopyBind,
}: LaunchStripProps) {
  const { t } = useLocale();
  const [dirOpen, setDirOpen] = useState(false);
  const isCodex = launchClient === 'codex';

  const dirDisplay = selectedWorkingDir
    ? getProjectName(selectedWorkingDir)
    : null;

  const envColor = getEnvColorVar(currentEnv);

  return (
    <div className="hero-gradient glass-noise relative overflow-visible rounded-2xl">
      {/* Ambient glow orb — env colored, top-right */}
      <div
        className="absolute -top-8 -right-8 w-40 h-40 rounded-full blur-[60px] pointer-events-none opacity-[0.15]"
        style={{ background: `hsl(${envColor})` }}
      />
      {/* Secondary glow — bottom-left */}
      <div
        className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full blur-[50px] pointer-events-none opacity-[0.08]"
        style={{ background: `hsl(${envColor})` }}
      />

      {/* Top edge glow line */}
      <div
        className="absolute top-0 left-6 right-6 h-[2px] rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent 0%, hsl(${envColor}) 30%, hsl(${envColor}) 70%, transparent 100%)`,
          boxShadow: `0 0 16px hsl(${envColor} / 0.5)`,
        }}
      />

      <div className="relative flex flex-col items-center px-6 pt-12 pb-8">
        {/* App icon — light mode only */}
        <img src="/logo.png" alt="" aria-hidden="true" className="dashboard-brand-mark mb-8" />

        {/* Launch button — hero CTA */}
        <LaunchButton
          onClick={onLaunch}
          launched={launched}
          size="lg"
          icon={<Rocket className="w-[18px] h-[18px]" />}
          shortcut="⌘↵"
          className="w-full max-w-[320px]"
        >
          {launched ? t('dashboard.launchBtnDone') : t('dashboard.launchBtn')}
        </LaunchButton>

        {/* Config selectors — secondary row */}
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          {/* Client */}
          <Select
            value={launchClient}
            onValueChange={(value) => onSetLaunchClient(value as LaunchClient)}
          >
            <SelectTrigger variant="badge" badgeColor="var(--chart-2)" className="hover:bg-white/[0.08]">
              <TerminalSquare className="w-3.5 h-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude">Claude</SelectItem>
              <SelectItem value="codex" disabled={!codexInstalled}>Codex</SelectItem>
            </SelectContent>
          </Select>

          {!isCodex && (
            <>
              <span className="text-muted-foreground/20 text-xs select-none">·</span>

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

              <span className="text-muted-foreground/20 text-xs select-none">·</span>

              {/* Permission */}
              <Select
                value={permissionMode}
                onValueChange={(v) => onSetPermMode(v as PermissionModeName)}
              >
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
            </>
          )}

          <span className="text-muted-foreground/20 text-xs select-none">·</span>

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
                <span className="truncate max-w-[160px]">
                  {dirDisplay || t('dashboard.selectDirPlaceholder')}
                </span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </Popover.Trigger>

            <Popover.Portal>
              <Popover.Content
                className="w-72 rounded-xl glass-dropdown glass-noise z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150"
                sideOffset={8}
                align="center"
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

          <span className="text-muted-foreground/20 text-xs select-none">·</span>

          <button
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors',
              selectedWorkingDir
                ? 'bg-white/[0.06] text-muted-foreground hover:bg-white/[0.10] hover:text-foreground'
                : 'bg-white/[0.04] text-muted-foreground/40 cursor-not-allowed'
            )}
            title={t('telegram.copyBindCommand')}
            disabled={!selectedWorkingDir}
            onClick={onCopyBind}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{bindCopied ? t('telegram.bindCopiedShort') : t('telegram.copyBindShort')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
