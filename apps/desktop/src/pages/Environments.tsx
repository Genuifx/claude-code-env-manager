import { Button } from '@/components/ui/button';
import { EnvList } from '@/components/environments';
import { ENV_PRESETS } from '@ccem/core/browser';

interface EnvironmentsProps {
  onAddEnv?: () => void;
  onEditEnv?: (name: string) => void;
  onDeleteEnv?: (name: string) => void;
}

export function Environments({ onAddEnv, onEditEnv, onDeleteEnv }: EnvironmentsProps) {
  const presetNames = Object.keys(ENV_PRESETS);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            环境管理
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            配置和管理你的 API 环境
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 border-0"
          onClick={onAddEnv}
        >
          <span className="mr-2">+</span>
          添加环境
        </Button>
      </div>

      {/* Environment list */}
      <div>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          已配置的环境
        </h3>
        <EnvList onEdit={onEditEnv} onDelete={onDeleteEnv} />
      </div>

      {/* Presets section */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          从预设添加
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {presetNames.map((name) => (
            <button
              key={name}
              className="group p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg hover:shadow-emerald-500/10 transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:from-emerald-100 group-hover:to-teal-100 dark:group-hover:from-emerald-900/50 dark:group-hover:to-teal-900/50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-slate-900 dark:text-white">{name}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {getPresetDescription(name)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Remote loading section */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          从远程加载
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="输入配置 URL..."
            className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder-slate-400"
          />
          <Button variant="outline" className="px-6">
            加载
          </Button>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          支持加载加密的远程配置文件，需要正确的解密密钥
        </p>
      </div>
    </div>
  );
}

function getPresetDescription(name: string): string {
  const descriptions: Record<string, string> = {
    GLM: '智谱 AI GLM 系列模型',
    KIMI: '月之暗面 Kimi 对话模型',
    MiniMax: 'MiniMax 大模型服务',
    DeepSeek: 'DeepSeek AI 深度求索',
  };
  return descriptions[name] || `${name} API 配置`;
}
