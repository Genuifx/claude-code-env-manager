import { ReactNode } from 'react';
import { SideRail } from './SideRail';
import { PageHeader } from './PageHeader';

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  pageTitle: string;
  pageActions?: ReactNode;
}

export function AppLayout({ children, activeTab, onTabChange, pageTitle, pageActions }: AppLayoutProps) {
  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <SideRail activeTab={activeTab} onTabChange={onTabChange} />
      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader title={pageTitle}>
          {pageActions}
        </PageHeader>
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
