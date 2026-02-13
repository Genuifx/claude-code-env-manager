import { useState } from 'react';
import { ChevronRight, Brain, CheckCircle2, XCircle, User, Bot, Circle, Scissors, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  name?: string;
  id?: string;
  input?: unknown;
  content?: unknown;
  is_error?: boolean;
  tool_use_id?: string;
  // Injected by mergeToolResults in History.tsx
  _result?: unknown;
  _resultError?: boolean;
}

export interface ConversationMessageData {
  msgType: string;
  uuid?: string;
  content: ContentBlock[] | string | null;
  model?: string;
  summary?: string;
  segmentIndex: number;
  isCompactBoundary: boolean;
}

interface MessageBubbleProps {
  message: ConversationMessageData;
  prevRole?: string | null;
}

function CollapsibleBlock({
  icon: Icon,
  label,
  iconClassName,
  children,
  defaultOpen = false,
}: {
  icon: typeof Brain;
  label: string;
  iconClassName?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-white/[0.06] overflow-hidden my-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-white/[0.03] transition-colors"
      >
        <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-90')} />
        <Icon className={cn('w-3.5 h-3.5', iconClassName)} />
        <span className="truncate">{label}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs">
          {children}
        </div>
      )}
    </div>
  );
}

/** Extract a concise summary string from tool input based on tool name. */
function extractToolSummary(name: string | undefined, input: unknown): string {
  if (!input || typeof input !== 'object') return '';
  const obj = input as Record<string, unknown>;

  switch (name) {
    case 'Read':
    case 'Write':
    case 'Edit': {
      const fp = obj.file_path as string | undefined;
      if (!fp) return '';
      // Show last 2 path segments for context
      const parts = fp.split('/');
      return parts.length > 2 ? parts.slice(-2).join('/') : fp;
    }
    case 'Bash': {
      const cmd = (obj.command as string) || '';
      return cmd.length > 60 ? cmd.slice(0, 57) + '...' : cmd;
    }
    case 'Glob':
    case 'Grep': {
      return (obj.pattern as string) || '';
    }
    case 'Task': {
      const desc = (obj.description as string) || (obj.prompt as string) || '';
      return desc.length > 50 ? desc.slice(0, 47) + '...' : desc;
    }
    case 'WebFetch': {
      const url = (obj.url as string) || '';
      return url.length > 50 ? url.slice(0, 47) + '...' : url;
    }
    default: {
      // First string value, truncated
      for (const val of Object.values(obj)) {
        if (typeof val === 'string' && val.length > 0) {
          return val.length > 50 ? val.slice(0, 47) + '...' : val;
        }
      }
      return '';
    }
  }
}

function ToolCallBlock({ block, t }: { block: ContentBlock; t: (key: string) => string }) {
  const [open, setOpen] = useState(false);
  const summary = extractToolSummary(block.name, block.input);
  const hasResult = '_result' in block;
  const isError = block._resultError === true;

  return (
    <div className="my-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 py-1 text-xs hover:bg-white/[0.03] rounded transition-colors group text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Circle className={cn(
          'w-[5px] h-[5px] shrink-0 fill-current',
          isError ? 'text-destructive' : 'text-primary'
        )} />
        <span className="font-medium text-foreground/90">{block.name || 'Tool'}</span>
        {summary && (
          <span className="text-muted-foreground font-mono text-[11px] min-w-0 truncate">
            ({summary})
          </span>
        )}
        <span className="ml-auto shrink-0 flex items-center gap-1">
          {hasResult && (
            isError
              ? <XCircle className="w-3 h-3 text-destructive/70" />
              : <CheckCircle2 className="w-3 h-3 text-success/70" />
          )}
          <ChevronRight className={cn(
            'w-3 h-3 text-muted-foreground/50 transition-transform opacity-0 group-hover:opacity-100',
            open && 'rotate-90 opacity-100'
          )} />
        </span>
      </button>

      {open && (
        <div className="ml-4 mt-1 mb-2 space-y-2">
          {/* Input */}
          <div className="rounded-md p-2 bg-[hsl(var(--tool-input-bg))]">
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">{t('history.toolInput')}</p>
            <pre className="text-muted-foreground whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-[200px] overflow-y-auto">
              {typeof block.input === 'string'
                ? block.input
                : JSON.stringify(block.input, null, 2)}
            </pre>
          </div>
          {/* Result */}
          {hasResult && (
            <div className={cn('border-l-2 pl-3', isError ? 'border-destructive/30' : 'border-primary/20')}>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">{t('history.toolOutput')}</p>
              <pre className="text-muted-foreground whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-[200px] overflow-y-auto">
                {typeof block._result === 'string'
                  ? block._result
                  : JSON.stringify(block._result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Groups 3+ tool_use blocks with expand/collapse all controls */
function ToolCallGroup({ blocks, t }: { blocks: ContentBlock[]; t: (key: string) => string }) {
  const [allExpanded, setAllExpanded] = useState(false);
  const label = t('history.toolCount').replace('{count}', String(blocks.length));

  return (
    <div className="my-1">
      <div className="flex items-center gap-2 py-1">
        <span className="text-[11px] text-muted-foreground/70">{label}</span>
        <button
          onClick={() => setAllExpanded(!allExpanded)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1"
        >
          <ChevronsUpDown className="w-3 h-3" />
          {allExpanded ? t('history.collapseAll') : t('history.expandAll')}
        </button>
      </div>
      {blocks.map((block, i) => (
        <ToolCallBlock key={block.id || i} block={block} t={t} />
      ))}
    </div>
  );
}

function renderTextContent(text: string) {
  return (
    <div className="text-[13px] leading-[1.65] whitespace-pre-wrap break-words">
      {text}
    </div>
  );
}

function renderContentBlocks(blocks: ContentBlock[], t: (key: string) => string) {
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    if (block.type === 'tool_use') {
      // Collect consecutive tool_use blocks
      const toolBlocks: ContentBlock[] = [];
      while (i < blocks.length && blocks[i].type === 'tool_use') {
        toolBlocks.push(blocks[i]);
        i++;
      }
      // 3+ consecutive tool calls → group them
      if (toolBlocks.length >= 3) {
        result.push(<ToolCallGroup key={`tg-${toolBlocks[0].id || i}`} blocks={toolBlocks} t={t} />);
      } else {
        toolBlocks.forEach((tb, j) => {
          result.push(<ToolCallBlock key={tb.id || `tc-${i}-${j}`} block={tb} t={t} />);
        });
      }
      continue;
    }

    switch (block.type) {
      case 'text':
        result.push(<div key={i}>{renderTextContent(block.text || '')}</div>);
        break;

      case 'thinking':
        result.push(
          <CollapsibleBlock
            key={i}
            icon={Brain}
            label={t('history.thinking')}
            iconClassName="text-amber-400"
          >
            <pre className="text-muted-foreground whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-[300px] overflow-y-auto">
              {block.thinking || block.text || ''}
            </pre>
          </CollapsibleBlock>
        );
        break;

      case 'tool_result':
        // Already merged into tool_use via _result — skip rendering
        break;

      default:
        break;
    }
    i++;
  }

  return result;
}

export function MessageBubble({ message, prevRole }: MessageBubbleProps) {
  const { t } = useLocale();
  const isUser = message.msgType === 'user' || message.msgType === 'human';
  const isSummary = message.msgType === 'summary';
  const currentRole = isUser ? 'user' : 'assistant';

  // Dynamic spacing: same role → tight, role switch → wider
  const sameRole = prevRole === currentRole;
  const spacingClass = prevRole == null ? 'my-3' : sameRole ? 'my-1' : 'my-3';

  // Summary messages
  if (isSummary) {
    return (
      <div className="flex justify-center my-3">
        <div className="glass-subtle glass-noise rounded-lg px-4 py-2 max-w-[80%] text-center">
          <p className="text-[11px] text-muted-foreground italic">
            {message.summary || t('history.summaryLabel')}
          </p>
        </div>
      </div>
    );
  }

  // Compact boundary divider
  if (message.isCompactBoundary) {
    return (
      <div className="flex items-center gap-3 my-6 px-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
        <div className="glass-subtle glass-noise rounded-lg px-3 py-1.5 flex items-center gap-2 shrink-0">
          <Scissors className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">
            {t('history.compactBoundary')}
          </span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
      </div>
    );
  }

  // Parse content
  const content = message.content;
  let renderedContent: React.ReactNode;

  if (typeof content === 'string') {
    renderedContent = renderTextContent(content);
  } else if (Array.isArray(content)) {
    renderedContent = renderContentBlocks(content as ContentBlock[], t);
  } else if (content && typeof content === 'object') {
    // Single content block
    renderedContent = renderContentBlocks([content as ContentBlock], t);
  } else {
    renderedContent = <p className="text-xs text-muted-foreground italic">{t('history.emptyMessage')}</p>;
  }

  return (
    <div className={cn('flex gap-2.5', spacingClass, isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
        isUser ? 'bg-primary/20' : 'glass-subtle'
      )}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-primary" />
          : <Bot className="w-3.5 h-3.5 text-muted-foreground" />
        }
      </div>

      {/* Bubble */}
      <div className={cn(
        'rounded-2xl px-3.5 py-2.5 max-w-[85%] min-w-0',
        isUser
          ? 'glass-chat-user text-primary-foreground'
          : 'glass-chat-assistant'
      )}>
        {renderedContent}
        {/* Model tag for assistant */}
        {!isUser && message.model && (
          <p className="text-[10px] text-muted-foreground/50 mt-1.5 font-mono">
            {message.model}
          </p>
        )}
      </div>
    </div>
  );
}
