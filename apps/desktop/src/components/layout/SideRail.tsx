import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import { Home, Terminal, Globe, BarChart3, Sparkles, Settings, MessageSquare, Clock } from 'lucide-react';

interface SideRailProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavItemDef {
  id: string;
  labelKey: string;
  icon: typeof Home;
  shortcut: string;
}

interface NavGroupDef {
  titleKey: string;
  items: NavItemDef[];
}

const navGroupDefs: NavGroupDef[] = [
  {
    titleKey: '',
    items: [
      { id: 'dashboard', labelKey: 'sideRail.dashboard', icon: Home, shortcut: '1' },
    ],
  },
  {
    titleKey: 'sideRail.groupWorkspace',
    items: [
      { id: 'sessions', labelKey: 'sideRail.sessions', icon: Terminal, shortcut: '2' },
      { id: 'environments', labelKey: 'sideRail.environments', icon: Globe, shortcut: '3' },
      { id: 'skills', labelKey: 'sideRail.skills', icon: Sparkles, shortcut: '4' },
      { id: 'history', labelKey: 'sideRail.history', icon: MessageSquare, shortcut: '5' },
      { id: 'cron', labelKey: 'sideRail.cron', icon: Clock, shortcut: '6' },
    ],
  },
  {
    titleKey: 'sideRail.groupInsights',
    items: [
      { id: 'analytics', labelKey: 'sideRail.analytics', icon: BarChart3, shortcut: '7' },
    ],
  },
];

const bottomItemDefs: NavItemDef[] = [
  { id: 'settings', labelKey: 'sideRail.settings', icon: Settings, shortcut: '8' },
];

function NavButton({
  item,
  label,
  isActive,
  onClick,
}: {
  item: NavItemDef;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      title={`${label} (⌘${item.shortcut})`}
      className={cn(
        'sidebar-nav-item group relative w-full flex items-center gap-2.5 px-2.5 h-[30px] rounded-lg',
        'transition-colors duration-[var(--duration-fast)]',
        isActive
          ? 'sidebar-nav-active text-primary'
          : 'text-sidebar-foreground hover:text-foreground hover:bg-white/[0.06]'
      )}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2 : 1.8} />
      <span className="text-[13px] leading-none truncate">{label}</span>
      <span className="ml-auto text-[11px] font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-fast)] text-muted-foreground"
      >
        ⌘{item.shortcut}
      </span>
    </button>
  );
}

export function SideRail({ activeTab, onTabChange }: SideRailProps) {
  const { t } = useLocale();
  return (
    <aside className="w-[200px] h-full shrink-0 flex flex-col glass-sidebar-panel glass-noise relative rounded-xl overflow-hidden">
      {/* Traffic light region */}
      <div className="h-[52px] shrink-0" />

      {/* Nav groups */}
      <nav className="flex-1 flex flex-col gap-4 overflow-y-auto px-3">
        {navGroupDefs.map((group, gi) => (
          <div key={gi}>
            {group.titleKey && (
              <div className="px-2.5 mb-1.5 text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                {t(group.titleKey)}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  label={t(item.labelKey)}
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
        {bottomItemDefs.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            label={t(item.labelKey)}
            isActive={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </div>
    </aside>
  );
}
