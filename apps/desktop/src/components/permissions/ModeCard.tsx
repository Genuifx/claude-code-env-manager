import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ModeCardProps {
  modeName: PermissionModeName;
  isDefault: boolean;
  isActive: boolean;
  onSetDefault: () => void;
  onApply: () => void;
}

const modeIcons: Record<PermissionModeName, string> = {
  yolo: '🔓',
  dev: '💻',
  readonly: '👀',
  safe: '🛡️',
  ci: '🔧',
  audit: '🔍',
};

const modeColors: Record<PermissionModeName, { bg: string; border: string; shadow: string }> = {
  yolo: { bg: 'from-rose-500 to-orange-500', border: 'border-rose-300 dark:border-rose-700', shadow: 'shadow-rose-500/20' },
  dev: { bg: 'from-blue-500 to-indigo-500', border: 'border-blue-300 dark:border-blue-700', shadow: 'shadow-blue-500/20' },
  readonly: { bg: 'from-slate-400 to-slate-500', border: 'border-slate-300 dark:border-slate-600', shadow: 'shadow-slate-500/20' },
  safe: { bg: 'from-emerald-500 to-teal-500', border: 'border-emerald-300 dark:border-emerald-700', shadow: 'shadow-emerald-500/20' },
  ci: { bg: 'from-amber-500 to-orange-500', border: 'border-amber-300 dark:border-amber-700', shadow: 'shadow-amber-500/20' },
  audit: { bg: 'from-violet-500 to-purple-500', border: 'border-violet-300 dark:border-violet-700', shadow: 'shadow-violet-500/20' },
};

export function ModeCard({ modeName, isDefault, isActive, onSetDefault, onApply }: ModeCardProps) {
  const preset = PERMISSION_PRESETS[modeName];
  const icon = modeIcons[modeName];
  const colors = modeColors[modeName];

  return (
    <div
      className={cn(
        'group relative p-5 rounded-2xl border transition-all duration-300',
        isActive
          ? `bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-850 ${colors.border} shadow-xl ${colors.shadow}`
          : 'bg-white dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg hover:-translate-y-0.5'
      )}
    >
      {/* Default badge */}
      {isDefault && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-emerald-400 to-teal-500 text-white text-[10px] font-bold rounded-full shadow-lg uppercase tracking-wider">
          默认
        </div>
      )}

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-4 right-4">
          <span className="relative flex h-3 w-3">
            <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', `bg-gradient-to-r ${colors.bg}`)}></span>
            <span className={cn('relative inline-flex rounded-full h-3 w-3', `bg-gradient-to-r ${colors.bg}`)}></span>
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg',
          `bg-gradient-to-br ${colors.bg} ${colors.shadow}`
        )}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">{preset.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{modeName} mode</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
        {preset.description}
      </p>

      {/* Permissions preview */}
      <div className="space-y-2 mb-4 text-xs">
        <div className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">✓</span>
          <span className="text-slate-500 dark:text-slate-400 line-clamp-1">
            允许: {preset.permissions.allow.slice(0, 2).join(', ')}
            {preset.permissions.allow.length > 2 && ` +${preset.permissions.allow.length - 2}`}
          </span>
        </div>
        {preset.permissions.deny.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-rose-500 mt-0.5">✗</span>
            <span className="text-slate-500 dark:text-slate-400 line-clamp-1">
              禁止: {preset.permissions.deny.slice(0, 2).join(', ')}
              {preset.permissions.deny.length > 2 && ` +${preset.permissions.deny.length - 2}`}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={isActive ? 'default' : 'outline'}
          className={cn(
            'flex-1',
            isActive && `bg-gradient-to-r ${colors.bg} border-0 text-white hover:opacity-90`
          )}
          onClick={onApply}
        >
          {isActive ? '使用中' : '应用'}
        </Button>
        {!isDefault && (
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            onClick={onSetDefault}
          >
            设为默认
          </Button>
        )}
      </div>
    </div>
  );
}
