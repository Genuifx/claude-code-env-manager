import { memo, startTransition, useMemo, useState } from 'react';
import {
  AlertCircle,
  Brain,
  ChevronDown,
  Circle,
  ClipboardList,
  Scissors,
  Terminal,
  Wrench,
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/history/MarkdownRenderer';
import {
  extractToolSummary,
  isCommandOnlyText,
  parseMessageText,
  splitThinkBlocks,
  stringifyUnknown,
  type TeammateMessage,
} from '@/components/conversation/messageContentUtils';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import type {
  ConversationContentBlock,
  ConversationMessageData,
} from '@/features/conversations/types';

interface WorkspaceMessageBubbleProps {
  message: ConversationMessageData;
  prevRole?: string | null;
}

export interface WorkspaceThinkingEntry {
  key: string;
  content: string;
}

function toContentBlocks(content: ConversationMessageData['content']): ConversationContentBlock[] {
  if (Array.isArray(content)) {
    return content;
  }

  if (content && typeof content === 'object') {
    return [content as ConversationContentBlock];
  }

  return [];
}

export function getWorkspaceToolBlocks(message: ConversationMessageData): ConversationContentBlock[] {
  if (message.isCompactBoundary || message.planContent || message.msgType === 'summary') {
    return [];
  }

  return toContentBlocks(message.content).filter((block) => block.type === 'tool_use');
}

export function isWorkspaceToolOnlyMessage(message: ConversationMessageData): boolean {
  const blocks = toContentBlocks(message.content);
  return blocks.length > 0 && blocks.every((block) => block.type === 'tool_use' || block.type === 'tool_result');
}

function extractThinkingFromText(
  raw: string,
  keyBase: string,
): { visibleText: string; thinkingEntries: WorkspaceThinkingEntry[] } {
  const thinkingEntries: WorkspaceThinkingEntry[] = [];
  const visibleParts: string[] = [];

  splitThinkBlocks(raw).forEach((part, index) => {
    if (part.type === 'think') {
      const content = part.content.trim();
      if (content) {
        thinkingEntries.push({
          key: `${keyBase}-think-${index}`,
          content,
        });
      }
      return;
    }

    if (part.content.trim()) {
      visibleParts.push(part.content.trim());
    }
  });

  return {
    visibleText: visibleParts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim(),
    thinkingEntries,
  };
}

function extractProcessFromBlocks(
  blocks: ConversationContentBlock[],
  keyBase: string,
): {
  visibleBlocks: ConversationContentBlock[];
  toolBlocks: ConversationContentBlock[];
  thinkingEntries: WorkspaceThinkingEntry[];
} {
  const visibleBlocks: ConversationContentBlock[] = [];
  const toolBlocks: ConversationContentBlock[] = [];
  const thinkingEntries: WorkspaceThinkingEntry[] = [];

  blocks.forEach((block, index) => {
    const blockKey = `${keyBase}-${index}`;

    if (block.type === 'tool_use') {
      toolBlocks.push(block);
      return;
    }

    if (block.type === 'tool_result') {
      return;
    }

    if (block.type === 'thinking') {
      const content = (block.thinking || block.text || '').trim();
      if (content) {
        thinkingEntries.push({
          key: `${blockKey}-thinking`,
          content,
        });
      }
      return;
    }

    if (block.type === 'text') {
      const { visibleText, thinkingEntries: extractedThinking } = extractThinkingFromText(block.text || '', `${blockKey}-text`);
      thinkingEntries.push(...extractedThinking);
      if (visibleText) {
        visibleBlocks.push({
          ...block,
          text: visibleText,
        });
      }
      return;
    }

    visibleBlocks.push(block);
  });

  return { visibleBlocks, toolBlocks, thinkingEntries };
}

export function extractWorkspaceProcessData(
  message: ConversationMessageData,
  messageKey: string,
): {
  visibleMessage: ConversationMessageData | null;
  toolBlocks: ConversationContentBlock[];
  thinkingEntries: WorkspaceThinkingEntry[];
} {
  if (message.isCompactBoundary || message.planContent || message.msgType === 'summary') {
    return {
      visibleMessage: message,
      toolBlocks: [],
      thinkingEntries: [],
    };
  }

  if (typeof message.content === 'string') {
    const { visibleText, thinkingEntries } = extractThinkingFromText(message.content, messageKey);
    return {
      visibleMessage: visibleText
        ? {
          ...message,
          content: visibleText,
        }
        : null,
      toolBlocks: [],
      thinkingEntries,
    };
  }

  if (Array.isArray(message.content)) {
    const { visibleBlocks, toolBlocks, thinkingEntries } = extractProcessFromBlocks(message.content, messageKey);
    return {
      visibleMessage: visibleBlocks.length > 0
        ? {
          ...message,
          content: visibleBlocks,
        }
        : null,
      toolBlocks,
      thinkingEntries,
    };
  }

  if (message.content && typeof message.content === 'object') {
    const { visibleBlocks, toolBlocks, thinkingEntries } = extractProcessFromBlocks([message.content as ConversationContentBlock], messageKey);
    const visibleContent = visibleBlocks.length === 0
      ? null
      : visibleBlocks.length === 1
        ? visibleBlocks[0]
        : visibleBlocks;
    return {
      visibleMessage: visibleContent
        ? {
          ...message,
          content: visibleContent,
        }
        : null,
      toolBlocks,
      thinkingEntries,
    };
  }

  return {
    visibleMessage: null,
    toolBlocks: [],
    thinkingEntries: [],
  };
}

function DisclosureCard({
  icon: Icon,
  label,
  summary,
  defaultOpen = false,
  children,
  className,
  headerClassName,
  summaryClassName,
  contentClassName,
}: {
  icon: typeof Brain;
  label: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  summaryClassName?: string;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [hasRenderedBody, setHasRenderedBody] = useState(defaultOpen);

  return (
    <div className={cn('rounded-2xl border border-border/50 bg-surface/75', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => {
            if (!current && !hasRenderedBody) {
              startTransition(() => setHasRenderedBody(true));
            }
            return !current;
          });
        }}
        className={cn(
          'flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/35',
          headerClassName
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
        <span className="text-[12px] font-medium text-foreground/90">{label}</span>
        {summary ? (
          <span className={cn('min-w-0 truncate text-[11px] text-muted-foreground/75', summaryClassName)}>
            {summary}
          </span>
        ) : null}
        <ChevronDown className={cn('ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform', open && 'rotate-180')} />
      </button>
      {hasRenderedBody ? (
        <div className={cn('border-t border-border/40 px-3.5 py-3', contentClassName, !open && 'hidden')}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function CommandPill({
  name,
  output,
  subtle = false,
}: {
  name: string;
  output?: string;
  subtle?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px]',
          subtle
            ? 'border border-[#d8d0c4] bg-white/72 text-foreground/78 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
            : 'border border-primary/20 bg-primary/8 text-primary'
        )}
      >
        <Terminal className="h-3 w-3" />
        <span>/{name}</span>
      </div>
      {output ? (
        <span className="min-w-0 truncate text-[11px] text-foreground/52">{output}</span>
      ) : null}
    </div>
  );
}

function ThinkingBlock({ content, label }: { content: string; label: string }) {
  return (
    <DisclosureCard icon={Brain} label={label}>
      <pre className="max-h-[260px] overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-6 text-muted-foreground/80">
        {content.trim()}
      </pre>
    </DisclosureCard>
  );
}

const ToolPayloadPanel = memo(function ToolPayloadPanel({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  const text = useMemo(() => stringifyUnknown(value), [value]);

  if (!text) {
    return null;
  }

  return (
    <div className="workspace-tool-payload-virtualized rounded-lg bg-surface/80 px-3 py-2">
      <p className="mb-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/55">
        {label}
      </p>
      <pre className="max-h-[160px] overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted-foreground/80">
        {text}
      </pre>
    </div>
  );
}, (prevProps, nextProps) => prevProps.label === nextProps.label && prevProps.value === nextProps.value);

const ThinkingEntryPanel = memo(function ThinkingEntryPanel({
  entry,
  index,
  label,
}: {
  entry: WorkspaceThinkingEntry;
  index: number;
  label: string;
}) {
  return (
    <div className="workspace-tool-payload-virtualized rounded-lg bg-surface/80 px-3 py-2">
      <p className="mb-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/55">
        {index === 0 ? label : `${label} ${index + 1}`}
      </p>
      <pre className="max-h-[160px] overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted-foreground/80">
        {entry.content}
      </pre>
    </div>
  );
}, (prevProps, nextProps) => prevProps.entry === nextProps.entry && prevProps.index === nextProps.index && prevProps.label === nextProps.label);

const ToolCallRow = memo(function ToolCallRow({
  block,
}: {
  block: ConversationContentBlock;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [hasRenderedBody, setHasRenderedBody] = useState(false);
  const hasResult = '_result' in block;
  const isError = block._resultError === true;
  const detail = useMemo(() => extractToolSummary(block.name, block.input), [block.input, block.name]);

  return (
    <div className="workspace-tool-row-virtualized rounded-xl border border-border/40 bg-background/70">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => {
            if (!current && !hasRenderedBody) {
              startTransition(() => setHasRenderedBody(true));
            }
            return !current;
          });
        }}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <Circle className={cn('h-[7px] w-[7px] shrink-0 fill-current', isError ? 'text-destructive' : 'text-primary/80')} />
        <span className="text-[12px] font-medium text-foreground/90">{block.name || 'Tool'}</span>
        {detail ? (
          <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground/75">
            {detail}
          </span>
        ) : null}
        {hasResult ? (
          <span className={cn('ml-auto text-[11px]', isError ? 'text-destructive/80' : 'text-emerald-600')}>
            {isError ? t('workspace.toolFailedState') : t('workspace.toolDone')}
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground/55 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {hasRenderedBody ? (
        <div className={cn('space-y-2 border-t border-border/35 px-3 pb-3 pt-2', !open && 'hidden')}>
          <ToolPayloadPanel label={t('history.toolInput')} value={block.input} />
          {hasResult ? (
            <ToolPayloadPanel label={t('history.toolOutput')} value={block._result} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}, (prevProps, nextProps) => prevProps.block === nextProps.block);

function WorkspaceToolDigestComponent({
  blocks,
  thinkingEntries = [],
  className,
}: {
  blocks: ConversationContentBlock[];
  thinkingEntries?: WorkspaceThinkingEntry[];
  className?: string;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [hasRenderedBody, setHasRenderedBody] = useState(false);
  const { completedCount, summary } = useMemo(() => {
    const completed = blocks.filter((block) => '_result' in block && block._resultError !== true).length;
    const toolNames = Array.from(new Set(blocks.map((block) => block.name || 'Tool')));
    const visibleToolNames = toolNames.slice(0, 3).join(' · ');
    const hiddenToolCount = Math.max(0, toolNames.length - 3);

    const summaryParts = [];
    if (blocks.length > 0) {
      summaryParts.push(`${blocks.length} ${t('workspace.toolCalls')}`);
    }
    if (thinkingEntries.length > 0) {
      summaryParts.push(`${thinkingEntries.length} ${t('workspace.thinkingNotes')}`);
    }
    if (visibleToolNames) {
      summaryParts.push(visibleToolNames);
    }
    if (hiddenToolCount > 0) {
      summaryParts.push(`+${hiddenToolCount}`);
    }

    return {
      completedCount: completed,
      summary: summaryParts.join(' · '),
    };
  }, [blocks, t, thinkingEntries.length]);

  return (
    <div className={cn('max-w-[760px]', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => {
            if (!current && !hasRenderedBody) {
              startTransition(() => setHasRenderedBody(true));
            }
            return !current;
          });
        }}
        className="flex w-full items-center gap-3 py-2 text-left"
      >
        <div className="flex min-w-0 items-center gap-2 text-muted-foreground/78">
          <Wrench className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[12px] font-medium text-foreground/82">{t('workspace.processedLabel')}</span>
          <span className="min-w-0 truncate text-[12px]">{summary}</span>
        </div>
        <ChevronDown
          className={cn(
            'ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/55 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      <div className="h-px bg-border/55" />
      {hasRenderedBody ? (
        <div className={cn('pt-4', !open && 'hidden')}>
          <div className="rounded-[26px] border border-border/45 bg-background/72 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.04)]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/70">
                {blocks.length > 0 ? (
                  <span className="rounded-full border border-border/40 bg-surface-raised px-2 py-0.5">
                    {blocks.length} {t('workspace.toolCalls')}
                  </span>
                ) : null}
                {thinkingEntries.length > 0 ? (
                  <span className="rounded-full border border-border/40 bg-surface-raised px-2 py-0.5">
                    {thinkingEntries.length} {t('workspace.thinkingNotes')}
                  </span>
                ) : null}
                <span className="rounded-full border border-border/40 bg-surface-raised px-2 py-0.5">
                  {completedCount} {t('workspace.toolSucceeded')}
                </span>
              </div>
              {thinkingEntries.length > 0 ? (
                <div className="space-y-2">
                  {thinkingEntries.map((entry, index) => (
                    <ThinkingEntryPanel
                      key={entry.key}
                      entry={entry}
                      index={index}
                      label={t('history.thinking')}
                    />
                  ))}
                </div>
              ) : null}
              <div className="space-y-3">
                {blocks.map((block, index) => (
                  <ToolCallRow
                    key={block.id || `${block.name || 'tool'}-${index}`}
                    block={block}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const WorkspaceToolDigest = memo(
  WorkspaceToolDigestComponent,
  (prevProps, nextProps) => (
    prevProps.className === nextProps.className
    && prevProps.blocks === nextProps.blocks
    && prevProps.thinkingEntries === nextProps.thinkingEntries
  )
);

function AgentNoteBlock({ msg, label }: { msg: TeammateMessage; label: string }) {
  const notification = msg.notification;
  const summary = notification
    ? `${msg.id} · ${notification.idleReason || 'idle'}`
    : `${msg.id}${msg.summary ? ` · ${msg.summary}` : ''}`;

  return (
    <DisclosureCard
      icon={(notification ? AlertCircle : ClipboardList) as typeof Brain}
      label={label}
      summary={summary}
    >
      {notification ? (
        <p className="text-[12px] leading-6 text-muted-foreground/80">
          {notification.failureReason || notification.idleReason || msg.content}
        </p>
      ) : (
        <MarkdownRenderer content={msg.content} className="text-[14px] leading-7" />
      )}
    </DisclosureCard>
  );
}

function PlanBlock({ content, label }: { content: string; label: string }) {
  const titleMatch = content.match(/^#\s+(?:Plan:\s*)?(.+)$/m);
  const title = titleMatch?.[1]?.trim();

  return (
    <DisclosureCard
      icon={ClipboardList as typeof Brain}
      label={label}
      summary={title}
    >
      <MarkdownRenderer content={content} className="text-[14px] leading-7" />
    </DisclosureCard>
  );
}

function renderAssistantMarkdown(text: string) {
  return (
    <MarkdownRenderer
      content={text}
      className="text-[14px] leading-7 text-foreground/88 [&_p]:my-0 [&_p+*]:mt-3"
    />
  );
}

function renderUserMarkdown(text: string) {
  return (
    <MarkdownRenderer
      content={text}
      className="text-[14px] leading-7 text-foreground/94 [&_p]:my-0 [&_p+*]:mt-3"
    />
  );
}

function renderTextBlock(text: string, isUser: boolean, t: (key: string) => string) {
  const { cleanText, command } = parseMessageText(text);
  const commandArgs = command?.args?.trim() || '';
  const commandBody = cleanText || commandArgs;

  if (command && !commandBody) {
    return <CommandPill name={command.name} output={command.output} subtle={isUser} />;
  }

  if (command && commandBody) {
    return (
      <div className="space-y-3">
        <CommandPill name={command.name} output={command.output} subtle={isUser} />
        {isUser ? (
          renderUserMarkdown(commandBody)
        ) : (
          renderAssistantMarkdown(commandBody)
        )}
      </div>
    );
  }

  if (!cleanText) return null;

  if (!isUser && /<think>/i.test(cleanText)) {
    return (
      <div className="space-y-3">
        {splitThinkBlocks(cleanText).map((part, index) =>
          part.type === 'think' ? (
            <ThinkingBlock key={`think-${index}`} content={part.content} label={t('history.thinking')} />
          ) : (
            <div key={`think-md-${index}`}>{renderAssistantMarkdown(part.content.trim())}</div>
          )
        )}
      </div>
    );
  }

  return isUser
    ? renderUserMarkdown(cleanText)
    : renderAssistantMarkdown(cleanText);
}

function renderContentBlocks(
  blocks: ConversationContentBlock[],
  isUser: boolean,
  t: (key: string) => string,
) {
  const result: React.ReactNode[] = [];
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];

    if (block.type === 'tool_use') {
      const toolBlocks: ConversationContentBlock[] = [];
      while (index < blocks.length && blocks[index].type === 'tool_use') {
        toolBlocks.push(blocks[index]);
        index += 1;
      }
      result.push(
        <WorkspaceToolDigest
          key={`tool-group-${toolBlocks[0].id || index}`}
          blocks={toolBlocks}
        />
      );
      continue;
    }

    switch (block.type) {
      case 'text':
        result.push(<div key={`text-${index}`}>{renderTextBlock(block.text || '', isUser, t)}</div>);
        break;
      case 'thinking':
        result.push(
          <ThinkingBlock
            key={`thinking-${index}`}
            content={block.thinking || block.text || ''}
            label={t('history.thinking')}
          />
        );
        break;
      case 'tool_result':
        break;
      default:
        break;
    }
    index += 1;
  }

  return result;
}

function WorkspaceMessageBubbleComponent({ message, prevRole }: WorkspaceMessageBubbleProps) {
  const { t } = useLocale();
  const isUser = message.msgType === 'user' || message.msgType === 'human';
  const isSummary = message.msgType === 'summary';
  const currentRole = isUser ? 'user' : 'assistant';
  const spacingClass = prevRole == null ? 'mt-0' : prevRole === currentRole ? 'mt-4' : 'mt-8';

  const { renderedContent, teammateMessages } = useMemo(() => {
    if (isSummary || message.isCompactBoundary || message.planContent) {
      return { renderedContent: null as React.ReactNode, teammateMessages: [] as TeammateMessage[] };
    }

    const collected: TeammateMessage[] = [];
    const collect = (text: string) => {
      const parsed = parseMessageText(text);
      if (parsed.teammateMessages.length > 0) {
        collected.push(...parsed.teammateMessages);
      }
    };

    const content = message.content;
    let nextRenderedContent: React.ReactNode = null;

    if (typeof content === 'string') {
      collect(content);
      nextRenderedContent = renderTextBlock(content, isUser, t);
    } else if (Array.isArray(content)) {
      content.forEach((block) => {
        if (block.type === 'text' && block.text) {
          collect(block.text);
        }
      });
      const textBlocks = content.filter((block) => block.type === 'text');
      if (textBlocks.length === 1 && textBlocks.length === content.length && isCommandOnlyText(textBlocks[0].text || '')) {
        nextRenderedContent = renderTextBlock(textBlocks[0].text || '', isUser, t);
      } else {
        nextRenderedContent = renderContentBlocks(content, isUser, t);
      }
    } else if (content && typeof content === 'object') {
      nextRenderedContent = renderContentBlocks([content as ConversationContentBlock], isUser, t);
    }

    return { renderedContent: nextRenderedContent, teammateMessages: collected };
  }, [isSummary, isUser, message.content, message.isCompactBoundary, message.planContent, t]);

  if (isSummary) {
    return (
      <div className="my-6 flex justify-center">
        <div className="rounded-full border border-border/50 bg-surface px-3 py-1.5 text-[11px] text-muted-foreground/80">
          {message.summary || t('history.summaryLabel')}
        </div>
      </div>
    );
  }

  if (message.isCompactBoundary) {
    return (
      <div className="my-8 flex items-center gap-3">
        <div className="h-px flex-1 bg-border/50" />
        <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-surface px-3 py-1 text-[11px] text-muted-foreground/80">
          <Scissors className="h-3 w-3" />
          {t('history.compactBoundary')}
        </div>
        <div className="h-px flex-1 bg-border/50" />
      </div>
    );
  }

  if (message.planContent) {
    return (
      <div className={spacingClass}>
        <PlanBlock content={message.planContent} label={t('history.plan')} />
      </div>
    );
  }

  const hasMainContent = renderedContent && !(Array.isArray(renderedContent) && renderedContent.length === 0);

  if (!hasMainContent && teammateMessages.length === 0) {
    return null;
  }

  return (
    <div className={cn(spacingClass, 'workspace-msg-virtualized')}>
      {hasMainContent ? (
        isUser ? (
          <div className="ml-auto max-w-[78%] min-w-[220px] rounded-[28px] border border-[#ddd5c8] bg-[#f3efe7] px-5 py-4 text-foreground shadow-[0_14px_34px_rgba(15,23,42,0.045)]">
            {renderedContent}
          </div>
        ) : (
          <div className="space-y-3">{renderedContent}</div>
        )
      ) : null}

      {teammateMessages.length > 0 ? (
        <div className={cn('space-y-3', hasMainContent && 'mt-3')}>
          {teammateMessages.map((msg, index) => (
            <AgentNoteBlock key={`${msg.id}-${index}`} msg={msg} label={t('workspace.agentNotes')} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const WorkspaceMessageBubble = memo(
  WorkspaceMessageBubbleComponent,
  (prevProps, nextProps) => prevProps.prevRole === nextProps.prevRole && prevProps.message === nextProps.message
);
