import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { DashboardStatusStrip } from '@/components/dashboard/DashboardStatusStrip';
import { ProjectTree } from '@/components/dashboard/ProjectTree';
import { ResumeBar } from '@/components/dashboard/ResumeBar';
import { DashboardSkeleton } from '@/components/ui/skeleton-states';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLocale } from '@/locales';
import { scheduleAfterFirstPaint } from '@/lib/idle';
import { fetchHistorySessions, toSessionKey } from '@/pages/History';
import type { HistorySessionItem } from '@/components/history/HistoryList';
import type { ConversationMessageData } from '@/components/history/MessageBubble';
import type { HistorySegment } from '@/components/history/HistoryDetail';
import { shallow } from 'zustand/shallow';

const LazyHistoryDetail = lazy(async () =>
  import('@/components/history/HistoryDetail').then((m) => ({ default: m.HistoryDetail }))
);

function DetailFallback() {
  return <div className="flex-1 overflow-hidden" />;
}

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onLaunchWithDir: (dir: string) => void;
}

export function Dashboard({ onNavigate, onLaunchWithDir }: DashboardProps) {
  const { t } = useLocale();
  const { isLoadingEnvs, isLoadingStats } = useAppStore(
    (state) => ({
      isLoadingEnvs: state.isLoadingEnvs,
      isLoadingStats: state.isLoadingStats,
    }),
    shallow
  );

  const { launchClaudeCode, openDirectoryPicker, loadCronTasks, checkCodexInstalled } =
    useTauriCommands();

  const [sessions, setSessions] = useState<HistorySessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessageData[]>([]);
  const [segments, setSegments] = useState<HistorySegment[]>([]);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [launched, setLaunched] = useState(false);
  const launchedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (launchedTimerRef.current) clearTimeout(launchedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const cancelDeferred = scheduleAfterFirstPaint(() => {
      void loadCronTasks().catch(() => {});
      void checkCodexInstalled().catch(() => {});
    }, { delayMs: 260, timeoutMs: 1400 });
    return () => {
      cancelDeferred();
    };
  }, [loadCronTasks, checkCodexInstalled]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingSessions(true);
    fetchHistorySessions('all')
      .then((data) => {
        if (!cancelled) {
          setSessions(data);
          setIsLoadingSessions(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoadingSessions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSession = useMemo(() => {
    if (!selectedKey) return null;
    return sessions.find((s) => toSessionKey(s) === selectedKey) ?? null;
  }, [selectedKey, sessions]);

  const handleSelect = useCallback(
    async (session: HistorySessionItem) => {
      const key = toSessionKey(session);
      setSelectedKey(key);
      setMessages([]);
      setSegments([]);
      setActiveSegment(null);
      setIsLoadingMessages(true);
      setLaunched(false);

      try {
        const [msgs, segs] = await Promise.all([
          invoke<ConversationMessageData[]>('get_conversation_messages', {
            sessionId: session.id,
            source: session.source,
          }),
          invoke<HistorySegment[]>('get_conversation_segments', {
            sessionId: session.id,
            source: session.source,
          }),
        ]);
        setMessages(msgs);
        setSegments(segs);
      } catch (err) {
        console.error('Failed to load conversation:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    []
  );

  const handleResume = useCallback(() => {
    if (!selectedSession) return;
    void launchClaudeCode(selectedSession.project, selectedSession.id, selectedSession.source);
    localStorage.setItem('ccem-ftue-launched', 'true');
    if (launchedTimerRef.current) clearTimeout(launchedTimerRef.current);
    setLaunched(true);
    launchedTimerRef.current = setTimeout(() => {
      setLaunched(false);
      launchedTimerRef.current = null;
    }, 1200);
  }, [selectedSession, launchClaudeCode]);

  const handleNewSession = useCallback(async () => {
    try {
      const dir = await openDirectoryPicker();
      if (dir) {
        onLaunchWithDir(dir);
        localStorage.setItem('ccem-ftue-launched', 'true');
      }
    } catch (err) {
      console.error('Failed to open directory dialog:', err);
    }
  }, [openDirectoryPicker, onLaunchWithDir]);

  const handleExport = useCallback(() => {
    toast.info('Use History page for full export');
  }, []);

  const shortcuts = useMemo(
    () => ({
      'meta+o': () => void handleNewSession(),
    }),
    [handleNewSession]
  );
  useKeyboardShortcuts(shortcuts);

  if (isLoadingEnvs || isLoadingStats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-transition-enter flex flex-col h-full">
      <DashboardStatusStrip onNavigate={onNavigate} />

      <div className="flex flex-1 min-h-0">
        <ProjectTree
          sessions={sessions}
          isLoading={isLoadingSessions}
          selectedKey={selectedKey}
          onSelect={handleSelect}
          onNewSession={handleNewSession}
        />

        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {selectedSession ? (
            <Suspense fallback={<DetailFallback />}>
              <LazyHistoryDetail
                selectedSession={selectedSession}
                messages={messages}
                segments={segments}
                activeSegment={activeSegment}
                onActiveSegmentChange={setActiveSegment}
                isLoadingMessages={isLoadingMessages}
                onExport={handleExport}
                onResume={handleResume}
                launched={launched}
              />
            </Suspense>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {t('dashboard.selectConversation')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.selectConversationHint')}
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
