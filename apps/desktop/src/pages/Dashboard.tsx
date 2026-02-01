import { Button } from '@/components/ui/button';
import { StatsCard, CurrentEnvCard, SessionsCard } from '@/components/dashboard';
import { useEnvStore } from '@/stores';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
  onLaunch?: () => void;
}

export function Dashboard({ onNavigate, onLaunch }: DashboardProps) {
  const { environments, sessions, currentMode } = useEnvStore();
  const envCount = Object.keys(environments).length;

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            你好，开发者 <span className="inline-block animate-bounce">👋</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            选择环境和权限模式，开始使用 Claude Code
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="bg-white dark:bg-slate-800"
            onClick={() => onNavigate?.('environments')}
          >
            <span className="mr-2">+</span>
            添加环境
          </Button>
          <Button
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 border-0"
            onClick={onLaunch}
          >
            <span className="mr-2">▶</span>
            启动 Claude
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-5 gap-4">
        <StatsCard
          icon="🌐"
          value={envCount || 4}
          label="环境数"
          sublabel="已配置"
          accentColor="emerald"
        />
        <StatsCard
          icon="💰"
          value="$18.50"
          label="本月费用"
          sublabel="12%"
          trend="up"
          accentColor="amber"
        />
        <StatsCard
          icon="📊"
          value="1.2M"
          label="Tokens"
          sublabel="本月用量"
          accentColor="blue"
        />
        <StatsCard
          icon="🚀"
          value={sessions.length}
          label="活跃会话"
          sublabel="运行中"
          accentColor="violet"
        />
        <StatsCard
          icon="⚡"
          value={currentMode}
          label="权限模式"
          sublabel="当前模式"
          accentColor="rose"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-2 gap-6">
        <CurrentEnvCard onSwitchEnv={() => onNavigate?.('environments')} />
        <SessionsCard />
      </div>

      {/* Quick links */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          快捷入口
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
            onClick={() => onNavigate?.('environments')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <span>🌐</span>
              </div>
              <div className="text-left">
                <div className="font-medium text-slate-900 dark:text-white">查看所有环境</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">管理 API 配置</div>
              </div>
            </div>
            <span className="text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all">→</span>
          </button>

          <button
            className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-500/10 transition-all"
            onClick={() => onNavigate?.('permissions')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <span>🛡️</span>
              </div>
              <div className="text-left">
                <div className="font-medium text-slate-900 dark:text-white">权限模式设置</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">配置安全策略</div>
              </div>
            </div>
            <span className="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
