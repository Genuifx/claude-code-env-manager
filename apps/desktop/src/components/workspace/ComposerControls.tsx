import { useState, useEffect, useMemo } from 'react';
import {
  Check,
  ChevronDown,
  Gauge,
  Search,
  Shield,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { ModelIcon } from '@/components/history/ModelIcon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import type { Environment } from '@/store';
import { resolveEnvironmentIconHint } from '@/components/workspace/sessionTreeIcons';

export type EffortLevel = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export function normalizePermissionModeName(mode: string | null | undefined): PermissionModeName {
  if (mode && mode in PERMISSION_PRESETS) {
    return mode as PermissionModeName;
  }
  return 'readonly';
}

const CLAUDE_EFFORT_LEVELS: EffortLevel[] = ['low', 'medium', 'high', 'xhigh', 'max'];
const CODEX_EFFORT_LEVELS: EffortLevel[] = ['minimal', 'low', 'medium', 'high', 'xhigh'];

const EFFORT_I18N_KEYS: Record<EffortLevel, string> = {
  minimal: 'workspace.effortMinimal',
  low: 'workspace.effortLow',
  medium: 'workspace.effortMedium',
  high: 'workspace.effortHigh',
  xhigh: 'workspace.effortXhigh',
  max: 'workspace.effortMax',
};

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

function isRiskyPermissionMode(mode: PermissionModeName) {
  return mode === 'yolo';
}

export function providerDisplayName(client: string) {
  if (client === 'codex') return 'Codex';
  if (client === 'opencode') return 'OpenCode';
  return 'Claude';
}

function EnvironmentLobeIcon({ hint, size = 14 }: { hint?: string; size?: number }) {
  return <ModelIcon model={hint} size={size} className="shrink-0" disableContrastBg />;
}

export interface ComposerControlsProps {
  provider: string;
  envName: string;
  permMode: PermissionModeName;
  effort: EffortLevel;
  environments: Environment[];
  onEnvChange: (envName: string) => void;
  onPermModeChange: (mode: PermissionModeName) => void;
  onEffortChange: (effort: EffortLevel) => void;
}

export function ComposerControls({
  provider,
  envName,
  permMode,
  effort,
  environments,
  onEnvChange,
  onPermModeChange,
  onEffortChange,
}: ComposerControlsProps) {
  const { t } = useLocale();
  const [permissionPreviewMode, setPermissionPreviewMode] = useState<PermissionModeName>(permMode);
  const [permissionSelectOpen, setPermissionSelectOpen] = useState(false);
  const [envEffortOpen, setEnvEffortOpen] = useState(false);

  useEffect(() => {
    if (!permissionSelectOpen) {
      setPermissionPreviewMode(permMode);
    }
  }, [permMode, permissionSelectOpen]);

  const permissionModes = useMemo(
    () => Object.keys(PERMISSION_PRESETS) as PermissionModeName[],
    [],
  );

  const currentEnvironment = environments.find((e) => e.name === envName);
  const currentEnvironmentIconHint = resolveEnvironmentIconHint(currentEnvironment);
  const permissionPreview = {
    desc: t(`environments.permMode_${permissionPreviewMode}_desc`),
    detail: t(`environments.permMode_${permissionPreviewMode}_detail`),
  };

  const effortLevels = provider === 'codex' ? CODEX_EFFORT_LEVELS : CLAUDE_EFFORT_LEVELS;

  return (
    <>
      <Popover open={envEffortOpen} onOpenChange={setEnvEffortOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-8 items-center gap-2 rounded-xl px-2.5 text-[12px] text-foreground',
              'cursor-pointer outline-none transition-all duration-150',
              'hover:bg-white/[0.06] focus:ring-2 focus:ring-primary/30',
            )}
          >
            <EnvironmentLobeIcon hint={currentEnvironmentIconHint} />
            <span className="truncate">{envName}</span>
            <span className="text-muted-foreground/60">·</span>
            <Gauge className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">{t(EFFORT_I18N_KEYS[effort])}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          sideOffset={6}
          className="w-auto min-w-[220px] max-h-[min(400px,var(--radix-popover-content-available-height))] flex flex-col rounded-xl border border-border/40 bg-popover p-0 shadow-md"
        >
          <div className="shrink-0 p-1.5 pb-0">
            <div className="px-2 py-1.5 text-2xs uppercase tracking-wider font-medium text-muted-foreground/70">
              {t('workspace.effortLabel')}
            </div>
            {effortLevels.map((level) => (
              <button
                key={level}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none',
                  'cursor-pointer transition-colors',
                  'glass-dropdown-item',
                  level === effort && 'text-primary',
                )}
                onClick={() => {
                  onEffortChange(level);
                  setEnvEffortOpen(false);
                }}
              >
                <span className="flex-1 text-left">{t(EFFORT_I18N_KEYS[level])}</span>
                {level === effort && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))}
            <div className="mx-2 my-1.5 h-px border-t border-white/[0.06]" />
            <div className="px-2 py-1.5 text-2xs uppercase tracking-wider font-medium text-muted-foreground/70">
              {t('workspace.environmentLabel')}
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto p-1.5 pt-0">
            {environments.map((environment) => (
              <button
                key={environment.name}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none',
                  'cursor-pointer transition-colors',
                  'glass-dropdown-item',
                  environment.name === envName && 'text-primary',
                )}
                onClick={() => {
                  onEnvChange(environment.name);
                  setEnvEffortOpen(false);
                }}
              >
                <EnvironmentLobeIcon
                  hint={resolveEnvironmentIconHint(environment)}
                  size={13}
                />
                <span className="flex-1 text-left">{environment.name}</span>
                {environment.name === envName && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Select
        value={permMode}
        open={permissionSelectOpen}
        onOpenChange={(open) => {
          setPermissionSelectOpen(open);
          if (open) {
            setPermissionPreviewMode(permMode);
          }
        }}
        onValueChange={(value) => {
          const mode = value as PermissionModeName;
          onPermModeChange(mode);
          setPermissionPreviewMode(mode);
        }}
      >
        <SelectTrigger
          variant="plain"
          className={cn(
            'h-8 w-auto min-w-[146px] rounded-xl px-2.5 text-[12px] text-foreground',
            isRiskyPermissionMode(permMode) && 'text-destructive',
          )}
        >
          {(() => {
            const ModeIcon = getModeIcon(permMode);
            return (
              <span className="flex min-w-0 items-center gap-2">
                <ModeIcon
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 text-muted-foreground',
                    isRiskyPermissionMode(permMode) && 'text-destructive',
                  )}
                />
                <span className="truncate">{MODE_DISPLAY_NAMES[permMode]}</span>
              </span>
            );
          })()}
        </SelectTrigger>
        <SelectContent
          align="start"
          className="overflow-visible"
          viewportClassName="w-auto min-w-0 p-0"
        >
          <div className="flex items-stretch gap-3 p-1.5">
            <div className="min-w-[220px]">
              {permissionModes.map((mode) => (
                <SelectItem
                  key={mode}
                  value={mode}
                  className={cn(
                    'min-w-[220px]',
                    isRiskyPermissionMode(mode) && 'text-destructive focus:text-destructive',
                  )}
                  onFocus={() => setPermissionPreviewMode(mode)}
                  onPointerMove={() => setPermissionPreviewMode(mode)}
                >
                  {MODE_DISPLAY_NAMES[mode]}
                </SelectItem>
              ))}
            </div>
            <div className="w-px self-stretch bg-white/[0.08]" />
            <div className="flex w-[248px] flex-col justify-center px-3 py-2 text-left">
              <div
                className={cn(
                  'flex items-center gap-2 text-foreground',
                  isRiskyPermissionMode(permissionPreviewMode) && 'text-destructive',
                )}
              >
                {(() => {
                  const ModeIcon = getModeIcon(permissionPreviewMode);
                  return (
                    <ModeIcon
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground',
                        isRiskyPermissionMode(permissionPreviewMode) && 'text-destructive',
                      )}
                    />
                  );
                })()}
                <span className="text-[15px] font-semibold">
                  {MODE_DISPLAY_NAMES[permissionPreviewMode]}
                </span>
              </div>
              <p
                className={cn(
                  'mt-3 text-[12px] font-medium leading-5 text-foreground/88',
                  isRiskyPermissionMode(permissionPreviewMode) && 'text-destructive/90',
                )}
              >
                {permissionPreview.desc}
              </p>
              <p
                className={cn(
                  'mt-2 text-[11px] leading-5 text-muted-foreground',
                  isRiskyPermissionMode(permissionPreviewMode) && 'text-destructive/75',
                )}
              >
                {permissionPreview.detail}
              </p>
            </div>
          </div>
        </SelectContent>
      </Select>
    </>
  );
}
