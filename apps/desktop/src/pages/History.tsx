import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { HistoryList, type HistorySessionItem } from '@/components/history/HistoryList';
import { MessageBubble, type ConversationMessageData } from '@/components/history/MessageBubble';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';

interface ContentBlock {
  type: string;
  id?: string;
  name?: string;
  input?: unknown;
  content?: unknown;
  is_error?: boolean;
  tool_use_id?: string;
  _result?: unknown;
  _resultError?: boolean;
  [key: string]: unknown;
}

interface CompactSegment {
  segmentIndex: number;
  timestamp: number;
  trigger?: string;
  preTokens?: number;
  messageCount: number;
}

/**
 * Pair tool_use blocks with their corresponding tool_result blocks.
 * Injects _result/_resultError into tool_use, removes paired tool_results.
 */
function mergeToolResults(msgs: ConversationMessageData[]): ConversationMessageData[] {
  // Deep clone to avoid mutating original data
  const cloned: ConversationMessageData[] = JSON.parse(JSON.stringify(msgs));

  // Pass 1: index all tool_use blocks by id
  const toolUseMap = new Map<string, ContentBlock>();
  for (const msg of cloned) {
    if ((msg.msgType === 'assistant' || msg.msgType === 'ai') && Array.isArray(msg.content)) {
      for (const block of msg.content as ContentBlock[]) {
        if (block.type === 'tool_use' && block.id) {
          toolUseMap.set(block.id, block);
        }
      }
    }
  }

  // Pass 2: match tool_results and inject into tool_use blocks
  const result: ConversationMessageData[] = [];
  for (const msg of cloned) {
    if ((msg.msgType === 'user' || msg.msgType === 'human') && Array.isArray(msg.content)) {
      const blocks = msg.content as ContentBlock[];
      const remaining = blocks.filter(block => {
        if (block.type === 'tool_result' && block.tool_use_id) {
          const target = toolUseMap.get(block.tool_use_id);
          if (target) {
            target._result = block.content;
            target._resultError = block.is_error === true;
            return false; // remove from user message
          }
        }
        return true;
      });

      // Skip user messages that only contained tool_results (now empty)
      if (remaining.length === 0) continue;
      msg.content = remaining as ConversationMessageData['content'];
    }
    result.push(msg);
  }

  return result;
}

export function History() {
  const { t } = useLocale();
  const [sessions, setSessions] = useState<HistorySessionItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessageData[]>([]);
  const [segments, setSegments] = useState<CompactSegment[]>([]);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load conversation history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const data = await invoke<HistorySessionItem[]>('get_conversation_history');
      setSessions(data);
    } catch (err) {
      console.error('Failed to load conversation history:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Load messages + segments when a session is selected
  const handleSelect = useCallback(async (id: string) => {
    setSelectedId(id);
    setActiveSegment(null);
    setIsLoadingMessages(true);
    setMessages([]);
    setSegments([]);
    try {
      const [msgs, segs] = await Promise.all([
        invoke<ConversationMessageData[]>('get_conversation_messages', { sessionId: id }),
        invoke<CompactSegment[]>('get_conversation_segments', { sessionId: id }),
      ]);
      setMessages(msgs);
      setSegments(segs);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Scroll to top when session changes
  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: 0 });
    }
  }, [selectedId]);

  // Smooth scroll to top when segment changes
  useEffect(() => {
    if (activeSegment !== null && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeSegment]);

  // Selected session info
  const selectedSession = sessions.find(s => s.id === selectedId);

  // Merge tool_use + tool_result pairs, then filter by active segment
  const visibleMessages = useMemo(() => {
    const merged = mergeToolResults(messages);
    if (activeSegment === null) return merged;
    return merged.filter(m => m.segmentIndex === activeSegment);
  }, [messages, activeSegment]);

  // Flat session ids for keyboard navigation
  const sessionIds = useMemo(() => sessions.map(s => s.id), [sessions]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Don't intercept when typing in search
    if ((e.target as HTMLElement).tagName === 'INPUT') return;

    switch (e.key) {
      case 'j':
      case 'ArrowDown': {
        e.preventDefault();
        const currentIdx = focusedSessionId ? sessionIds.indexOf(focusedSessionId) : -1;
        const nextIdx = Math.min(currentIdx + 1, sessionIds.length - 1);
        setFocusedSessionId(sessionIds[nextIdx] || null);
        break;
      }
      case 'k':
      case 'ArrowUp': {
        e.preventDefault();
        const currentIdx = focusedSessionId ? sessionIds.indexOf(focusedSessionId) : sessionIds.length;
        const prevIdx = Math.max(currentIdx - 1, 0);
        setFocusedSessionId(sessionIds[prevIdx] || null);
        break;
      }
      case 'Enter': {
        if (focusedSessionId) {
          e.preventDefault();
          handleSelect(focusedSessionId);
        }
        break;
      }
      case '/': {
        e.preventDefault();
        // Focus the search input inside HistoryList
        const searchInput = document.querySelector('[data-history-search]') as HTMLInputElement;
        searchInput?.focus();
        break;
      }
    }
  }, [focusedSessionId, sessionIds, handleSelect]);

  return (
    <div
      className="page-transition-enter flex h-[calc(100vh-48px-24px)] gap-0 -mx-6 -mb-6"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Left panel — session list */}
      <div className="w-[280px] shrink-0 flex flex-col glass-subtle glass-noise border-r border-white/[0.06]">
        {isLoadingSessions ? (
          <div className="flex-1 flex flex-col gap-2 p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-white/[0.06] rounded w-3/4 mb-1.5" />
                <div className="h-3 bg-white/[0.04] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <HistoryList
            sessions={sessions}
            selectedId={selectedId}
            onSelect={handleSelect}
            focusedId={focusedSessionId}
            onFocusChange={setFocusedSessionId}
          />
        )}
      </div>

      {/* Right panel — conversation detail */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={MessageSquare}
              message={t('history.selectConversation')}
            />
          </div>
        ) : (
          <>
            {/* Conversation header */}
            {selectedSession && (
              <div className="px-5 py-3 glass-header glass-noise shrink-0">
                <h3 className="text-sm font-medium text-foreground truncate">
                  {selectedSession.display}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {selectedSession.projectName} · {new Date(selectedSession.timestamp).toLocaleString()}
                </p>
              </div>
            )}

            {/* Segment navigation — only when multiple segments exist */}
            {segments.length > 1 && (
              <div className="px-5 py-2 border-b border-white/[0.06] flex items-center gap-1 overflow-x-auto shrink-0">
                <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5">
                  <button
                    onClick={() => setActiveSegment(null)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] transition-all shrink-0 seg-hover',
                      activeSegment === null && 'seg-active'
                    )}
                  >
                    {t('history.allSegments')}
                  </button>
                  {segments.map((seg) => (
                    <button
                      key={seg.segmentIndex}
                      onClick={() => setActiveSegment(seg.segmentIndex)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-[11px] transition-all shrink-0 seg-hover',
                        activeSegment === seg.segmentIndex && 'seg-active'
                      )}
                    >
                      {seg.segmentIndex === 0
                        ? t('history.segmentInitial')
                        : `${t('history.segmentLabel')} ${seg.segmentIndex}`
                      }
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-4">
              {isLoadingMessages ? (
         <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                      <div className="animate-pulse">
                        <div className={`h-16 rounded-xl ${i % 2 === 0 ? 'bg-primary/10 w-48' : 'bg-white/[0.04] w-64'}`} />
                      </div>
                    </div>
                  ))}
                </div>
           ) : visibleMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs text-muted-foreground">{t('history.noMessages')}</p>
                </div>
              ) : (
                <div key={activeSegment ?? 'all'}>
                  {visibleMessages.map((msg, i) => {
                    // Compute prevRole for dynamic spacing
                    const prevMsg = i > 0 ? visibleMessages[i - 1] : null;
                    const prevRole = prevMsg
                      ? (prevMsg.msgType === 'user' || prevMsg.msgType === 'human' ? 'user' : 'assistant')
                      : null;

                    // Entrance animation: first 8 messages get staggered delay
                    const animDelay = i < 8 ? `${i * 30}ms` : '0ms';

                    return (
                      <div
                        key={msg.uuid || i}
                        className="msg-enter"
                        style={{ animationDelay: animDelay }}
                      >
                        <MessageBubble message={msg} prevRole={prevRole} />
                      </div>
                    );
               })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
