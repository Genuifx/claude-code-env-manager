import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';

interface ProjectListProps {
  onLaunch: (workingDir: string) => void;
}

export function ProjectList({ onLaunch }: ProjectListProps) {
  const { favorites, recent, vscodeProjects, jetbrainsProjects, setSelectedWorkingDir } = useAppStore();
  const {
    addFavoriteProject,
    removeFavoriteProject,
    openDirectoryPicker,
    syncVSCodeProjects,
    syncJetBrainsProjects
  } = useTauriCommands();

  // Get project name from path
  const getProjectName = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  };

  // Truncate path for display
  const truncatePath = (path: string) => {
    const home = '/Users/';
    if (path.startsWith(home)) {
      const afterHome = path.substring(home.length);
      const firstSlash = afterHome.indexOf('/');
      if (firstSlash > 0) {
        return '~/' + afterHome.substring(firstSlash + 1);
      }
    }
    return path.length > 40 ? '...' + path.slice(-37) : path;
  };

  const handleAddFavorite = async () => {
    const path = await openDirectoryPicker();
    if (path) {
      const name = getProjectName(path);
      await addFavoriteProject(path, name);
    }
  };

  const handleLaunch = (path: string) => {
    setSelectedWorkingDir(path);
    onLaunch(path);
  };

  const handleAddToFavorites = async (path: string) => {
    const name = getProjectName(path);
    await addFavoriteProject(path, name);
  };

  // Check if path is already in favorites
  const isFavorite = (path: string) => favorites.some(f => f.path === path);

  return (
    <div className="space-y-6">
      {/* Favorites Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span>⭐</span> 收藏项目
          </h3>
          <Button variant="ghost" size="sm" onClick={handleAddFavorite}>
            <span className="mr-1">+</span> 添加收藏
          </Button>
        </div>
        {favorites.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-2">暂无收藏项目</p>
        ) : (
          <div className="space-y-2">
            {favorites.map((project) => (
              <div
                key={project.path}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">📁</span>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white truncate">
                      {project.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {truncatePath(project.path)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    onClick={() => handleLaunch(project.path)}
                  >
                    ▶
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => removeFavoriteProject(project.path)}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Section */}
      <div>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
          <span>🕐</span> 最近使用
        </h3>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-2">暂无最近使用记录</p>
        ) : (
          <div className="space-y-2">
            {recent.map((project) => (
              <div
                key={project.path}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">📁</span>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white truncate">
                      {getProjectName(project.path)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {truncatePath(project.path)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    onClick={() => handleLaunch(project.path)}
                  >
                    ▶
                  </Button>
                  {!isFavorite(project.path) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      onClick={() => handleAddToFavorites(project.path)}
                    >
                      ⭐
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VS Code Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span>💻</span> VS Code 项目
          </h3>
          <Button variant="ghost" size="sm" onClick={syncVSCodeProjects}>
            <span className="mr-1">🔄</span> 同步
          </Button>
        </div>
        {vscodeProjects.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-2">点击同步按钮获取 VS Code 项目</p>
        ) : (
          <div className="space-y-2">
            {vscodeProjects.map((project) => (
              <div
                key={project.path}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50 hover:border-violet-300 dark:hover:border-violet-700 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">📁</span>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white truncate">
                      {getProjectName(project.path)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {truncatePath(project.path)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    onClick={() => handleLaunch(project.path)}
                  >
                    ▶
                  </Button>
                  {!isFavorite(project.path) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      onClick={() => handleAddToFavorites(project.path)}
                    >
                      ⭐
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* JetBrains Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span>🧠</span> JetBrains 项目
          </h3>
          <Button variant="ghost" size="sm" onClick={syncJetBrainsProjects}>
            <span className="mr-1">🔄</span> 同步
          </Button>
        </div>
        {jetbrainsProjects.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-2">点击同步按钮获取 JetBrains IDE 项目</p>
        ) : (
          <div className="space-y-2">
            {jetbrainsProjects.map((project) => (
              <div
                key={project.path}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50 hover:border-orange-300 dark:hover:border-orange-700 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">📁</span>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white truncate">
                      {getProjectName(project.path)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      <span className="text-orange-500 dark:text-orange-400">{project.ide}</span>
                      {' · '}
                      {truncatePath(project.path)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    onClick={() => handleLaunch(project.path)}
                  >
                    ▶
                  </Button>
                  {!isFavorite(project.path) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      onClick={() => handleAddToFavorites(project.path)}
                    >
                      ⭐
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
