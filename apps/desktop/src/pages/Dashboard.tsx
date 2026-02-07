import { Rocket, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProjectList } from '@/components/projects';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onLaunch: () => void;
  onLaunchWithDir: (dir: string) => void;
}

export function Dashboard({ onNavigate, onLaunch, onLaunchWithDir }: DashboardProps) {
  const {
    currentEnv,
    environments,
    permissionMode,
    setPermissionMode,
    selectedWorkingDir,
    sessions,
    usageStats,
    setSelectedWorkingDir,
  } = useAppStore();

  const { openDirectoryPicker, switchEnvironment } = useTauriCommands();

  const handleSelectDirectory = async () => {
    try {
      const dir = await openDirectoryPicker();
      if (dir) {
        setSelectedWorkingDir(dir);
      }
    } catch (err) {
      console.error('Failed to open directory dialog:', err);
    }
  };

  const handleLaunchClick = () => {
    if (selectedWorkingDir) {
      onLaunchWithDir(selectedWorkingDir);
    } else {
      onLaunch();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Status Bar */}
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <span>当前环境</span>
        <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
          {currentEnv}
        </span>
        <span>·</span>
        <span>权限</span>
        <span className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
          {permissionMode}
        </span>
        <span>·</span>
        <span>{sessions.length} 个会话运行中</span>
      </div>

      {/* Launch Center */}
      <div className="flex flex-col items-center justify-center py-12">
        <Button
          size="lg"
          onClick={handleLaunchClick}
          className="h-16 px-12 text-lg"
        >
          <Rocket className="w-6 h-6 mr-3" />
          启动 Claude Code
        </Button>

        {/* Quick Actions */}
        <div className="flex items-center gap-4 mt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">环境</span>
            <select
              value={currentEnv}
              onChange={(e) => {
                switchEnvironment(e.target.value);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {environments.length > 0 ? (
                environments.map((env) => (
                  <option key={env.name} value={env.name}>{env.name}</option>
                ))
              ) : (
                <option value={currentEnv}>{currentEnv}</option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">权限</span>
            <select
              value={permissionMode}
              onChange={(e) => {
                setPermissionMode(e.target.value as PermissionModeName);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {Object.keys(PERMISSION_PRESETS).map((mode) => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </div>

          <Button variant="outline" onClick={handleSelectDirectory}>
            <FolderOpen className="w-4 h-4 mr-2" />
            {selectedWorkingDir ? '更改目录' : '选择目录'}
          </Button>
        </div>

        {selectedWorkingDir && (
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            工作目录: {selectedWorkingDir}
          </div>
        )}
      </div>

      {/* Today's Usage Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('sessions')}
        >
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            运行中会话
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            💬 {sessions.length}
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('analytics')}
        >
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            今日 Tokens
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            📊 {(((usageStats?.today.inputTokens ?? 0) + (usageStats?.today.outputTokens ?? 0)) / 1000).toFixed(1)}K
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('analytics')}
        >
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            今日消费
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            💰 ${(usageStats?.today.cost ?? 0).toFixed(2)}
          </div>
        </Card>
      </div>

      {/* Recent Projects */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          最近项目
        </h3>
        <ProjectList onLaunch={onLaunchWithDir} />
      </div>
    </div>
  );
}
