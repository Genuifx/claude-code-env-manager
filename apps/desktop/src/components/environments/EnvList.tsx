import { Globe, Edit2, Trash2 } from 'lucide-react';
import { useAppStore, type Environment } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import { ModelIcon } from '@/components/history/ModelIcon';
import { shallow } from 'zustand/shallow';

function maskAuthToken(token?: string, notSet?: string): string {
  if (!token) return notSet || 'Not set';
  if (token.startsWith('enc:')) return '••••••••';
  if (token.length <= 7) return '****';
  return token.slice(0, 4) + '***' + token.slice(-3);
}

function extractDomain(url: string): string {
  if (!url) return 'api.anthropic.com';
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

interface EnvListProps {
  onEdit?: (name: string) => void;
  onDelete?: (name: string) => void;
  viewMode?: 'grid' | 'list';
}

export function EnvList({ onEdit, onDelete, viewMode = 'list' }: EnvListProps) {
  const { environments, currentEnv } = useAppStore(
    (state) => ({
      environments: state.environments,
      currentEnv: state.currentEnv,
    }),
    shallow
  );
  const { switchEnvironment } = useTauriCommands();
  const { t } = useLocale();

  if (environments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-lg glass-icon-container flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">{t('environments.noEnvTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('environments.noEnvHint')}</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {environments.map((env) => (
          <EnvCompactCard
            key={env.name}
            name={env.name}
            env={env}
            isActive={env.name === currentEnv}
            onSelect={() => switchEnvironment(env.name)}
            onEdit={() => onEdit?.(env.name)}
            onDelete={() => onDelete?.(env.name)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {environments.map((env) => (
        <EnvCard
          key={env.name}
          name={env.name}
          env={env}
          isActive={env.name === currentEnv}
          onSelect={() => switchEnvironment(env.name)}
          onEdit={() => onEdit?.(env.name)}
          onDelete={() => onDelete?.(env.name)}
        />
      ))}
    </div>
  );
}

interface EnvCardProps {
  name: string;
  env: Environment;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function EnvCard({ name, env, isActive, onSelect, onEdit, onDelete }: EnvCardProps) {
  const { t } = useLocale();
  const runtimeModel = env.runtimeModel || 'opus';
  const defaultOpusModel = env.defaultOpusModel || 'claude-opus-4-1-20250805';
  const defaultHaikuModel = env.defaultHaikuModel || t('environments.notSet');

  return (
    <div
      className={cn(
        'group relative p-5 rounded-2xl cursor-pointer glass-noise glass-env-card',
        isActive && 'active'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-4">
        {/* Icon — vendor brand */}
        <div className={cn(
          'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
          isActive
            ? 'bg-primary/15'
            : 'glass-icon-container'
        )}
          style={isActive ? {
            boxShadow: '0 0 16px hsl(var(--primary) / 0.15), 0 0 4px hsl(var(--primary) / 0.2)',
          } : undefined}
        >
          <ModelIcon model={defaultOpusModel} size={24} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-foreground">{name}</h3>
            {name === 'official' && (
              <span className="text-[10px] font-medium glass-badge text-muted-foreground px-2 py-0.5 rounded-full uppercase">
                {t('environments.default')}
              </span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground truncate">
              <span className="text-muted-foreground/80">
                {t('environmentDialog.baseUrl')}:
              </span>{' '}
              {env.baseUrl || 'api.anthropic.com'}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="text-muted-foreground/80">
                {t('environmentDialog.runtimeModel')}:
              </span>{' '}
              {runtimeModel}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="text-muted-foreground/80">
                {t('environmentDialog.defaultOpusModel')}:
              </span>{' '}
              {defaultOpusModel}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="text-muted-foreground/80">
                {t('environmentDialog.defaultHaikuModel')}:
              </span>{' '}
              {defaultHaikuModel}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="text-muted-foreground/80">
                {t('environmentDialog.authToken')}:
              </span>{' '}
              {maskAuthToken(env.authToken, t('environments.notSet'))}
            </p>
          </div>
        </div>

        {/* Right-top: status badge + switch */}
        <div className="flex items-center gap-1 shrink-0">
          {isActive && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-primary mr-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/75 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              {t('environments.currentlyActive')}
            </span>
          )}
          {!isActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-primary hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              {t('environments.switchTo')}
            </Button>
          )}
        </div>
      </div>

      {/* Bottom-right: edit / delete */}
      <div className="absolute bottom-3 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Edit2 className="w-3.5 h-3.5 mr-1" />
          {t('common.edit')}
        </Button>
        {name === 'official' ? (
          <span className="h-7 px-2 inline-flex items-center text-xs font-medium text-muted-foreground glass-badge rounded-md cursor-not-allowed">
            {t('common.protected')}
          </span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            {t('common.delete')}
          </Button>
        )}
      </div>
    </div>
  );
}

function EnvCompactCard({ name, env, isActive, onSelect, onEdit, onDelete }: EnvCardProps) {
  const runtimeModel = env.runtimeModel || 'opus';
  const defaultOpusModel = env.defaultOpusModel || 'claude-opus-4-1-20250805';

  return (
    <div
      className={cn(
        'group relative p-4 rounded-xl cursor-pointer glass-noise glass-card hover:-translate-y-0.5 transition-all',
        isActive && 'active ring-2 ring-primary/50'
      )}
      onClick={onSelect}
      style={isActive ? {
        boxShadow: '0 0 24px hsl(var(--primary) / 0.2), 0 0 8px hsl(var(--primary) / 0.3)',
      } : undefined}
    >
      {/* 顶部:图标 + 名称 + 徽章 */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          'w-8 h-8 rounded-md flex items-center justify-center shrink-0',
          isActive
            ? 'bg-primary/15'
            : 'glass-icon-container'
        )}>
          <ModelIcon model={defaultOpusModel} size={18} />
        </div>
        <h4 className="font-semibold text-sm truncate flex-1">{name}</h4>
        {isActive && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/75 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
        )}
      </div>

      {/* 中部:模型 */}
      <p className="text-xs text-muted-foreground truncate">
        {defaultOpusModel}
      </p>
      <p className="text-[11px] text-muted-foreground/70 truncate mb-2">
        runtime: {runtimeModel}
      </p>

      {/* 底部:域名 */}
      <p className="text-xs text-muted-foreground/70 truncate">
        {extractDomain(env.baseUrl)}
      </p>

      {/* 悬停操作层 */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <button
          type="button"
          className="w-7 h-7 rounded-md flex items-center justify-center glass-subtle hover:bg-surface-raised text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        {name !== 'official' && (
          <button
            type="button"
            className="w-7 h-7 rounded-md flex items-center justify-center glass-subtle hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
