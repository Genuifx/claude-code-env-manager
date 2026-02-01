import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';
import { ModeCard } from '@/components/permissions';
import { useEnvStore } from '@/stores';

interface PermissionsProps {
  onLaunch?: (mode: PermissionModeName) => void;
}

export function Permissions({ onLaunch }: PermissionsProps) {
  const { defaultMode, setDefaultMode, currentMode, setCurrentMode } = useEnvStore();
  const modeNames = Object.keys(PERMISSION_PRESETS) as PermissionModeName[];

  const handleApply = (mode: PermissionModeName) => {
    setCurrentMode(mode);
    onLaunch?.(mode);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            权限模式
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            选择 Claude Code 的权限级别
          </p>
        </div>
        {defaultMode && (
          <button
            onClick={() => setDefaultMode(null)}
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline-offset-4 hover:underline transition-colors"
          >
            清除默认模式
          </button>
        )}
      </div>

      {/* Current mode indicator */}
      <div className="p-4 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-850 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-lg shadow-lg shadow-blue-500/25">
              ⚡
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">当前模式</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white capitalize">{currentMode}</p>
            </div>
          </div>
          {defaultMode && (
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">默认模式</p>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 capitalize">{defaultMode}</p>
            </div>
          )}
        </div>
      </div>

      {/* Mode cards grid */}
      <div>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          可用模式
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {modeNames.map((modeName) => (
            <ModeCard
              key={modeName}
              modeName={modeName}
              isDefault={defaultMode === modeName}
              isActive={currentMode === modeName}
              onSetDefault={() => setDefaultMode(modeName)}
              onApply={() => handleApply(modeName)}
            />
          ))}
        </div>
      </div>

      {/* Info section */}
      <div className="p-5 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">关于权限模式</h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              权限模式控制 Claude Code 可以执行的操作。<strong>YOLO</strong> 模式允许所有操作，
              <strong>只读</strong> 模式仅允许读取文件。选择适合你当前任务的模式以确保安全。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
