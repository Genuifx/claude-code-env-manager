import { useEffect, useState } from 'react';
import { Plus, Shield, ShieldCheck, ShieldOff, ShieldAlert, ShieldBan, Search, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/EmptyState';
import { EnvList } from '@/components/environments';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useLocale } from '../locales';
import { LaunchButton } from '@/components/ui/LaunchButton';
import { EnvironmentsSkeleton } from '@/components/ui/skeleton-states';

interface EnvironmentsProps {
  onAddEnv?: () => void;
  onEditEnv?: (name: string) => void;
  onDeleteEnv?: (name: string) => void;
}

export function Environments({ onAddEnv, onEditEnv, onDeleteEnv }: EnvironmentsProps) {
  const { environments, permissionMode, defaultMode, setPermissionMode, setDefaultMode, isLoadingEnvs, error } = useAppStore();
  const { t } = useLocale();
  const { loadEnvironments } = useTauriCommands();

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    () => (localStorage.getItem('ccem-env-view-mode') as 'grid' | 'list') || 'list'
  );

  // FTUE: read flag synchronously at mount
  const [hasAddedEnvs, setHasAddedEnvs] = useState(
    () => localStorage.getItem('ccem-ftue-envs-added') === 'true'
  );

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem('ccem-env-view-mode', viewMode);
  }, [viewMode]);

  // FTUE: set flag when environments.length > 1
  useEffect(() => {
    if (environments.length > 1 && !hasAddedEnvs) {
      localStorage.setItem('ccem-ftue-envs-added', 'true');
      setHasAddedEnvs(true);
    }
  }, [environments.length, hasAddedEnvs]);

  // Whether to show the ghost card
  const showGhostCard = !hasAddedEnvs && environments.length <= 1;

  // Show skeleton when environments are loading
  if (isLoadingEnvs) {
    return <EnvironmentsSkeleton />;
  }

  return (
    <div className="page-transition-enter space-y-6">
      {/* Error banner — inline, never full-page */}
      {error && error.includes('environment') && (
        <ErrorBanner
          message={t('environments.failedToLoad')}
          onRetry={loadEnvironments}
          retryLabel={t('common.retry')}
        />
      )}

      {/* Environment list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('environments.configuredEnvs')}
          </h3>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg glass-subtle">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`h-7 w-7 rounded-md flex items-center justify-center transition-all duration-150 ${
                  viewMode === 'grid'
                    ? 'seg-active text-foreground'
                    : 'text-muted-foreground seg-hover hover:text-foreground'
                }`}
                title={t('environments.viewGrid')}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`h-7 w-7 rounded-md flex items-center justify-center transition-all duration-150 ${
                  viewMode === 'list'
                    ? 'seg-active text-foreground'
                    : 'text-muted-foreground seg-hover hover:text-foreground'
                }`}
                title={t('environments.viewList')}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
            <LaunchButton
              size="sm"
              onClick={onAddEnv}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              {t('environments.addEnv')}
            </LaunchButton>
          </div>
        </div>
        <EnvList onEdit={onEditEnv} onDelete={onDeleteEnv} viewMode={viewMode} />

        {/* FTUE: Ghost card for adding first environment */}
        {showGhostCard && (
          <button
            type="button"
            className="w-full rounded-2xl p-4 flex flex-col items-center
              justify-center cursor-pointer gap-2 min-h-[120px]
              glass-ghost-card group mt-4"
            onClick={() => onAddEnv?.()}
          >
            <Plus className="w-5 h-5 text-muted-foreground/50 group-hover:text-muted-foreground/70 transition-colors" />
            <span className="text-sm text-muted-foreground">{t('environments.addEnv')}</span>
            <span className="text-xs text-muted-foreground/50 group-hover:text-muted-foreground/70 transition-colors duration-150">
              {t('environments.ghostCardHint')}
            </span>
          </button>
        )}
      </div>

      {/* Permission Mode Section */}
      <div className="border-t glass-divider pt-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t('environments.permissionMode')}
        </h3>

        <div className="space-y-4">
          {/* Default Permission Label */}
          <div>
            <div className="font-medium text-foreground mb-1">
              {t('environments.defaultPermission')}
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              {t('environments.userLevelHint')}
            </div>
          </div>

          {/* Permission Mode Card Grid */}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(PERMISSION_PRESETS).map(([key]) => {
              const isActive = (defaultMode || permissionMode) === key;
              const ModeIcon = getModeIcon(key as PermissionModeName);
              const displayName = MODE_DISPLAY_NAMES[key as PermissionModeName] || key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    const mode = key as PermissionModeName;
                    setDefaultMode(mode);
                    setPermissionMode(mode);
                  }}
                  className={`text-left p-4 rounded-lg cursor-pointer glass-mode-card ${
                    isActive ? 'active' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ModeIcon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
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
        </div>
      </div>

    </div>
  );
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
