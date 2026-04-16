import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Layers3 } from 'lucide-react';
import {
  extractWorkspaceProcessData,
  WorkspaceMessageBubble,
  WorkspaceToolDigest,
  type WorkspaceThinkingEntry,
} from './WorkspaceMessageBubble';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import { getPerformanceMode } from '@/lib/performance';
import { getSessionTokenUsage, mergeToolResults } from '@/features/conversations/messageState';
import type {
  ConversationContentBlock,
  ConversationMessageData,
  HistorySegment,
  HistorySessionItem,
} from '@/features/conversations/types';
import { getHistorySessionDisplay } from '@/components/history/historySession';

interface WorkspaceConversationDetailProps {
  selectedSession: HistorySessionItem;
  messages: ConversationMessageData[];
  segments: HistorySegment[];
  activeSegment: number | null;
  onActiveSegmentChange: (segment: number | null) => void;
  isLoadingMessages: boolean;
}

function formatHeaderDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function isNearBottom(container: HTMLDivElement): boolean {
  return container.scrollHeight - container.clientHeight - container.scrollTop <= 48;
}

type TranscriptItem =
  | {
    type: 'message';
    key: string;
    role: 'user' | 'assistant';
    message: ConversationMessageData;
  }
  | {
    type: 'tool-digest';
    key: string;
    role: 'assistant';
    blocks: ConversationContentBlock[];
    thinkingEntries: WorkspaceThinkingEntry[];
  };

function getMessageRole(message: ConversationMessageData): 'user' | 'assistant' {
  return message.msgType === 'user' || message.msgType === 'human' ? 'user' : 'assistant';
}

function getTranscriptSpacing(
  prevRole: TranscriptItem['role'] | null,
  role: TranscriptItem['role'],
  kind: TranscriptItem['type'],
): string {
  if (prevRole == null) {
    return 'mt-0';
  }

  if (prevRole === role) {
    return kind === 'tool-digest' ? 'mt-3' : 'mt-4';
  }

  return kind === 'tool-digest' ? 'mt-7' : 'mt-8';
}

export function WorkspaceConversationDetail({
  selectedSession,
  messages,
  segments,
  activeSegment,
  onActiveSegmentChange,
  isLoadingMessages,
}: WorkspaceConversationDetailProps) {
  const { t } = useLocale();
  const [, startTransition] = useTransition();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const initialScrollKeyRef = useRef<string | null>(null);
  const lastVisibleMessageCountRef = useRef(0);
  const programmaticScrollRef = useRef(false);
  const autoScrollDetachedRef = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);
  const messageBatchSize = getPerformanceMode() === 'reduced' ? 24 : 48;
  const sessionTitle = getHistorySessionDisplay(selectedSession, t('history.untitledSession'));
  const mergedMessages = useMemo(() => mergeToolResults(messages), [messages]);
  const sessionUsage = useMemo(() => getSessionTokenUsage(mergedMessages), [mergedMessages]);

  const visibleMessages = useMemo(() => {
    if (activeSegment === null) return mergedMessages;
    return mergedMessages.filter((message) => message.segmentIndex === activeSegment);
  }, [activeSegment, mergedMessages]);

  const [renderedMessageCount, setRenderedMessageCount] = useState(() => visibleMessages.length);
  const displayedMessages = useMemo(
    () => visibleMessages.slice(0, renderedMessageCount),
    [renderedMessageCount, visibleMessages]
  );
  const transcriptItems = useMemo<TranscriptItem[]>(() => {
    const items: TranscriptItem[] = [];
    let digestIndex = 0;
    const pendingAssistantMessages: TranscriptItem[] = [];
    let pendingToolBlocks: ConversationContentBlock[] = [];
    let pendingThinkingEntries: WorkspaceThinkingEntry[] = [];
    let pendingProcessKey: string | null = null;

    const flushAssistantRun = () => {
      if (pendingToolBlocks.length > 0 || pendingThinkingEntries.length > 0) {
        items.push({
          type: 'tool-digest',
          role: 'assistant',
          key: `tool-digest-${pendingProcessKey || `assistant-run-${digestIndex}`}-${digestIndex}`,
          blocks: pendingToolBlocks,
          thinkingEntries: pendingThinkingEntries,
        });
        digestIndex += 1;
      }

      if (pendingAssistantMessages.length > 0) {
        items.push(...pendingAssistantMessages);
      }

      pendingAssistantMessages.length = 0;
      pendingToolBlocks = [];
      pendingThinkingEntries = [];
      pendingProcessKey = null;
    };

    displayedMessages.forEach((message, index) => {
      const role = getMessageRole(message);
      const messageKey = message.uuid || `${message.segmentIndex}-${index}`;

      if (role === 'user') {
        flushAssistantRun();
        items.push({
          type: 'message',
          role,
          key: messageKey,
          message,
        });
        return;
      }

      const { visibleMessage, toolBlocks, thinkingEntries } = extractWorkspaceProcessData(message, messageKey);
      if ((toolBlocks.length > 0 || thinkingEntries.length > 0) && pendingProcessKey == null) {
        pendingProcessKey = messageKey;
      }
      if (toolBlocks.length > 0) {
        pendingToolBlocks = pendingToolBlocks.concat(toolBlocks);
      }
      if (thinkingEntries.length > 0) {
        pendingThinkingEntries = pendingThinkingEntries.concat(thinkingEntries);
      }
      if (!visibleMessage) {
        return;
      }

      pendingAssistantMessages.push({
        type: 'message',
        role,
        key: visibleMessage.uuid || messageKey,
        message: visibleMessage,
      });
    });

    flushAssistantRun();

    return items;
  }, [displayedMessages]);
  const hasMoreMessages = renderedMessageCount < visibleMessages.length;
  const scrollContextKey = `${selectedSession.id}:${activeSegment ?? 'all'}`;

  useLayoutEffect(() => {
    setRenderedMessageCount(visibleMessages.length);
  }, [visibleMessages]);

  useEffect(() => {
    initialScrollKeyRef.current = null;
    lastVisibleMessageCountRef.current = 0;
    autoScrollDetachedRef.current = false;
  }, [scrollContextKey]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }
  }, []);

  useEffect(() => {
    if (!messagesContainerRef.current) {
      return;
    }

    const container = messagesContainerRef.current;
    const handleScroll = () => {
      if (programmaticScrollRef.current) {
        return;
      }
      autoScrollDetachedRef.current = !isNearBottom(container);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContextKey]);

  useEffect(() => {
    if (displayedMessages.length === 0 || !messagesContainerRef.current) {
      return;
    }

    if (initialScrollKeyRef.current === scrollContextKey) {
      return;
    }

    initialScrollKeyRef.current = scrollContextKey;
    const container = messagesContainerRef.current;
    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    programmaticScrollRef.current = true;
    scrollFrameRef.current = requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight });
      scrollFrameRef.current = requestAnimationFrame(() => {
        programmaticScrollRef.current = false;
        autoScrollDetachedRef.current = !isNearBottom(container);
        scrollFrameRef.current = null;
      });
    });
  }, [displayedMessages.length, scrollContextKey]);

  useEffect(() => {
    const previousCount = lastVisibleMessageCountRef.current;
    lastVisibleMessageCountRef.current = visibleMessages.length;

    if (
      previousCount === 0
      || visibleMessages.length <= previousCount
      || autoScrollDetachedRef.current
      || !messagesContainerRef.current
    ) {
      return;
    }

    const container = messagesContainerRef.current;
    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    programmaticScrollRef.current = true;
    scrollFrameRef.current = requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight });
      scrollFrameRef.current = requestAnimationFrame(() => {
        programmaticScrollRef.current = false;
        autoScrollDetachedRef.current = !isNearBottom(container);
        scrollFrameRef.current = null;
      });
    });
  }, [visibleMessages.length]);

  useEffect(() => {
    if (!hasMoreMessages) {
      return;
    }

    const root = messagesContainerRef.current;
    const sentinel = loadMoreSentinelRef.current;
    if (!root || !sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        observer.disconnect();
        startTransition(() => {
          setRenderedMessageCount((current) => Math.min(current + messageBatchSize, visibleMessages.length));
        });
      },
      {
        root,
        rootMargin: '200px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreMessages, messageBatchSize, startTransition, visibleMessages.length]);

  const formatSegmentLabel = useMemo(
    () => (segmentIndex: number) => (
      segmentIndex === 0
        ? t('history.segmentShortInitial')
        : t('history.segmentShortLabel').replace('{n}', String(segmentIndex))
    ),
    [t]
  );

  return (
    <>
      <div className="shrink-0 border-b border-border/40 bg-surface/80 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground/60">
              {t('workspace.focusSession')}
            </p>
            <h3 className="mt-2 truncate text-lg font-semibold tracking-tight text-foreground" title={sessionTitle}>
              {sessionTitle}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/75">
              <span className="rounded-full border border-border/50 bg-background/70 px-2 py-0.5 uppercase tracking-[0.18em]">
                {selectedSession.source}
              </span>
              <span>{selectedSession.projectName}</span>
              <span className="text-muted-foreground/40">•</span>
              <span>{formatHeaderDate(selectedSession.timestamp)}</span>
              {sessionUsage.total > 0 ? (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span>{sessionUsage.total.toLocaleString()} {t('workspace.tokensUnit')}</span>
                </>
              ) : null}
            </div>
          </div>
          {segments.length > 1 ? (
            <div className="max-w-[52%] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center gap-1 pl-3">
                <button
                  type="button"
                  onClick={() => startTransition(() => onActiveSegmentChange(null))}
                  className={cn(
                    'shrink-0 rounded-full border px-2 py-0.5 text-[10px] transition-colors',
                    activeSegment === null
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border/50 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t('history.allSegments')}
                </button>
                {segments.map((segment) => (
                  <button
                    key={segment.segmentIndex}
                    type="button"
                    onClick={() => startTransition(() => onActiveSegmentChange(segment.segmentIndex))}
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 text-[10px] transition-colors',
                      activeSegment === segment.segmentIndex
                        ? 'border-primary/40 bg-primary/10 text-foreground'
                        : 'border-border/50 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {formatSegmentLabel(segment.segmentIndex)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto bg-background/30">
        <div className="mx-auto max-w-[860px] px-8 py-8">
          {isLoadingMessages ? (
            <div className="space-y-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className={cn('animate-pulse rounded-2xl', index === 0 ? 'h-16 w-[68%] bg-muted/50' : 'h-24 w-full bg-muted/35')} />
              ))}
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-2xl border border-border/40 bg-surface/70 p-4">
                <Layers3 className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t('history.noMessages')}</p>
                <p className="mt-1 text-xs text-muted-foreground/75">{t('workspace.selectConversationHint')}</p>
              </div>
            </div>
          ) : (
            <div>
              {transcriptItems.map((item, index) => {
                const prevRole = index > 0 ? transcriptItems[index - 1].role : null;

                if (item.type === 'tool-digest') {
                  return (
                    <div
                      key={item.key}
                      className={cn(
                        'max-w-[760px] workspace-tool-digest-virtualized',
                        getTranscriptSpacing(prevRole, item.role, item.type)
                      )}
                    >
                      <WorkspaceToolDigest blocks={item.blocks} thinkingEntries={item.thinkingEntries} />
                    </div>
                  );
                }

                return (
                  <WorkspaceMessageBubble
                    key={item.key}
                    message={item.message}
                    prevRole={prevRole}
                  />
                );
              })}
              {hasMoreMessages ? <div ref={loadMoreSentinelRef} className="h-px" /> : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
