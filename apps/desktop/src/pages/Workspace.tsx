import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { WorkspaceStatusStrip } from '@/components/workspace/WorkspaceStatusStrip';
import { ProjectTree } from '@/components/workspace/ProjectTree';
import { ResumeBar } from '@/components/workspace/ResumeBar';
import { WorkspaceSkeleton } from '@/components/ui/skeleton-states';
import { useAppStore } from '@/store';
import type { LaunchClient } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import {
  useSessionUpdatedEvent,
  useTaskCompletedEvent,
  useTaskErrorEvent,
  useSessionInterruptedEvent,
} from '@/hooks/useTauriEvents';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLocale } from '@/locales';
import { scheduleAfterFirstPaint } from '@/lib/idle';
import {
  fetchConversationDetail,
  fetchHistorySessions,
  invalidateHistoryCache,
} from '@/features/conversations/historyData';
import type {
  ConversationMessageData,
  HistorySegment,
  HistorySessionItem,
} from '@/features/conversations/types';
import { toSessionKey } from '@/features/conversations/types';
import { shallow } from 'zustand/shallow';

const LazyHistoryDetail = lazy(async () =>
  import('@/components/workspace/WorkspaceConversationDetail').then((m) => ({
    default: m.WorkspaceConversationDetail,
  }))
);

function DetailFallback() {
  return <div className="flex-1 overflow-hidden" />;
}

interface WorkspaceProps {
  isActive?: boolean;
  onNavigate: (tab: string) => void;
  onLaunchWithDir: (dir: string, client?: LaunchClient) => void;
}

export function Workspace({ isActive = true, onNavigate, onLaunchWithDir }: WorkspaceProps) {
  const { t } = useLocale();
  const { isLoadingEnvs, isLoadingStats } = useAppStore(
    (state) => ({
      isLoadingEnvs: state.isLoadingEnvs,
      isLoadingStats: state.isLoadingStats,
    }),
    shallow
  );

  const {
    launchClaudeCode,
    openDirectoryPicker,
    loadCronTasks,
    checkCodexInstalled,
    checkOpenCodeInstalled,
    setSessionTitle,
  } =
    useTauriCommands();

  const [sessions, setSessions] = useState<HistorySessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessageData[]>([]);
  const [segments, setSegments] = useState<HistorySegment[]>([]);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [codexInstalled, setCodexInstalled] = useState(false);
  const [opencodeInstalled, setOpenCodeInstalled] = useState(false);
  const launchedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshRequestSeqRef = useRef(0);
  const conversationRequestSeqRef = useRef(0);
  const pendingRefreshRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const prevIsActiveRef = useRef(isActive);
  const selectedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    selectedKeyRef.current = selectedKey;
  }, [selectedKey]);

  useEffect(() => {
    return () => {
      if (launchedTimerRef.current) clearTimeout(launchedTimerRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const cancelDeferred = scheduleAfterFirstPaint(() => {
      void loadCronTasks().catch(() => {});
      checkCodexInstalled().then(setCodexInstalled).catch(() => {});
      checkOpenCodeInstalled().then(setOpenCodeInstalled).catch(() => {});
    }, { delayMs: 260, timeoutMs: 1400 });
    return () => {
      cancelDeferred();
    };
  }, [loadCronTasks, checkCodexInstalled, checkOpenCodeInstalled]);

  const syncSessionState = useCallback((nextSessions: HistorySessionItem[]) => {
    setSessions(nextSessions);

    const currentSelectedKey = selectedKeyRef.current;
    if (!currentSelectedKey) {
      return;
    }

    const stillExists = nextSessions.some((session) => toSessionKey(session) === currentSelectedKey);
    if (!stillExists) {
      selectedKeyRef.current = null;
      setSelectedKey(null);
      setMessages([]);
      setSegments([]);
      setActiveSegment(null);
      setIsLoadingMessages(false);
      setLaunched(false);
    }
  }, []);

  const loadConversation = useCallback(
    async (
      session: HistorySessionItem,
      options: { resetBeforeLoad?: boolean; showLoading?: boolean } = {}
    ) => {
      const { resetBeforeLoad = true, showLoading = true } = options;
      const requestSeq = ++conversationRequestSeqRef.current;

      if (resetBeforeLoad) {
        setMessages([]);
        setSegments([]);
        setActiveSegment(null);
        setLaunched(false);
      }

      if (showLoading) {
        setIsLoadingMessages(true);
      }

      try {
        const { messages: msgs, segments: segs } = await fetchConversationDetail(session);

        if (requestSeq !== conversationRequestSeqRef.current) {
          return;
        }

        setMessages(msgs);
        setSegments(segs);
      } catch (err) {
        if (requestSeq !== conversationRequestSeqRef.current) {
          return;
        }
        console.error('Failed to load conversation:', err);
      } finally {
        if (showLoading && requestSeq === conversationRequestSeqRef.current) {
          setIsLoadingMessages(false);
        }
      }
    },
    []
  );

  const refreshWorkspaceData = useCallback(
    async (
      options: { force?: boolean; silent?: boolean; includeSelectedConversation?: boolean } = {}
    ) => {
      const {
        force = true,
        silent = true,
        includeSelectedConversation = true,
      } = options;
      const requestSeq = ++refreshRequestSeqRef.current;

      setIsRefreshing(true);
      if (!hasLoadedRef.current) {
        setIsLoadingSessions(true);
      }

      try {
        const nextSessions = await fetchHistorySessions('all', force);

        if (requestSeq !== refreshRequestSeqRef.current) {
          return;
        }

        syncSessionState(nextSessions);
        hasLoadedRef.current = true;

        if (includeSelectedConversation) {
          const currentSelectedKey = selectedKeyRef.current;
          if (currentSelectedKey) {
            const selectedSession = nextSessions.find(
              (session) => toSessionKey(session) === currentSelectedKey
            );
            if (selectedSession) {
              await loadConversation(selectedSession, {
                resetBeforeLoad: false,
                showLoading: false,
              });
            }
          }
        }
      } catch (err) {
        if (requestSeq !== refreshRequestSeqRef.current) {
          return;
        }

        console.error('Failed to refresh workspace history:', err);
        if (!silent) {
          toast.error(t('workspace.refreshFailed'));
        }
      } finally {
        if (requestSeq === refreshRequestSeqRef.current) {
          setIsRefreshing(false);
          setIsLoadingSessions(false);
          pendingRefreshRef.current = false;
        }
      }
    },
    [loadConversation, syncSessionState, t]
  );

  const scheduleWorkspaceRefresh = useCallback((delayMs = 700) => {
    pendingRefreshRef.current = true;

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      if (!isActive) {
        return;
      }

      void refreshWorkspaceData({
        force: true,
        silent: true,
        includeSelectedConversation: true,
      });
    }, delayMs);
  }, [isActive, refreshWorkspaceData]);

  useEffect(() => {
    void refreshWorkspaceData({
      force: false,
      silent: true,
      includeSelectedConversation: false,
    });
  }, [refreshWorkspaceData]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      prevIsActiveRef.current = isActive;
      return;
    }

    const becameActive = isActive && !prevIsActiveRef.current;
    prevIsActiveRef.current = isActive;

    if (!becameActive) {
      return;
    }

    void refreshWorkspaceData({
      force: true,
      silent: true,
      includeSelectedConversation: true,
    });
  }, [isActive, refreshWorkspaceData]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleWindowFocus = () => {
      scheduleWorkspaceRefresh(220);
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isActive, scheduleWorkspaceRefresh]);

  useSessionUpdatedEvent(() => {
    scheduleWorkspaceRefresh();
  });

  useTaskCompletedEvent(() => {
    scheduleWorkspaceRefresh();
  });

  useTaskErrorEvent(() => {
    scheduleWorkspaceRefresh();
  });

  useSessionInterruptedEvent(() => {
    scheduleWorkspaceRefresh();
  });

  const selectedSession = useMemo(() => {
    if (!selectedKey) return null;
    return sessions.find((s) => toSessionKey(s) === selectedKey) ?? null;
  }, [selectedKey, sessions]);

  const handleSelect = useCallback(
    async (session: HistorySessionItem) => {
      const key = toSessionKey(session);
      setSelectedKey(key);
      selectedKeyRef.current = key;
      await loadConversation(session, {
        resetBeforeLoad: true,
        showLoading: true,
      });
    },
    [loadConversation]
  );

  const handleResume = useCallback(async () => {
    if (!selectedSession) return;
    try {
      await launchClaudeCode(
        selectedSession.project || undefined,
        selectedSession.id,
        selectedSession.source,
        selectedSession.envName,
      );
      localStorage.setItem("ccem-ftue-launched", "true");
      if (launchedTimerRef.current) clearTimeout(launchedTimerRef.current);
      setLaunched(true);
      launchedTimerRef.current = setTimeout(() => {
        setLaunched(false);
        launchedTimerRef.current = null;
      }, 1200);
      scheduleWorkspaceRefresh(1200);
    } catch (err) {
      console.error("Failed to resume session:", err);
    }
  }, [selectedSession, launchClaudeCode, scheduleWorkspaceRefresh]);

  const handleNewSession = useCallback(async (client: LaunchClient = 'claude') => {
    try {
      const dir = await openDirectoryPicker();
      if (dir) {
        onLaunchWithDir(dir, client);
        localStorage.setItem('ccem-ftue-launched', 'true');
        scheduleWorkspaceRefresh(1200);
      }
    } catch (err) {
      console.error('Failed to open directory dialog:', err);
    }
  }, [openDirectoryPicker, onLaunchWithDir, scheduleWorkspaceRefresh]);

  const shortcuts = useMemo(
    () => ({
      'meta+o': () => void handleNewSession(),
    }),
    [handleNewSession]
  );
  useKeyboardShortcuts(isActive ? shortcuts : {});

  if (isLoadingEnvs || isLoadingStats) {
    return <WorkspaceSkeleton />;
  }

  return (
    <div className="page-transition-enter flex flex-col h-full">
      <WorkspaceStatusStrip onNavigate={onNavigate} />

      <div className="workspace-main-container flex flex-1 min-h-0 mx-3 mb-3 overflow-hidden">
        <ProjectTree
          sessions={sessions}
          isLoading={isLoadingSessions}
          isRefreshing={isRefreshing}
          selectedKey={selectedKey}
          onSelect={handleSelect}
          onNewSession={handleNewSession}
          onRefresh={() => {
            void refreshWorkspaceData({
              force: true,
              silent: false,
              includeSelectedConversation: true,
            });
          }}
          codexInstalled={codexInstalled}
          opencodeInstalled={opencodeInstalled}
          onSaveTitle={async (session, title) => {
            await setSessionTitle(session.source, session.id, title);
          }}
          onSessionsChanged={async () => {
            invalidateHistoryCache();
            const refreshed = await fetchHistorySessions('all', true);
            setSessions(refreshed);
          }}
        />

        <div className="flex-1 flex flex-col min-w-0 workspace-reading-surface">
          {selectedSession ? (
            <Suspense fallback={<DetailFallback />}>
              <LazyHistoryDetail
                key={selectedSession ? toSessionKey(selectedSession) : undefined}
                selectedSession={selectedSession}
                messages={messages}
                segments={segments}
                activeSegment={activeSegment}
                onActiveSegmentChange={setActiveSegment}
                isLoadingMessages={isLoadingMessages}
              />
            </Suspense>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {t('workspace.selectConversation')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('workspace.selectConversationHint')}
                </p>
              </div>
            </div>
          )}

          <ResumeBar
            selectedSession={selectedSession}
            onResume={handleResume}
            resumed={launched}
          />
        </div>
      </div>
    </div>
  );
}
