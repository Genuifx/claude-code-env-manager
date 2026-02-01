import { useEnvStore } from '@/stores';
import { Button } from '@/components/ui/button';

interface CurrentEnvCardProps {
  onSwitchEnv?: () => void;
}

export function CurrentEnvCard({ onSwitchEnv }: CurrentEnvCardProps) {
  const { currentEnv, environments } = useEnvStore();
  const env = environments[currentEnv];

  return (
    <div className="relative bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-75" />
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-white">当前环境</h3>
      </div>

      {/* Environment name */}
      <div className="text-2xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
        {currentEnv}
      </div>

      {/* Environment details */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">API 端点</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]">
            {env?.ANTHROPIC_BASE_URL || 'api.anthropic.com'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">模型</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {env?.ANTHROPIC_MODEL || 'claude-sonnet-4-5'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">API Key</span>
          <span className="text-emerald-500 font-medium">
            {env?.ANTHROPIC_API_KEY ? '••••••••' : '已配置'}
          </span>
        </div>
      </div>

      {/* Action */}
      <Button
        variant="outline"
        className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-600"
        onClick={onSwitchEnv}
      >
        切换环境
      </Button>
    </div>
  );
}
