import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TerminalOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

const terminalOptions: TerminalOption[] = [
  { id: 'terminal', name: 'Terminal.app', description: 'macOS 内置终端', icon: '🖥️', available: true },
  { id: 'iterm2', name: 'iTerm2', description: '功能强大的终端替代品', icon: '🎨', available: true },
  { id: 'warp', name: 'Warp', description: '现代化 AI 终端', icon: '⚡', available: true },
  { id: 'ghostty', name: 'Ghostty', description: '快速、原生的终端', icon: '👻', available: true },
];

export function Settings() {
  const [preferredTerminal, setPreferredTerminal] = useState('terminal');
  const [autoStart, setAutoStart] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [showInMenuBar, setShowInMenuBar] = useState(true);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ccem-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setPreferredTerminal(settings.preferredTerminal || 'terminal');
        setAutoStart(settings.autoStart || false);
        setMinimizeToTray(settings.minimizeToTray ?? true);
        setShowInMenuBar(settings.showInMenuBar ?? true);
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    const settings = {
      preferredTerminal,
      autoStart,
      minimizeToTray,
      showInMenuBar,
    };
    localStorage.setItem('ccem-settings', JSON.stringify(settings));
  };

  useEffect(() => {
    saveSettings();
  }, [preferredTerminal, autoStart, minimizeToTray, showInMenuBar]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          设置
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          配置 CCEM Desktop 应用偏好
        </p>
      </div>

      {/* Terminal Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
            <span className="text-lg">🖥️</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">终端设置</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">选择启动 Claude Code 时使用的终端</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {terminalOptions.map((terminal) => (
            <button
              key={terminal.id}
              onClick={() => setPreferredTerminal(terminal.id)}
              className={cn(
                'p-4 rounded-xl border text-left transition-all duration-200',
                preferredTerminal === terminal.id
                  ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-300 dark:border-emerald-700 shadow-lg shadow-emerald-500/10'
                  : 'bg-white dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{terminal.icon}</span>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    {terminal.name}
                    {preferredTerminal === terminal.id && (
                      <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">当前</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{terminal.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* App Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <span className="text-lg">⚙️</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">应用设置</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">配置应用行为</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50">
          <ToggleItem
            label="开机自动启动"
            description="登录系统时自动启动 CCEM Desktop"
            checked={autoStart}
            onChange={setAutoStart}
          />
          <ToggleItem
            label="关闭时最小化到托盘"
            description="点击关闭按钮时最小化到系统托盘而不是退出"
            checked={minimizeToTray}
            onChange={setMinimizeToTray}
          />
          <ToggleItem
            label="在菜单栏显示图标"
            description="在系统菜单栏显示 CCEM 快捷图标"
            checked={showInMenuBar}
            onChange={setShowInMenuBar}
          />
        </div>
      </section>

      {/* About Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
            <span className="text-lg">ℹ️</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">关于</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">版本信息和链接</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/25">
              <span className="text-white font-bold text-xl">CC</span>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white">CCEM Desktop</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">Claude Code Environment Manager</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">版本 1.8.0</p>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href="https://github.com/anthropics/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📦</span>
                <span className="text-slate-700 dark:text-slate-200">GitHub 仓库</span>
              </div>
              <span className="text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all">→</span>
            </a>
            <a
              href="https://docs.anthropic.com/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📚</span>
                <span className="text-slate-700 dark:text-slate-200">文档</span>
              </div>
              <span className="text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/25">
            <span className="text-lg">⚠️</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">危险区域</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">谨慎操作</p>
          </div>
        </div>

        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-200 dark:border-rose-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-rose-900 dark:text-rose-100">重置所有设置</h4>
              <p className="text-sm text-rose-700 dark:text-rose-300">将所有设置恢复为默认值</p>
            </div>
            <Button
              variant="outline"
              className="border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30"
              onClick={() => {
                if (confirm('确定要重置所有设置吗？')) {
                  localStorage.removeItem('ccem-settings');
                  setPreferredTerminal('terminal');
                  setAutoStart(false);
                  setMinimizeToTray(true);
                  setShowInMenuBar(true);
                }
              }}
            >
              重置设置
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

interface ToggleItemProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleItem({ label, description, checked, onChange }: ToggleItemProps) {
  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <div className="font-medium text-slate-900 dark:text-white">{label}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
        )}
      >
        <span
          className={cn(
            'absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}
