import { useState } from 'react';
import { Globe, Edit2, Trash2, Search } from 'lucide-react';
import { useAppStore, type Environment } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import { ModelIcon } from '@/components/history/ModelIcon';
import { resolveEnvironmentIconHint } from '@/components/workspace/sessionTreeIcons';
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

export function EnvList({ onEdit, onDelete, viewMode = 'grid' }: EnvListProps) {
  const { environments, currentEnv } = useAppStore(
    (state) => ({
      environments: state.environments,
      currentEnv: state.currentEnv,
    }),
    shallow
  );
  const { switchEnvironment } = useTauriCommands();
  const { t } = useLocale();
  const [filter, setFilter] = useState('');

  if (environments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-xl border border-border-subtle bg-surface-raised flex items-center justify-center mb-3">
          <Globe className="w-6 h-6 text-muted-foreground/40" />
        </div>
        <h3 className="text-[15px] font-semibold text-foreground mb-1 tracking-[-0.22px]">
          {t('environments.noEnvTitle')}
        </h3>
        <p className="text-sm text-muted-foreground">{t('environments.noEnvHint')}</p>
      </div>
    );
  }

  // Filter environments by name or domain
  const filtered = filter
    ? environments.filter((env) =>
        env.name.toLowerCase().includes(filter.toLowerCase()) ||
        extractDomain(env.baseUrl).toLowerCase().includes(filter.toLowerCase())
      )
    : environments;

  return (
    <div>
      {/* Search filter — show when 5+ environments */}
      {environments.length >= 5 && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('environments.searchPlaceholder') || '搜索环境...'}
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-border-subtle bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
          {filtered.map((env) => (
            <EnvGridCard
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
      ) : (
        <div className="space-y-1.5">
          {filtered.map((env) => (
            <EnvListCard
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
      )}

      {filter && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          {t('common.noResults') || '没有匹配的环境'}
        </p>
      )}
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

/**
 * Compact grid card — dense, scannable.
 * Smaller padding, tighter spacing, more columns.
 */
function EnvGridCard({ name, env, isActive, onSelect, onEdit, onDelete }: EnvCardProps) {
  const iconHint = resolveEnvironmentIconHint(env) || env.defaultOpusModel || 'claude-opus-4-1-20250805';
  const runtimeModel = env.runtimeModel || 'opus';

  return (
    <div
      className={cn(
        'group relative p-3 rounded-xl cursor-pointer border transition-all duration-150 active:scale-[0.97]',
        isActive
          ? 'border-primary/50 bg-primary/[0.03]'
          : 'border-border-subtle bg-surface-raised/60 hover:border-border hover:bg-surface-raised'
      )}
      onClick={onSelect}
    >
      {/* Header: icon + name */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
          isActive
            ? 'bg-primary/10'
            : 'bg-background border border-border-subtle'
        )}>
          <ModelIcon model={iconHint} size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-semibold text-foreground truncate leading-tight">
            {name}
          </h3>
        </div>
        {isActive && (
          <span className="flex h-2 w-2 shrink-0">
            <span className="inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
        )}
      </div>

      {/* Compact info */}
      <div className="space-y-0.5 text-[11px] text-muted-foreground">
        <p className="truncate">{extractDomain(env.baseUrl)}</p>
        <p className="truncate">
          <span className="text-muted-foreground/60">runtime:</span> {runtimeModel}
        </p>
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
          <Edit2 className="w-3 h-3" />
        </button>
        {name !== 'official' && (
          <button
            type="button"
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact list row — single line with key info.
 */
function EnvListCard({ name, env, isActive, onSelect, onEdit, onDelete }: EnvCardProps) {
  const { t } = useLocale();
  const runtimeModel = env.runtimeModel || 'opus';
  const iconHint = resolveEnvironmentIconHint(env) || env.defaultOpusModel || 'claude-opus-4-1-20250805';

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer border transition-all duration-150 active:scale-[0.99]',
        isActive
          ? 'border-primary/50 bg-primary/[0.03]'
          : 'border-border-subtle bg-surface-raised/60 hover:border-border hover:bg-surface-raised'
      )}
      onClick={onSelect}
    >
      {/* Icon */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        isActive
          ? 'bg-primary/10'
          : 'bg-background border border-border-subtle'
      )}>
        <ModelIcon model={iconHint} size={16} />
      </div>

      {/* Name + domain */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="min-w-0 flex-shrink-0" style={{ width: '120px' }}>
          <h3 className="text-[13px] font-semibold text-foreground truncate">{name}</h3>
        </div>
        <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
          {extractDomain(env.baseUrl)}
        </span>
        <span className="text-[11px] text-muted-foreground truncate hidden lg:inline">
          runtime: {runtimeModel}
        </span>
        <span className="text-[11px] font-mono text-muted-foreground/70 truncate hidden xl:inline">
          {maskAuthToken(env.authToken, t('environments.notSet'))}
        </span>
      </div>

      {/* Status */}
      {isActive && (
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex rounded-full h-2 w-2 bg-primary"></span>
          <span className="text-[11px] font-medium text-primary hidden sm:inline">{t('environments.currentlyActive')}</span>
        </span>
      )}

      {/* Hover actions */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isActive && (
          <button
            type="button"
            className="h-6 px-2 rounded-md text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
          >
            {t('environments.switchTo')}
          </button>
        )}
        <button
          type="button"
          className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
          <Edit2 className="w-3 h-3" />
        </button>
        {name !== 'official' && (
          <button
            type="button"
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
