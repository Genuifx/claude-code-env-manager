import { useState } from 'react';
import { useLocale } from '@/locales';
import { TelegramPanel } from '@/components/chat-app/telegram/TelegramPanel';
import { WeixinPanel } from '@/components/chat-app/weixin/WeixinPanel';
import { getRemotePlatformMeta, REMOTE_PLATFORM_ORDER, type RemotePlatformId } from '@/lib/remote-platforms';

interface TabDef {
  id: RemotePlatformId;
  labelKey: string;
  panel: () => JSX.Element;
}

const panelByPlatform: Record<RemotePlatformId, () => JSX.Element> = {
  telegram: () => <TelegramPanel />,
  weixin: () => <WeixinPanel />,
};

const tabs: TabDef[] = REMOTE_PLATFORM_ORDER.map((id) => ({
  id,
  labelKey: getRemotePlatformMeta(id).labelKey,
  panel: panelByPlatform[id],
}));

export function ChatApp() {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <div className="page-transition-enter space-y-5">
      {/* Tab bar */}
      <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg glass-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all duration-150 ${
              activeTab === tab.id
                ? 'seg-active text-foreground'
                : 'seg-hover text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Active panel */}
      {currentTab.panel()}
    </div>
  );
}
