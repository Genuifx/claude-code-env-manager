import { cn } from '@/lib/utils';
import { Home, Terminal, Globe, BarChart3, Sparkles, Settings } from 'lucide-react';

interface SideRailProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
  shortcut: string;
  tooltipLabel?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: Home, shortcut: '1' },
  { id: 'sessions', label: 'Sessions', icon: Terminal, shortcut: '2' },
  { id: 'environments', label: 'Envs', icon: Globe, shortcut: '3', tooltipLabel: 'Environments' },
  { id: 'analytics', label: 'Stats', icon: BarChart3, shortcut: '4', tooltipLabel: 'Analytics' },
  { id: 'skills', label: 'Skills', icon: Sparkles, shortcut: '5' },
];

const bottomItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: '6' },
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
      title={`${item.tooltipLabel || item.label} (\u2318${item.shortcut})`}
      className={cn(
        'relative w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5',
        'transition-all duration-150',
        isActive
          ? 'glass-nav-active text-sidebar-active nav-active-bar'
          : 'text-sidebar-foreground hover:text-foreground hover:bg-white/[0.06] hover:scale-105'
      )}
    >
      <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
      <span className="text-2xs leading-none font-medium">{item.label}</span>
    </button>
  );
}

export function SideRail({ activeTab, onTabChange }: SideRailProps) {
  return (
    <aside className="w-[72px] h-full flex flex-col items-center py-4 gap-1.5 glass-sidebar border-r border-sidebar-border/60">
      {/* CC Logo */}
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md glow-amber">
        <span className="text-primary-foreground font-bold text-xs tracking-tight">CC</span>
      </div>
      <div className="mb-5" />

      {/* Nav items */}
      {navItems.map((item) => (
        <NavButton
          key={item.id}
          item={item}
          isActive={activeTab === item.id}
          onClick={() => onTabChange(item.id)}
        />
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom items */}
      {bottomItems.map((item) => (
        <NavButton
          key={item.id}
          item={item}
          isActive={activeTab === item.id}
          onClick={() => onTabChange(item.id)}
        />
      ))}
    </aside>
  );
}
