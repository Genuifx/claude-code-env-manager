import { useEnvStore, type EnvConfig } from '@/stores';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EnvListProps {
  onEdit?: (name: string) => void;
  onDelete?: (name: string) => void;
}

export function EnvList({ onEdit, onDelete }: EnvListProps) {
  const { environments, currentEnv, setCurrentEnv } = useEnvStore();

  const envEntries = Object.entries(environments);

  if (envEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <span className="text-3xl opacity-50">🌐</span>
        </div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">暂无环境配置</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">添加你的第一个 API 环境开始使用</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {envEntries.map(([name, env]) => (
        <EnvCard
          key={name}
          name={name}
          env={env}
          isActive={name === currentEnv}
          onSelect={() => setCurrentEnv(name)}
          onEdit={() => onEdit?.(name)}
          onDelete={() => onDelete?.(name)}
        />
      ))}
    </div>
  );
}

interface EnvCardProps {
  name: string;
  env: EnvConfig;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function EnvCard({ name, env, isActive, onSelect, onEdit, onDelete }: EnvCardProps) {
  return (
    <div
      className={cn(
        'group relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer',
        isActive
          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800 shadow-lg shadow-emerald-500/10'
          : 'bg-white dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
      )}
      onClick={onSelect}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">当前使用</span>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0',
          isActive
            ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
            : 'bg-slate-100 dark:bg-slate-700'
        )}>
          {isActive ? '✓' : '○'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{name}</h3>
            {name === 'official' && (
              <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full uppercase">
                默认
              </span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              <span className="text-slate-400 dark:text-slate-500">API:</span>{' '}
              {env.ANTHROPIC_BASE_URL || 'api.anthropic.com'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <span className="text-slate-400 dark:text-slate-500">Model:</span>{' '}
              {env.ANTHROPIC_MODEL || 'claude-sonnet-4-5'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            编辑
          </Button>
          {name !== 'official' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              删除
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
