import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLocale } from '@/locales';
import { TelegramPanel } from '@/components/chat-app/telegram/TelegramPanel';
import { WeixinPanel } from '@/components/chat-app/weixin/WeixinPanel';
import { getRemotePlatformMeta, REMOTE_PLATFORM_ORDER, type RemotePlatformId } from '@/lib/remote-platforms';
import { useTauriCommands } from '@/hooks/useTauriCommands';

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
  const [tmuxInstalled, setTmuxInstalled] = useState(true);
  const { checkTmuxInstalled } = useTauriCommands();
  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  useEffect(() => {
    checkTmuxInstalled()
      .then(setTmuxInstalled)
      .catch(() => setTmuxInstalled(false));
  }, [checkTmuxInstalled]);

  return (
    <div className="page-transition-enter space-y-5">
      {!tmuxInstalled && (
        <div className="rounded-xl border border-warning/25 bg-warning/8 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium text-foreground">{t('chatApp.tmuxOptionalTitle')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('chatApp.tmuxOptionalNotice')}</p>
              <p className="mt-2 font-mono text-2xs text-muted-foreground">{t('settings.tmuxInstallCmd')}</p>
            </div>
          </div>
        </div>
      )}

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
