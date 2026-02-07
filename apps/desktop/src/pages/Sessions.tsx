import { useState } from 'react';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionCard, SessionList } from '@/components/sessions';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';

interface SessionsProps {
  onLaunch: () => void;
}

export function Sessions({ onLaunch }: SessionsProps) {
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const { sessions } = useAppStore();
  const { focusSession, minimizeSession, closeSession } = useTauriCommands();

  const handleFocus = async (id: string) => {
    try {
      await focusSession(id);
    } catch (err) {
      console.error('Failed to focus session:', err);
    }
  };

  const handleMinimize = async (id: string) => {
    try {
      await minimizeSession(id);
    } catch (err) {
      console.error('Failed to minimize session:', err);
    }
  };

  const handleClose = async (id: string) => {
    if (confirm('确定要关闭此会话吗？')) {
      try {
        await closeSession(id);
      } catch (err) {
        console.error('Failed to close session:', err);
      }
    }
  };

  const handleMinimizeAll = async () => {
    for (const session of sessions.filter(s => s.status === 'running')) {
      await minimizeSession(session.id);
    }
  };

  const handleCloseAll = async () => {
    if (confirm('确定要关闭所有会话吗？')) {
      for (const session of sessions) {
        await closeSession(session.id);
      }
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Sessions ({sessions.length})
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            <Button
              size="sm"
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              onClick={() => setViewMode('card')}
              className="h-8 w-8 p-0"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* New Session Button */}
          <Button onClick={onLaunch}>
            <Plus className="w-4 h-4 mr-2" />
            新会话
          </Button>
        </div>
      </div>

      {/* Sessions Display */}
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-4">
            <span className="text-4xl">💬</span>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            暂无运行中的会话
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-4">
            点击"新会话"按钮启动 Claude Code
          </p>
          <Button onClick={onLaunch}>
            <Plus className="w-4 h-4 mr-2" />
            启动 Claude Code
          </Button>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onFocus={handleFocus}
              onMinimize={handleMinimize}
              onClose={handleClose}
            />
          ))}
        </div>
      ) : (
        <SessionList
          sessions={sessions}
          onFocus={handleFocus}
          onMinimize={handleMinimize}
          onClose={handleClose}
        />
      )}

      {/* Layout Controls (Future Feature) */}
      {sessions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              布局控制:
            </span>
            <Button size="sm" variant="outline" disabled>
              ⊞ 4分屏
            </Button>
            <Button size="sm" variant="outline" onClick={handleMinimizeAll}>
              — 全部最小化
            </Button>
            <Button size="sm" variant="outline" onClick={handleCloseAll}>
              ✕ 全部关闭
            </Button>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
              (4分屏: 未来功能)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
