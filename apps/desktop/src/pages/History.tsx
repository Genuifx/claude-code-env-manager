import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { HistoryList, type HistorySessionItem } from '@/components/history/HistoryList';
import { MessageBubble, type ConversationMessageData } from '@/components/history/MessageBubble';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLocale } from '@/locales';

export function History() {
  const { t } = useLocale();
  const [sessions, setSessions] = useState<HistorySessionItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessageData[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Load messages when a session is selected
  const handleSelect = useCallback(async (id: string) => {
    setSelectedId(id);
    setIsLoadingMessages(true);
    setMessages([]);
    try {
      const data = await invoke<ConversationMessageData[]>('get_conversation_messages', { sessionId: id });
      setMessages(data);
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Selected session info
  const selectedSession = sessions.find(s => s.id === selectedId);

  return (
    <div className="page-transition-enter flex h-[calc(100vh-48px-24px)] gap-0 -mx-6 -mb-6">
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
              <div className="px-5 py-3 border-b border-white/[0.06] shrink-0">
                <h3 className="text-sm font-medium text-foreground truncate">
                  {selectedSession.display}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {selectedSession.projectName} · {new Date(selectedSession.timestamp).toLocaleString()}
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
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
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs text-muted-foreground">{t('history.noMessages')}</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <MessageBubble key={msg.uuid || i} message={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
