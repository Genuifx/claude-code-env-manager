import { Globe } from 'lucide-react';
import { useAppStore, type Environment } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';

function maskApiKey(key?: string, notSet?: string): string {
  if (!key) return notSet || 'Not set';
  if (key.length <= 7) return '****';
  return key.slice(0, 4) + '***' + key.slice(-3);
}

interface EnvListProps {
  onEdit?: (name: string) => void;
  onDelete?: (name: string) => void;
}

export function EnvList({ onEdit, onDelete }: EnvListProps) {
  const { environments, currentEnv } = useAppStore();
  const { switchEnvironment } = useTauriCommands();
  const { t } = useLocale();

  if (environments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">{t('environments.noEnvTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('environments.noEnvHint')}</p>
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

  return (
    <div
      className={cn(
        'group relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer',
        isActive
          ? 'ring-1 ring-primary/40 border-primary/40 bg-primary/5 shadow-lg shadow-primary/10'
          : 'bg-card border-border/50 hover:border-muted-foreground/30 hover:shadow-md'
      )}
      onClick={onSelect}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/75 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
          </span>
          <span className="text-xs font-medium text-primary">{t('environments.currentlyActive')}</span>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0',
          isActive
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
            : 'bg-muted'
        )}>
          {isActive ? '\u2713' : '\u25CB'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-foreground">{name}</h3>
            {name === 'official' && (
              <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase">
                {t('environments.default')}
              </span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground truncate">
              <span className="text-muted-foreground/70">Base URL:</span>{' '}
              {env.baseUrl || 'api.anthropic.com'}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="text-muted-foreground/70">Model:</span>{' '}
              {env.model || 'claude-sonnet-4-5'}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="text-muted-foreground/70">API Key:</span>{' '}
              {maskApiKey(env.apiKey, t('environments.notSet'))}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-primary hover:text-primary hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              {t('environments.switchTo')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            {t('common.edit')}
          </Button>
          {name === 'official' ? (
            <span className="h-8 px-3 inline-flex items-center text-xs font-medium text-muted-foreground bg-muted rounded-md cursor-not-allowed">
              {t('common.protected')}
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              {t('common.delete')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
