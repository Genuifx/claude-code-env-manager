import { Rocket, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProjectList } from '@/components/projects';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onLaunch: () => void;
  onLaunchWithDir: (dir: string) => void;
}

export function Dashboard({ onNavigate, onLaunch, onLaunchWithDir }: DashboardProps) {
  const {
    currentEnv,
    permissionMode,
    selectedWorkingDir,
    sessions,
    usageStats,
    setSelectedWorkingDir,
  } = useAppStore();

  const { openDirectoryPicker } = useTauriCommands();

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
          <select
            value={currentEnv}
            onChange={(e) => {
              // TODO: Call setCurrentEnv Tauri command
              console.log('Switch to:', e.target.value);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="official">Official</option>
            <option value="GLM-4">GLM-4</option>
            <option value="DeepSeek">DeepSeek</option>
          </select>

          <select
            value={permissionMode}
            onChange={(e) => {
              // TODO: Update permission mode
              console.log('Switch permission:', e.target.value);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="yolo">yolo</option>
            <option value="dev">dev</option>
            <option value="safe">safe</option>
            <option value="readonly">readonly</option>
          </select>

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
      {usageStats && (
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
              📊 {((usageStats.today.inputTokens + usageStats.today.outputTokens) / 1000).toFixed(1)}K
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
              💰 ${usageStats.today.cost.toFixed(2)}
            </div>
          </Card>
        </div>
      )}

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
