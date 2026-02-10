import { Globe, Check, Circle } from 'lucide-react';
import { useAppStore, type Environment } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';

function maskApiKey(key?: string, notSet?: string): string {
  if (!key) return notSet || 'Not set';
  // Encrypted keys start with "enc:" — show a generic mask
  if (key.startsWith('enc:')) return '••••••••';
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
        <div className="w-16 h-16 rounded-lg glass-icon-container flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-muted-foreground/40" />
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
        'group relative p-5 rounded-2xl cursor-pointer glass-noise glass-env-card',
        isActive && 'active'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
          isActive
            ? 'bg-primary/15 text-primary'
            : 'glass-icon-container text-muted-foreground'
        )}
          style={isActive ? {
            boxShadow: '0 0 16px hsl(var(--primary) / 0.15), 0 0 4px hsl(var(--primary) / 0.2)',
          } : undefined}
        >
          {isActive ? <Check className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
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
              <span className="text-muted-foreground/80">Base URL:</span>{' '}
              {env.baseUrl || 'api.anthropic.com'}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="text-muted-foreground/80">Model:</span>{' '}
              {env.model || 'claude-sonnet-4-5'}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="text-muted-foreground/80">API Key:</span>{' '}
              {maskApiKey(env.apiKey, t('environments.notSet'))}
            </p>
          </div>
        </div>

        {/* Actions — always visible row with badge + buttons */}
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
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            {t('common.edit')}
          </Button>
          {name === 'official' ? (
            <span className="h-8 px-3 inline-flex items-center text-xs font-medium text-muted-foreground glass-badge rounded-md cursor-not-allowed">
              {t('common.protected')}
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
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
