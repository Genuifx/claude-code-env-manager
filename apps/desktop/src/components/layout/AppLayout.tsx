import { ReactNode } from 'react';
import { SideRail } from './SideRail';
import { MacFullscreenWindowControls } from './MacFullscreenWindowControls';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useLocale } from '@/locales';

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onTabPrefetch?: (tab: string) => void;
  pageActions?: ReactNode;
  fullBleed?: boolean;
}

export function AppLayout({
  children,
  activeTab,
  onTabChange,
  onTabPrefetch,
  pageActions,
  fullBleed = false,
}: AppLayoutProps) {
  return (
    <SidebarProvider className="h-screen flex overflow-hidden relative">
      <MacFullscreenWindowControls />
      <AppLayoutBody
        activeTab={activeTab}
        onTabChange={onTabChange}
        onTabPrefetch={onTabPrefetch}
        pageActions={pageActions}
        fullBleed={fullBleed}
      >
        {children}
      </AppLayoutBody>
    </SidebarProvider>
  );
}

function AppLayoutBody({
  children,
  activeTab,
  onTabChange,
  onTabPrefetch,
  pageActions,
  fullBleed = false,
}: AppLayoutProps) {
  const { t } = useLocale();
  const { open, state } = useSidebar();
  const isWorkspace = activeTab === 'workspace';
  const sidebarToggleLabel = state === 'collapsed' ? t('sideRail.expand') : t('sideRail.collapse');
  const titleKeyMap: Record<string, string> = {
    'proxy-debug': 'sideRail.proxyDebug',
    'chat-app': 'sideRail.chatApp',
  };
  const pageTitleKey = titleKeyMap[activeTab] || `sideRail.${activeTab}`;
  const pageTitle = isWorkspace ? undefined : (t(pageTitleKey) || t('sideRail.workspace'));

  const subtitleKeyMap: Record<string, string> = {
    workspace: 'workspace.subtitle',
    sessions: 'sessions.subtitle',
    environments: 'environments.description',
    skills: 'skills.subtitle',
    history: 'history.subtitle',
    analytics: 'analytics.subtitle',
    cron: 'cron.subtitle',
    'chat-app': 'chatApp.subtitle',
    'proxy-debug': 'proxyDebug.subtitle',
    settings: 'settings.subtitle',
  };
  const subtitle = subtitleKeyMap[activeTab] && !isWorkspace ? t(subtitleKeyMap[activeTab]) : undefined;

  return (
    <>
      <AppSidebarToggleAnchor label={sidebarToggleLabel} />

      <Sidebar>
        {open && (
          <SideRail activeTab={activeTab} onTabChange={onTabChange} onTabPrefetch={onTabPrefetch} glassMuted={isWorkspace} />
        )}
      </Sidebar>

      {/* Main content area — semi-transparent so ambient orbs bleed through glass panels */}
      <SidebarInset className="app-content-shell flex-1 flex flex-col min-w-0 relative z-10 overflow-hidden">
        {/* Ambient background — lives inside content area only */}
        <div className="ambient-bg" aria-hidden="true">
          <div className="ambient-orb-3" />
          <div className="ambient-orb-4" />
        </div>

        {/* Titlebar spacer + page title — also serves as drag region for non-workspace pages */}
        {!isWorkspace && (
          <div data-tauri-drag-region className="app-titlebar-row h-12 shrink-0 flex items-center gap-3 relative z-10">
            <div className="flex items-baseline gap-3 min-w-0">
              {pageTitle && (
                <h1 className="text-lg font-semibold text-foreground truncate">{pageTitle}</h1>
              )}
              {subtitle && (
                <span className="text-sm text-muted-foreground truncate">{subtitle}</span>
              )}
            </div>
            {pageActions && (
              <div className="flex items-center gap-3 ml-auto relative z-[110]">
                {pageActions}
              </div>
            )}
          </div>
        )}
        <main
          className={fullBleed
            ? 'scroll-glass-root flex-1 overflow-hidden relative z-10'
            : 'scroll-glass-root flex-1 overflow-y-auto px-8 py-4 relative z-10'}
        >
          <div className={fullBleed ? 'w-full h-full' : 'max-w-6xl'}>
            {children}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}

function AppSidebarToggleAnchor({ label }: { label: string }) {
  return (
    <div className="app-sidebar-toggle-anchor absolute z-[120]">
      <SidebarTrigger
        aria-label={label}
        title={`${label} (⌘B)`}
      />
    </div>
  );
}
