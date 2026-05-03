import { memo, startTransition, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Brain,
  ChevronDown,
  Circle,
  ClipboardList,
  LoaderCircle,
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
import { ScrollArea } from '@/components/ui/scroll-area';
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
  segmentCount?: number;
  startedAt?: number;
  completedAt?: number;
}

export interface ToolDigestEntry {
  type: 'tool_use' | 'thinking';
  block?: ConversationContentBlock;
  thinking?: WorkspaceThinkingEntry;
}

export interface MessageSegment {
  type: 'text' | 'tool-group';
  message?: ConversationMessageData;
  entries: ToolDigestEntry[];
}

function toFiniteTimestamp(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function formatProcessDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (totalMinutes < 60) {
    return seconds > 0 ? `${totalMinutes}m ${seconds}s` : `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function getDigestTimeRange(entries: ToolDigestEntry[]) {
  let startedAt: number | undefined;
  let completedAt: number | undefined;

  entries.forEach((entry) => {
    const entryStartedAt = entry.type === 'thinking'
      ? entry.thinking?.startedAt
      : toFiniteTimestamp(entry.block?._startedAt);
    const entryCompletedAt = entry.type === 'thinking'
      ? entry.thinking?.completedAt
      : toFiniteTimestamp(entry.block?._completedAt);

    if (entryStartedAt != null) {
      startedAt = startedAt == null ? entryStartedAt : Math.min(startedAt, entryStartedAt);
    }
    if (entryCompletedAt != null) {
      completedAt = completedAt == null ? entryCompletedAt : Math.max(completedAt, entryCompletedAt);
    }
  });

  return startedAt == null ? null : { startedAt, completedAt };
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
          startedAt: toFiniteTimestamp(block._startedAt),
          completedAt: toFiniteTimestamp(block._completedAt),
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


export function processMessageBlocks(
  message: ConversationMessageData,
  messageKey: string,
): MessageSegment[] {
  if (message.isCompactBoundary || message.planContent || message.msgType === 'summary') {
    return [{ type: 'text', message, entries: [] }];
  }

  const segments: MessageSegment[] = [];
  const blocks = toContentBlocks(message.content);

  const currentEntries: ToolDigestEntry[] = [];
  let seenToolContent = false;

  const flushToolGroup = () => {
    if (currentEntries.length > 0) {
      segments.push({ type: 'tool-group', entries: [...currentEntries] });
      currentEntries.length = 0;
    }
  };

  if (typeof message.content === 'string') {
    const { visibleText, thinkingEntries } = extractThinkingFromText(message.content, messageKey);
    if (thinkingEntries.length > 0) {
      const entries: ToolDigestEntry[] = thinkingEntries.map((e) => ({
        type: 'thinking',
        thinking: e,
      }));
      segments.push({ type: 'tool-group', entries });
    }
    if (visibleText) {
      segments.push({
        type: 'text',
        message: { ...message, content: visibleText },
        entries: [],
      });
    }
    return segments;
  }

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const blockKey = `${messageKey}-${index}`;

    if (block.type === 'tool_use') {
      seenToolContent = true;
      currentEntries.push({ type: 'tool_use', block });
      continue;
    }

    if (block.type === 'tool_result') {
      continue;
    }

    if (block.type === 'thinking') {
      seenToolContent = true;
      const content = (block.thinking || block.text || '').trim();
      if (content) {
        currentEntries.push({
          type: 'thinking',
          thinking: {
            key: `${blockKey}-thinking`,
            content,
            startedAt: toFiniteTimestamp(block._startedAt),
            completedAt: toFiniteTimestamp(block._completedAt),
          },
        });
      }
      continue;
    }

    if (block.type === 'text') {
      const { visibleText, thinkingEntries: extractedThinking } = extractThinkingFromText(
        block.text || '',
        `${blockKey}-text`,
      );
      const hasEmbeddedThinking = extractedThinking.length > 0;

      if (hasEmbeddedThinking) {
        seenToolContent = true;
        for (const e of extractedThinking) {
          currentEntries.push({ type: 'thinking', thinking: e });
        }
      }

      if (visibleText) {
        if (seenToolContent && !hasEmbeddedThinking) {
          flushToolGroup();
        }
        segments.push({
          type: 'text',
          message: { ...message, content: [{ ...block, text: visibleText }] },
          entries: [],
        });
      }
      continue;
    }

    if (seenToolContent) {
      flushToolGroup();
    }
    segments.push({
      type: 'text',
      message: { ...message, content: [block] },
      entries: [],
    });
  }

  flushToolGroup();

  return segments;
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
    <div className={className}>
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
          'flex w-full items-center gap-2 text-left transition-colors',
          headerClassName,
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
        <span className="text-[12px] font-medium text-foreground/75">{label}</span>
        {summary ? (
          <span className={cn('min-w-0 truncate text-[11px] text-muted-foreground/60', summaryClassName)}>
            {summary}
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            'ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform duration-200 ease-out',
            open && 'rotate-180',
          )}
        />
      </button>
      {hasRenderedBody ? (
        <div
          className={cn(
            'grid transition-all duration-250 ease-out',
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden">
            <div className={cn('pl-5 pt-2', contentClassName)}>
              {children}
            </div>
          </div>
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
            ? 'border border-border/40 bg-[hsl(var(--chat-assistant-bg)/0.6)] text-foreground/78 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
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
      <ScrollArea className="max-h-[260px]">
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-6 text-muted-foreground/80">
          {content.trim()}
        </pre>
      </ScrollArea>
    </DisclosureCard>
  );
}

const ToolPayloadPanel = memo(function ToolPayloadPanel({
  value,
}: {
  value: unknown;
}) {
  const text = useMemo(() => stringifyUnknown(value), [value]);

  if (!text) {
    return null;
  }

  return (
    <div className="workspace-tool-payload-virtualized rounded-md bg-[hsl(var(--tool-input-bg))] px-2.5 py-2">
      <ScrollArea className="max-h-[120px]">
        <pre className="whitespace-pre-wrap font-mono text-[10px] leading-[1.45] text-muted-foreground/70">
          {text}
        </pre>
      </ScrollArea>
    </div>
  );
}, (prevProps, nextProps) => prevProps.value === nextProps.value);

const ThinkingEntryPanel = memo(function ThinkingEntryPanel({
  entry,
  index,
  label,
}: {
  entry: WorkspaceThinkingEntry;
  index: number;
  label: string;
}) {
  const segmentCount = entry.segmentCount ?? 1;
  const headerLabel = segmentCount > 1
    ? `${index === 0 ? label : `${label} ${index + 1}`} · ${segmentCount}`
    : index === 0
      ? label
      : `${label} ${index + 1}`;

  return (
    <div className="workspace-tool-payload-virtualized rounded-lg bg-[hsl(var(--tool-input-bg))] px-3 py-2.5">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/50">
        {headerLabel}
      </p>
      <ScrollArea className="max-h-[160px]">
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-[1.55] text-muted-foreground/75">
          {entry.content}
        </pre>
      </ScrollArea>
    </div>
  );
}, (prevProps, nextProps) => prevProps.entry === nextProps.entry && prevProps.index === nextProps.index && prevProps.label === nextProps.label);

function ToolInputContext({ block }: { block: ConversationContentBlock }) {
  const input = block.input as Record<string, unknown> | undefined;
  if (!input || typeof input !== 'object') return null;

  const fields: { label: string; value: string }[] = [];

  switch (block.name) {
    case 'Grep': {
      const pattern = typeof input.pattern === 'string' ? input.pattern : '';
      const path = typeof input.path === 'string' ? input.path : '';
      const glob = typeof input.glob === 'string' ? input.glob : '';
      if (pattern) fields.push({ label: 'pattern', value: pattern });
      if (path) fields.push({ label: 'in', value: path });
      if (glob) fields.push({ label: 'filter', value: glob });
      break;
    }
    case 'Read': {
      const fp = typeof input.file_path === 'string' ? input.file_path : '';
      const offset = typeof input.offset === 'number' ? input.offset : undefined;
      const limit = typeof input.limit === 'number' ? input.limit : undefined;
      if (fp) fields.push({ label: 'file', value: fp });
      if (offset !== undefined) fields.push({ label: 'offset', value: String(offset) });
      if (limit !== undefined) fields.push({ label: 'limit', value: String(limit) });
      break;
    }
    case 'Write': {
      const fp = typeof input.file_path === 'string' ? input.file_path : '';
      if (fp) fields.push({ label: 'file', value: fp });
      break;
    }
    case 'Glob': {
      const pattern = typeof input.pattern === 'string' ? input.pattern : '';
      const path = typeof input.path === 'string' ? input.path : '';
      if (pattern) fields.push({ label: 'pattern', value: pattern });
      if (path) fields.push({ label: 'in', value: path });
      break;
    }
    case 'Bash': {
      const cmd = typeof input.command === 'string' ? input.command : '';
      if (cmd && cmd.length > 120) {
        fields.push({ label: 'command', value: `${cmd.slice(0, 117)}...` });
      } else if (cmd) {
        fields.push({ label: 'command', value: cmd });
      }
      break;
    }
    case 'WebFetch': {
      const url = typeof input.url === 'string' ? input.url : '';
      if (url) fields.push({ label: 'url', value: url });
      break;
    }
    default:
      break;
  }

  if (fields.length === 0) return null;

  return (
    <div className="workspace-tool-payload-virtualized rounded-md bg-[hsl(var(--tool-input-bg))] mb-1.5 px-2.5 py-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[10px] leading-[1.5]">
        {fields.map((f) => (
          <span key={f.label}>
            <span className="text-muted-foreground/45">{f.label}: </span>
            <span className="text-muted-foreground/70">{f.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const MAX_DIFF_CHARS = 800;

function EditDiff({ oldText, newText }: { oldText: string; newText: string }) {
  const total = oldText.length + newText.length;
  const truncated = total > MAX_DIFF_CHARS;
  const displayOld = truncated ? oldText.slice(0, MAX_DIFF_CHARS / 2) : oldText;
  const displayNew = truncated ? newText.slice(0, MAX_DIFF_CHARS / 2) : newText;

  return (
    <div className="workspace-tool-payload-virtualized overflow-hidden rounded-md bg-[hsl(var(--tool-input-bg))]">
      {displayOld ? (
        <div className="border-b border-destructive/10 px-2.5 py-1.5">
          <pre className="whitespace-pre-wrap font-mono text-[10px] leading-[1.45] text-muted-foreground/55 line-through">
            {displayOld}{truncated ? '…' : ''}
          </pre>
        </div>
      ) : null}
      <div className="px-2.5 py-1.5">
        <pre className="whitespace-pre-wrap font-mono text-[10px] leading-[1.45] text-success/75">
          {displayNew}{truncated ? '…' : ''}
        </pre>
      </div>
      {truncated ? (
        <div className="border-t border-border/20 px-2.5 py-1.5 text-[10px] text-muted-foreground/50">
          Diff too large — open in editor to review
        </div>
      ) : null}
    </div>
  );
}

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
  const isEdit = block.name === 'Edit';
  const isSearchTool = block.name === 'Grep' || block.name === 'Glob' || block.name === 'Bash' || block.name === 'WebFetch'
    || block.name === 'Read' || block.name === 'Write';
  const editDiff = useMemo(() => {
    if (!isEdit || !block.input || typeof block.input !== 'object') return null;
    const input = block.input as Record<string, unknown>;
    const oldStr = typeof input.old_string === 'string' ? input.old_string : '';
    const newStr = typeof input.new_string === 'string' ? input.new_string : '';
    if (!oldStr && !newStr) return null;
    return { oldText: oldStr, newText: newStr };
  }, [isEdit, block.input]);

  const toolLabel = detail
    ? `${block.name || 'Tool'}(${detail})`
    : (block.name || 'Tool');

  return (
    <div className="workspace-tool-row-virtualized">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (!hasResult) return;
          setOpen((current) => {
            if (!current && !hasRenderedBody) {
              startTransition(() => setHasRenderedBody(true));
            }
            return !current;
          });
        }}
        className={cn(
          'flex w-full items-center gap-1.5 py-0.5 text-left transition-colors',
          hasResult && 'cursor-pointer',
        )}
      >
        <Circle
          className={cn(
            'h-1.5 w-1.5 shrink-0 fill-current',
            isError ? 'text-destructive/65' : hasResult ? 'text-success/60' : 'text-muted-foreground/30',
          )}
        />
        <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground/60">
          {toolLabel}
        </span>
        {hasResult ? (
          <span
            className={cn(
              'shrink-0 text-[10px]',
              isError ? 'text-destructive/65' : 'text-success/55',
            )}
          >
            {isError ? t('workspace.toolFailedState') : t('workspace.toolDone')}
          </span>
        ) : null}
        {hasResult ? (
          <ChevronDown
            className={cn(
              'h-3 w-3 shrink-0 text-muted-foreground/30 transition-transform duration-200 ease-out',
              open && 'rotate-180',
            )}
          />
        ) : null}
      </button>
      {hasRenderedBody ? (
        <div
          className={cn(
            'grid transition-all duration-250 ease-out',
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden pt-1">
            {editDiff ? (
              <EditDiff oldText={editDiff.oldText} newText={editDiff.newText} />
            ) : (
              <>
                {isSearchTool ? <ToolInputContext block={block} /> : null}
                <ToolPayloadPanel value={block._result} />
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}, (prevProps, nextProps) => prevProps.block === nextProps.block);

function WorkspaceToolDigestComponent({
  entries,
  className,
  autoExpanded = false,
  isActive = false,
}: {
  entries: ToolDigestEntry[];
  className?: string;
  autoExpanded?: boolean;
  isActive?: boolean;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [hasRenderedBody, setHasRenderedBody] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const previousAutoExpandedRef = useRef(autoExpanded);
  const { summary, toolCount, thinkingCount } = useMemo(() => {
    const toolEntries = entries.filter((e) => e.type === 'tool_use');
    const thinkingEntriesList = entries.filter((e) => e.type === 'thinking');
    const toolNames = Array.from(new Set(toolEntries.map((e) => e.block?.name || 'Tool')));
    const visibleToolNames = toolNames.slice(0, 3).join(' · ');
    const hiddenToolCount = Math.max(0, toolNames.length - 3);

    const summaryParts = [];
    if (toolEntries.length > 0) {
      summaryParts.push(`${toolEntries.length} ${t('workspace.toolCalls')}`);
    }
    if (thinkingEntriesList.length > 0) {
      summaryParts.push(`${thinkingEntriesList.length} ${t('workspace.thinkingNotes')}`);
    }
    if (visibleToolNames) {
      summaryParts.push(visibleToolNames);
    }
    if (hiddenToolCount > 0) {
      summaryParts.push(`+${hiddenToolCount}`);
    }

    return {
      summary: summaryParts.join(' · '),
      toolCount: toolEntries.length,
      thinkingCount: thinkingEntriesList.length,
    };
  }, [entries, t]);
  const timeRange = useMemo(() => getDigestTimeRange(entries), [entries]);
  const durationLabel = useMemo(() => {
    if (!timeRange) {
      return null;
    }

    const end = timeRange.completedAt ?? (isActive ? now : undefined);
    if (end == null) {
      return null;
    }

    return formatProcessDuration(end - timeRange.startedAt);
  }, [isActive, now, timeRange]);

  useEffect(() => {
    if (autoExpanded && (thinkingCount > 0 || toolCount > 0)) {
      setHasRenderedBody(true);
      setOpen(true);
    } else if (previousAutoExpandedRef.current && !autoExpanded) {
      setOpen(false);
    }

    previousAutoExpandedRef.current = autoExpanded;
  }, [autoExpanded, toolCount, thinkingCount]);

  useEffect(() => {
    if (!isActive || !timeRange) {
      return undefined;
    }

    setNow(Date.now());
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [isActive, timeRange]);

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
        className="group flex w-full items-center gap-3 py-2 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Wrench className="h-3.5 w-3.5 shrink-0 text-muted-foreground/55" />
          <span className="shrink-0 text-[12px] font-medium text-foreground/75">
            {t('workspace.processedLabel')}
          </span>
          {durationLabel ? (
            <span className="text-[12px] font-normal text-muted-foreground/55">{durationLabel}</span>
          ) : null}
          <span className="min-w-0 truncate text-[12px] text-muted-foreground/55">{summary}</span>
        </div>
        <ChevronDown
          className={cn(
            'ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform duration-200 ease-out',
            open && 'rotate-180',
          )}
        />
      </button>
      <div className="h-px bg-border/45" />
      {hasRenderedBody ? (
        <div
          className={cn(
            'grid transition-all duration-250 ease-out',
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden">
            <div className="pt-3 space-y-2.5">
              {entries.map((entry, entryIndex) => {
                if (entry.type === 'thinking' && entry.thinking) {
                  return (
                    <ThinkingEntryPanel
                      key={entry.thinking.key}
                      entry={entry.thinking}
                      index={entryIndex}
                      label={t('history.thinking')}
                    />
                  );
                }
                if (entry.type === 'tool_use' && entry.block) {
                  return (
                    <ToolCallRow
                      key={entry.block.id || `${entry.block.name || 'tool'}-${entryIndex}`}
                      block={entry.block}
                    />
                  );
                }
                return null;
              })}
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
    && prevProps.entries === nextProps.entries
    && prevProps.autoExpanded === nextProps.autoExpanded
    && prevProps.isActive === nextProps.isActive
  )
);

export const WorkspacePendingResponse = memo(function WorkspacePendingResponse() {
  const { t } = useLocale();

  return (
    <div className="flex items-center gap-2.5 py-1">
      <LoaderCircle className="h-3.5 w-3.5 animate-spin text-muted-foreground/50" />
      <span className="text-[12px] text-muted-foreground/60">
        {t('workspace.nativeThinking')}
      </span>
    </div>
  );
});

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
          entries={toolBlocks.map((b) => ({ type: 'tool_use' as const, block: b }))}
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
          <div className="ml-auto max-w-[78%] min-w-[220px] rounded-[24px] border border-border/30 bg-[hsl(var(--chat-assistant-bg)/0.7)] px-5 py-4 text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)]">
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
