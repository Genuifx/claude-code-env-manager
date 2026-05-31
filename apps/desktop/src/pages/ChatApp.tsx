import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLocale } from '@/locales';
import { TelegramPanel } from '@/components/chat-app/telegram/TelegramPanel';
import { WecomPanel } from '@/components/chat-app/wecom/WecomPanel';
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
  wecom: () => <WecomPanel />,
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
    <div className="page-transition-enter space-y-6">
      {/* tmux warning */}
      {!tmuxInstalled && (
        <div className="rounded-2xl border border-warning/20 bg-warning/5 px-5 py-4">
          <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-semibold text-foreground">{t('chatApp.tmuxOptionalTitle')}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t('chatApp.tmuxOptionalNotice')}</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground/70">{t('settings.tmuxInstallCmd')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Platform selector — Apple configurator-chip style */}
      <div className="flex items-center gap-1.5">
        {tabs.map((tab) => {
          const meta = getRemotePlatformMeta(tab.id);
          const Icon = meta.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                inline-flex items-center gap-2 rounded-full px-4 py-2
                text-sm font-medium transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2
                ${isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-black/[0.07] dark:hover:bg-white/[0.1]'
                }
              `}
              aria-pressed={isActive}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <div className="animate-in fade-in duration-150">
        {currentTab.panel()}
      </div>
    </div>
  );
}
