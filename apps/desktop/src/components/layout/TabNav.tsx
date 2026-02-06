import { cn } from '@/lib/utils';
import { Home, Terminal, Globe, BarChart3, Sparkles, Settings } from 'lucide-react';

interface TabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'dashboard', label: '🏠 Home', icon: Home },
  { id: 'sessions', label: '💬 Sessions', icon: Terminal },
  { id: 'environments', label: '🌐 Environments', icon: Globe },
  { id: 'analytics', label: '📊 Analytics', icon: BarChart3 },
  { id: 'skills', label: '✦ Skills', icon: Sparkles },
  { id: 'settings', label: '⚙️ Settings', icon: Settings },
];

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="flex items-center gap-0.5 p-1 bg-slate-100/80 dark:bg-slate-800/50 rounded-xl backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-out',
              'flex items-center gap-2',
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
            )}
          >
            <IconComponent
              className={cn(
                'w-4 h-4 transition-colors',
                activeTab === tab.id ? 'text-emerald-500' : 'text-slate-400'
              )}
            />
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
