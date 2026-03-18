import { useState } from 'react';
import { useLocale } from '@/locales';
import { TelegramPanel } from '@/components/chat-app/telegram/TelegramPanel';
import { FeishuPanel } from '@/components/chat-app/feishu/FeishuPanel';

interface TabDef {
  id: string;
  labelKey: string;
  panel: () => JSX.Element;
}

const tabs: TabDef[] = [
  { id: 'telegram', labelKey: 'chatApp.telegram', panel: () => <TelegramPanel /> },
  { id: 'feishu', labelKey: 'chatApp.feishu', panel: () => <FeishuPanel /> },
];

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
