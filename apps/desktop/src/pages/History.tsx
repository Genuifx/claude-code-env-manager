import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MessageSquare, Play, Check, Download } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { HistoryList, type HistorySessionItem } from '@/components/history/HistoryList';
import { MessageBubble, type ConversationMessageData } from '@/components/history/MessageBubble';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import { useTauriCommands } from '@/hooks/useTauriCommands';

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

interface SessionTokenUsage {
  input: number;
  output: number;
  total: number;
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
  const { launchClaudeCode } = useTauriCommands();
  const [sessions, setSessions] = useState<HistorySessionItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessageData[]>([]);
  const [segments, setSegments] = useState<CompactSegment[]>([]);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [launched, setLaunched] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const formatTokens = (v: number) => v.toLocaleString();

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

  // Selected session info (needed by handleResume below)
  const selectedSession = sessions.find(s => s.id === selectedId);

  const handleResume = useCallback(async () => {
    if (!selectedSession) return;
    try {
      await launchClaudeCode(selectedSession.project, selectedSession.id);
      setLaunched(true);
      setTimeout(() => setLaunched(false), 1200);
    } catch (err) {
      console.error('Failed to resume session:', err);
    }
  }, [selectedSession, launchClaudeCode]);

  // Merge tool_use + tool_result pairs, then filter by active segment
  const mergedMessages = useMemo(() => mergeToolResults(messages), [messages]);
  const sessionUsage = useMemo<SessionTokenUsage>(() => {
    const usage = mergedMessages.reduce(
      (acc, msg) => {
        acc.input += msg.inputTokens ?? 0;
        acc.output += msg.outputTokens ?? 0;
        return acc;
      },
      { input: 0, output: 0 }
    );
    return {
      ...usage,
      total: usage.input + usage.output,
    };
  }, [mergedMessages]);

  const handleExport = useCallback(() => {
    if (!selectedSession) return;

    try {
      const payload = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        session: selectedSession,
        segments,
        messages: mergedMessages,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const safeTitle = (selectedSession.display || 'conversation')
        .replace(/[^\w\-.]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || selectedSession.id;
      const date = new Date(selectedSession.timestamp).toISOString().slice(0, 10);
      a.download = `${date}-${safeTitle}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t('history.exported'));
    } catch (err) {
      console.error('Failed to export conversation:', err);
      toast.error(t('history.exportFailed'));
    }
  }, [selectedSession, segments, mergedMessages, t]);

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

  const visibleMessages = useMemo(() => {
    if (activeSegment === null) return mergedMessages;
    return mergedMessages.filter(m => m.segmentIndex === activeSegment);
  }, [mergedMessages, activeSegment]);

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
              <div className="px-5 py-3 glass-header glass-noise shrink-0 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate">
                    {selectedSession.display}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedSession.projectName} · {new Date(selectedSession.timestamp).toLocaleString()}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground/75">
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.03] px-1.5 py-0.5 max-w-[280px]">
                      <span>{t('history.sessionId')}:</span>
                      <span className="font-mono truncate" title={selectedSession.id}>{selectedSession.id}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.03] px-1.5 py-0.5">
                      <span>{t('history.tokensTotal')}:</span>
                      <span className="font-mono">{formatTokens(sessionUsage.total)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.03] px-1.5 py-0.5">
                      <span>{t('history.tokensInput')}:</span>
                      <span className="font-mono">{formatTokens(sessionUsage.input)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.03] px-1.5 py-0.5">
                      <span>{t('history.tokensOutput')}:</span>
                      <span className="font-mono">{formatTokens(sessionUsage.output)}</span>
                    </span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={handleExport}
                    disabled={isLoadingMessages}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t('history.export')}
                  </Button>
                  <Button
                    size="sm"
                    variant={launched ? 'ghost' : 'outline'}
                    className="gap-1.5 text-xs"
                    onClick={handleResume}
                    disabled={launched}
                  >
                    {launched ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {launched ? t('history.resumed') : t('history.resume')}
                  </Button>
                </div>
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
