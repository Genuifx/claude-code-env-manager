import { cn } from '@/lib/utils';
import { Home, Terminal, Globe, BarChart3, Sparkles, Settings, MessageSquare, Clock } from 'lucide-react';

interface SideRailProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
  shortcut: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: '',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home, shortcut: '1' },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { id: 'sessions', label: 'Sessions', icon: Terminal, shortcut: '2' },
      { id: 'environments', label: 'Environments', icon: Globe, shortcut: '3' },
      { id: 'skills', label: 'Skills', icon: Sparkles, shortcut: '5' },
      { id: 'history', label: 'History', icon: MessageSquare, shortcut: '6' },
      { id: 'cron', label: 'Cron', icon: Clock, shortcut: '8' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { id: 'analytics', label: 'Analytics', icon: BarChart3, shortcut: '4' },
    ],
  },
];

const bottomItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: '7' },
];

function NavButton({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      title={`${item.label} (⌘${item.shortcut})`}
      className={cn(
        'sidebar-nav-item group relative w-full flex items-center gap-2.5 px-2.5 h-[30px] rounded-lg',
        'transition-colors duration-[var(--duration-fast)]',
        isActive
          ? 'sidebar-nav-active text-primary'
          : 'text-sidebar-foreground hover:text-foreground hover:bg-white/[0.06]'
      )}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2 : 1.8} />
      <span className="text-[13px] leading-none truncate">{item.label}</span>
      <span className="ml-auto text-[11px] font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-fast)] text-muted-foreground"
      >
        ⌘{item.shortcut}
      </span>
    </button>
  );
}

export function SideRail({ activeTab, onTabChange }: SideRailProps) {
  return (
    <aside className="w-[200px] h-full shrink-0 flex flex-col glass-sidebar-panel glass-noise relative rounded-xl overflow-hidden">
      {/* Traffic light region */}
      <div className="h-[52px] shrink-0" />

      {/* Nav groups */}
      <nav className="flex-1 flex flex-col gap-4 overflow-y-auto px-3">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.title && (
              <div className="px-2.5 mb-1.5 text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                {group.title}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  isActive={activeTab === item.id}
                  onClick={() => onTabChange(item.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom items */}
      <div className="flex flex-col gap-0.5 px-3 py-3 border-t border-white/[0.06]">
        {bottomItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </div>
    </aside>
  );
}
