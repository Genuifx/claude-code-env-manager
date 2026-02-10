import { FolderOpen, ChevronDown, Globe, Shield } from 'lucide-react';
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
  launched: boolean;
  onSwitchEnv: (name: string) => void;
  onSetPermMode: (mode: PermissionModeName) => void;
  onSelectDir: () => void;
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
  launched,
  onSwitchEnv,
  onSetPermMode,
  onSelectDir,
  onLaunch,
}: LaunchStripProps) {
  const { t } = useLocale();

  return (
    <div className="h-14 flex items-center gap-0 rounded-lg bg-card border border-border overflow-hidden">
      {/* Environment color bar */}
      <div className={`w-[3px] self-stretch ${getEnvColorClass(currentEnv)}`} />

      {/* Environment badge + native select */}
      <div className="flex items-center gap-2 px-4 border-r border-border/50">
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
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
      <div className="flex items-center gap-2 px-4 border-r border-border/50">
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-chart-4/10 text-chart-4">
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

      {/* Directory section */}
      <div className="flex-1 flex items-center gap-2 px-4 min-w-0">
        <button
          onClick={onSelectDir}
          className="flex items-center gap-2 min-w-0 text-sm text-muted-foreground hover:text-foreground transition-colors"
          title={selectedWorkingDir || t('dashboard.selectDirPlaceholder')}
        >
          <FolderOpen className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            {selectedWorkingDir
              ? getProjectName(selectedWorkingDir)
              : t('dashboard.selectDirPlaceholder')}
          </span>
        </button>
      </div>

      {/* Launch button — NO Rocket icon (taste spec) */}
      <Button
        onClick={onLaunch}
        title={t('dashboard.launchShortcut')}
        className="h-14 px-6 rounded-none rounded-r-xl gap-2 font-medium text-sm shadow-none hover:shadow-none active:translate-y-0.5 active:shadow-md transition-all duration-150"
      >
        {launched ? t('dashboard.launchBtnDone') : t('dashboard.launchBtn')}
      </Button>
    </div>
  );
}
