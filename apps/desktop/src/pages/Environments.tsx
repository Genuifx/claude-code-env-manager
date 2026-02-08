import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnvList } from '@/components/environments';
import { ENV_PRESETS, PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import { useAppStore } from '@/store';
import { useLocale } from '../locales';
import { EnvironmentsSkeleton } from '@/components/ui/skeleton-states';

interface EnvironmentsProps {
  onAddEnv?: () => void;
  onEditEnv?: (name: string) => void;
  onDeleteEnv?: (name: string) => void;
}

export function Environments({ onAddEnv, onEditEnv, onDeleteEnv }: EnvironmentsProps) {
  const presetNames = Object.keys(ENV_PRESETS);
  const { permissionMode, defaultMode, setPermissionMode, setDefaultMode, isLoadingEnvs } = useAppStore();
  const { t } = useLocale();

  // Show skeleton when environments are loading
  if (isLoadingEnvs) {
    return <EnvironmentsSkeleton />;
  }

  return (
    <div className="page-transition-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            {t('environments.title')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('environments.description')}
          </p>
        </div>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg border-0"
          onClick={onAddEnv}
        >
          <span className="mr-2">+</span>
          {t('environments.addEnv')}
        </Button>
      </div>

      {/* Environment list */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          {t('environments.configuredEnvs')}
        </h3>
        <EnvList onEdit={onEditEnv} onDelete={onDeleteEnv} />
      </div>

      {/* Permission Mode Section */}
      <div className="border-t border-border pt-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t('environments.permissionMode')}
        </h3>

        <div className="space-y-4">
          {/* Default Permission Setting */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div>
              <div className="font-medium text-foreground mb-1">
                {t('environments.defaultPermission')}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('environments.userLevelHint')}
              </div>
            </div>
            <select
              value={defaultMode || permissionMode}
              onChange={(e) => {
                const mode = e.target.value as PermissionModeName;
                setDefaultMode(mode);
                setPermissionMode(mode);
              }}
              className="px-3 py-2 rounded-lg border border-border bg-card text-foreground"
            >
              {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {key} - {preset.description}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Switch (Temporary) */}
          <div>
            <div className="text-sm font-medium text-foreground mb-2">
              {t('environments.quickSwitch')}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PERMISSION_PRESETS).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={permissionMode === mode ? 'default' : 'outline'}
                  onClick={() => setPermissionMode(mode as PermissionModeName)}
                >
                  {mode}
                </Button>
              ))}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              <Lightbulb className="w-3.5 h-3.5 inline mr-1 text-primary" /> {t('environments.tempPermissionHint')}
            </div>
          </div>
        </div>
      </div>

      {/* Presets section */}
      <div className="border-t border-border pt-8">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          {t('environments.addFromPreset')}
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {presetNames.map((name) => (
            <button
              key={name}
              className="group p-4 bg-card rounded-xl border border-border/50 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all text-left"
              onClick={() => onAddEnv?.()}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary transition-colors">
                  {name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-foreground">{name}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {getPresetDescription(name, t)}
              </p>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

function getPresetDescription(name: string, t: (key: string) => string): string {
  const keyMap: Record<string, string> = {
    GLM: 'environments.presetGLM',
    KIMI: 'environments.presetKIMI',
    MiniMax: 'environments.presetMiniMax',
    DeepSeek: 'environments.presetDeepSeek',
  };
  const key = keyMap[name];
  if (key) return t(key);
  return t('environments.presetDefault').replace('{name}', name);
}
