import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Layers3 } from 'lucide-react';
import { WorkspaceTranscriptList } from './WorkspaceTranscriptList';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import { getPerformanceMode } from '@/lib/performance';
import { mergeToolResults } from '@/features/conversations/messageState';
import type {
  ConversationMessageData,
  HistorySegment,
  HistorySessionItem,
} from '@/features/conversations/types';

interface WorkspaceConversationDetailProps {
  selectedSession: HistorySessionItem;
  messages: ConversationMessageData[];
  segments: HistorySegment[];
  activeSegment: number | null;
  onActiveSegmentChange: (segment: number | null) => void;
  isLoadingMessages: boolean;
}

function isNearBottom(container: HTMLDivElement): boolean {
  return container.scrollHeight - container.clientHeight - container.scrollTop <= 48;
}

export function WorkspaceConversationDetail({
  selectedSession,
  messages,
  activeSegment,
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
  const mergedMessages = useMemo(() => mergeToolResults(messages), [messages]);

  const visibleMessages = useMemo(() => {
    if (activeSegment === null) return mergedMessages;
    return mergedMessages.filter((message) => message.segmentIndex === activeSegment);
  }, [activeSegment, mergedMessages]);

  const [renderedMessageCount, setRenderedMessageCount] = useState(() => visibleMessages.length);
  const displayedMessages = useMemo(
    () => visibleMessages.slice(0, renderedMessageCount),
    [renderedMessageCount, visibleMessages]
  );
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

  return (
    <>
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
              <WorkspaceTranscriptList messages={displayedMessages} />
              {hasMoreMessages ? <div ref={loadMoreSentinelRef} className="h-px" /> : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
