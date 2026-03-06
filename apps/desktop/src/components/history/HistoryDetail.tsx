import { useEffect, useMemo, useRef, useTransition } from 'react';
import { Check, Download, Play } from 'lucide-react';
import { MessageBubble, type ConversationMessageData } from './MessageBubble';
import type { HistorySessionItem } from './HistoryList';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';

interface ContentBlock {
  type: string;
  id?: string;
  content?: unknown;
  is_error?: boolean;
  tool_use_id?: string;
  _result?: unknown;
  _resultError?: boolean;
  [key: string]: unknown;
}

export interface HistorySegment {
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

interface HistoryDetailProps {
  selectedSession: HistorySessionItem;
  messages: ConversationMessageData[];
  segments: HistorySegment[];
  activeSegment: number | null;
  onActiveSegmentChange: (segment: number | null) => void;
  isLoadingMessages: boolean;
  onExport: () => void;
  onResume: () => void;
  launched: boolean;
  isCodexSessionSelected: boolean;
}

function formatHeaderDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function mergeToolResults(msgs: ConversationMessageData[]): ConversationMessageData[] {
  const cloned: ConversationMessageData[] = JSON.parse(JSON.stringify(msgs));
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

  const result: ConversationMessageData[] = [];
  for (const msg of cloned) {
    if ((msg.msgType === 'user' || msg.msgType === 'human') && Array.isArray(msg.content)) {
      const blocks = msg.content as ContentBlock[];
      const remaining = blocks.filter((block) => {
        if (block.type === 'tool_result' && block.tool_use_id) {
          const target = toolUseMap.get(block.tool_use_id);
          if (target) {
            target._result = block.content;
            target._resultError = block.is_error === true;
            return false;
          }
        }
        return true;
      });

      if (remaining.length === 0) continue;
      msg.content = remaining as ConversationMessageData['content'];
    }
    result.push(msg);
  }

  return result;
}

export function HistoryDetail({
  selectedSession,
  messages,
  segments,
  activeSegment,
  onActiveSegmentChange,
  isLoadingMessages,
  onExport,
  onResume,
  launched,
  isCodexSessionSelected,
}: HistoryDetailProps) {
  const { t } = useLocale();
  const [, startTransition] = useTransition();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const formatTokens = (v: number) => v.toLocaleString();

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

  const visibleMessages = useMemo(() => {
    if (activeSegment === null) return mergedMessages;
    return mergedMessages.filter((message) => message.segmentIndex === activeSegment);
  }, [mergedMessages, activeSegment]);

  const formatSegmentLabel = useMemo(() => (
    (segmentIndex: number) => (
      segmentIndex === 0
        ? t('history.segmentShortInitial')
        : t('history.segmentShortLabel').replace('{n}', String(segmentIndex))
    )
  ), [t]);

  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: 0 });
    }
  }, [selectedSession.id, messages.length]);

  useEffect(() => {
    if (activeSegment !== null && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeSegment]);

  return (
    <>
      <div className="glass-header glass-noise shrink-0 border-b border-white/[0.06] px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {selectedSession.display}
          </h3>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={onExport}
            disabled={isLoadingMessages}
          >
            <Download className="h-3.5 w-3.5" />
            {t('history.export')}
          </Button>
          {isCodexSessionSelected ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 px-3 text-xs"
                    onClick={onResume}
                    disabled
                  >
                    <Play className="h-3.5 w-3.5" />
                    {t('history.resume')}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('history.resumeUnsupportedCodex')}</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              size="sm"
              variant={launched ? 'ghost' : 'outline'}
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={onResume}
              disabled={launched}
            >
              {launched ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {launched ? t('history.resumed') : t('history.resume')}
            </Button>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3">
          <p className="min-w-0 truncate text-[11px] text-muted-foreground">
            {selectedSession.projectName} · {formatHeaderDate(selectedSession.timestamp)}
          </p>
          {segments.length > 1 && (
            <div
              className="ml-auto max-w-[55%] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{
                maskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
              }}
            >
              <div className="flex items-center gap-1 pl-3">
                <button
                  onClick={() => startTransition(() => onActiveSegmentChange(null))}
                  className={cn(
                    'shrink-0 rounded-full border px-2 py-0.5 text-[10px] transition-colors',
                    activeSegment === null
                      ? 'border-primary/40 bg-primary/12 text-foreground'
                      : 'border-white/[0.08] text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t('history.allSegments')}
                </button>
                {segments.map((seg) => (
                  <button
                    key={seg.segmentIndex}
                    onClick={() => startTransition(() => onActiveSegmentChange(seg.segmentIndex))}
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 text-[10px] transition-colors',
                      activeSegment === seg.segmentIndex
                        ? 'border-primary/40 bg-primary/12 text-foreground'
                        : 'border-white/[0.08] text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {formatSegmentLabel(seg.segmentIndex)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6">
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
            <div className="flex min-h-[240px] items-center justify-center">
              <p className="text-xs text-muted-foreground">{t('history.noMessages')}</p>
            </div>
          ) : (
            <div key={activeSegment ?? 'all'}>
              {visibleMessages.map((msg, i) => {
                const prevMsg = i > 0 ? visibleMessages[i - 1] : null;
                const prevRole = prevMsg
                  ? (prevMsg.msgType === 'user' || prevMsg.msgType === 'human' ? 'user' : 'assistant')
                  : null;
                const animDelay = i < 8 ? `${i * 30}ms` : '0ms';

                return (
                  <div
                    key={msg.uuid || i}
                    className="msg-enter history-msg-virtualized"
                    style={{ animationDelay: animDelay }}
                  >
                    <MessageBubble message={msg} prevRole={prevRole} />
                  </div>
                );
              })}
            </div>
          )}

          {!isLoadingMessages && (
            <div className="mt-8 flex justify-center">
              <div className="glass-subtle glass-noise w-full max-w-sm rounded-xl border border-white/[0.06] px-4 py-4 text-center shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/40">
                  {t('history.sessionInfo')}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-mono text-foreground/90">{formatTokens(sessionUsage.input)}</span> {t('history.tokensInput')}
                  <span className="mx-2 text-muted-foreground/25">·</span>
                  <span className="font-mono text-foreground/90">{formatTokens(sessionUsage.output)}</span> {t('history.tokensOutput')}
                </p>
                <p
                  className="mt-2 break-all font-mono text-[11px] text-muted-foreground/65"
                  title={selectedSession.id}
                >
                  {selectedSession.id}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
