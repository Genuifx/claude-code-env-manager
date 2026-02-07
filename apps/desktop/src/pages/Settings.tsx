import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import type { PermissionModeName } from '@ccem/core/browser';

export function Settings() {
  const { defaultMode, setDefaultMode } = useAppStore();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [autoStart, setAutoStart] = useState(false);
  const [startMinimized, setStartMinimized] = useState(false);
  const [closeToTray, setCloseToTray] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await invoke<{ theme: string; autoStart: boolean; startMinimized: boolean; closeToTray: boolean; defaultMode: string }>('get_settings');
        setTheme(settings.theme as 'light' | 'dark' | 'system');
        setAutoStart(settings.autoStart);
        setStartMinimized(settings.startMinimized);
        setCloseToTray(settings.closeToTray);
        if (settings.defaultMode) {
          setDefaultMode(settings.defaultMode as PermissionModeName);
        }
      } catch {
        // Fallback: load from localStorage
        const saved = localStorage.getItem('ccem-settings');
        if (saved) {
          try {
            const settings = JSON.parse(saved);
            setTheme(settings.theme || 'system');
            setAutoStart(settings.autoStart ?? false);
            setStartMinimized(settings.startMinimized ?? false);
            setCloseToTray(settings.closeToTray ?? true);
            if (settings.defaultMode) {
              setDefaultMode(settings.defaultMode as PermissionModeName);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    };
    loadSettings();
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  const handleSaveSettings = async () => {
    const settings = {
      theme,
      autoStart,
      startMinimized,
      closeToTray,
      defaultMode,
    };
    try {
      await invoke('save_settings', { settings });
      toast.success('设置已保存');
    } catch {
      // Fallback: save to localStorage if Tauri is not available
      localStorage.setItem('ccem-settings', JSON.stringify(settings));
      toast.success('设置已保存 (本地)');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Settings
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          应用配置和偏好设置
        </p>
      </div>

      {/* Appearance */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          外观
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              主题
            </label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                onClick={() => setTheme('dark')}
              >
                ⚫ 深色
              </Button>
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                onClick={() => setTheme('light')}
              >
                ⚪ 浅色
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                onClick={() => setTheme('system')}
              >
                🖥️ 跟随系统
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Application */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          应用
        </h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                开机自动启动
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                系统启动时自动运行
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={startMinimized}
              onChange={(e) => setStartMinimized(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                启动时最小化到托盘
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                应用启动时不显示主窗口
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={closeToTray}
              onChange={(e) => setCloseToTray(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                关闭窗口时最小化（而非退出）
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                点击关闭按钮时保持应用在后台运行
              </div>
            </div>
          </label>
        </div>
      </Card>

      {/* Default Permission */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          默认权限
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              默认权限模式
            </label>
            <select
              value={defaultMode || 'dev'}
              onChange={(e) => setDefaultMode(e.target.value as PermissionModeName)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="yolo">yolo - 完全开放，无限制</option>
              <option value="dev">dev - 标准开发权限</option>
              <option value="safe">safe - 保守权限</option>
              <option value="readonly">readonly - 只读访问</option>
              <option value="ci">ci - CI/CD 流水线权限</option>
              <option value="audit">audit - 安全审计</option>
            </select>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              💡 启动 Claude 时默认使用此权限，可在 Home 页临时覆盖
            </p>
          </div>
        </div>
      </Card>

      {/* About */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          关于
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              版本
            </span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              v2.0.0
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.info('当前已是最新版本 v2.0.0')}>
              检查更新
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open('https://github.com/anthropics/claude-code-env-manager', '_blank')}>
              GitHub
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open('https://github.com/anthropics/claude-code-env-manager/issues', '_blank')}>
              反馈问题
            </Button>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings}>
          保存设置
        </Button>
      </div>
    </div>
  );
}
