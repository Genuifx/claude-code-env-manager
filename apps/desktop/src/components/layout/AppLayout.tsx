import { ReactNode } from 'react';
import { SideRail } from './SideRail';

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  pageTitle: string;
  pageActions?: ReactNode;
}

export function AppLayout({ children, activeTab, onTabChange, pageTitle, pageActions }: AppLayoutProps) {
  return (
    <div className="h-screen flex overflow-hidden relative">
      {/* Full-width drag region at top — sits above everything for window dragging */}
      <div data-tauri-drag-region className="absolute top-0 left-0 right-0 h-[52px] z-[100]" />

      {/* Sidebar wrapper — adds inset padding around the floating panel */}
      <div className="p-2 pr-0 shrink-0 relative z-20">
        <SideRail activeTab={activeTab} onTabChange={onTabChange} />
      </div>

      {/* Main content area — opaque, covers vibrancy with its own background */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 bg-background overflow-hidden">
        {/* Ambient background — lives inside content area only */}
        <div className="ambient-bg" aria-hidden="true">
          <div className="ambient-orb-3" />
          <div className="ambient-orb-4" />
        </div>

        {/* Titlebar spacer + page title */}
        <div className="h-[52px] shrink-0 flex items-end px-8 pb-2 relative z-10">
          <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
          {pageActions && (
            <div className="flex items-center gap-3 ml-auto relative z-[110]">
              {pageActions}
            </div>
          )}
        </div>
        <main className="flex-1 overflow-y-auto px-8 py-4 relative z-10">
          <div className="max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
