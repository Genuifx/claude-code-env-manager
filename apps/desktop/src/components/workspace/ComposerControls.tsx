import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Shield,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { Claude, Codex, OpenCode } from '@lobehub/icons';
import { ModelIcon } from '@/components/history/ModelIcon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import type { Environment } from '@/store';
import { resolveEnvironmentIconHint } from '@/components/workspace/sessionTreeIcons';

export function normalizePermissionModeName(mode: string | null | undefined): PermissionModeName {
  if (mode && mode in PERMISSION_PRESETS) {
    return mode as PermissionModeName;
  }
  return 'readonly';
}

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

function ProviderIcon({ client, size = 16 }: { client: string; size?: number }) {
  if (client === 'codex') return <Codex.Color size={size} />;
  if (client === 'opencode') return <OpenCode size={size} />;
  return <Claude.Color size={size} />;
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
  environments: Environment[];
  onEnvChange: (envName: string) => void;
  onPermModeChange: (mode: PermissionModeName) => void;
}

export function ComposerControls({
  provider,
  envName,
  permMode,
  environments,
  onEnvChange,
  onPermModeChange,
}: ComposerControlsProps) {
  const { t } = useLocale();
  const [permissionPreviewMode, setPermissionPreviewMode] = useState<PermissionModeName>(permMode);
  const [permissionSelectOpen, setPermissionSelectOpen] = useState(false);

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

  return (
    <>
      <div className="flex items-center gap-1.5 pr-1 text-[12px] font-medium text-muted-foreground">
        <ProviderIcon client={provider} size={15} />
        <span>{providerDisplayName(provider)}</span>
      </div>

      <Select value={envName} onValueChange={onEnvChange}>
        <SelectTrigger variant="plain" className="h-8 w-auto min-w-[144px] rounded-xl px-2.5 text-[12px] text-foreground">
          <span className="flex min-w-0 items-center gap-2">
            <EnvironmentLobeIcon hint={currentEnvironmentIconHint} />
            <span className="truncate">{envName}</span>
          </span>
        </SelectTrigger>
        <SelectContent align="start">
          {environments.map((environment) => (
            <SelectItem key={environment.name} value={environment.name}>
              <span className="flex items-center gap-2">
                <EnvironmentLobeIcon
                  hint={resolveEnvironmentIconHint(environment)}
                  size={13}
                />
                <span>{environment.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
