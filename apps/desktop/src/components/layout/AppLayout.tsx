import { ReactNode } from 'react';
import { SideRail } from './SideRail';
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
  const { t } = useLocale();
  const isWorkspace = activeTab === 'workspace';
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
    <div className="h-screen flex overflow-hidden relative">
      {/* Sidebar wrapper — adds inset padding around the floating panel */}
      <div className="p-2 pr-0 shrink-0 relative z-20">
        <SideRail activeTab={activeTab} onTabChange={onTabChange} onTabPrefetch={onTabPrefetch} glassMuted={isWorkspace} />
      </div>

      {/* Main content area — semi-transparent so ambient orbs bleed through glass panels */}
      <div className="app-content-shell flex-1 flex flex-col min-w-0 relative z-10 overflow-hidden">
        {/* Ambient background — lives inside content area only */}
        <div className="ambient-bg" aria-hidden="true">
          <div className="ambient-orb-3" />
          <div className="ambient-orb-4" />
        </div>

        {/* Titlebar spacer + page title — also serves as drag region for non-workspace pages */}
        {!isWorkspace && (
          <div data-tauri-drag-region className="h-[52px] shrink-0 flex items-end px-8 pb-2 relative z-10">
            <div className="flex items-baseline gap-3">
              {pageTitle && (
                <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
              )}
              {subtitle && (
                <span className="text-sm text-muted-foreground">{subtitle}</span>
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
      </div>
    </div>
  );
}
