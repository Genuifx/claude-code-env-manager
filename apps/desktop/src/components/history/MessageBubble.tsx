import { useState } from 'react';
import { ChevronRight, Wrench, Brain, CheckCircle2, XCircle, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  name?: string;
  input?: unknown;
  content?: unknown;
  is_error?: boolean;
  tool_use_id?: string;
}

export interface ConversationMessageData {
  msgType: string;
  uuid?: string;
  content: ContentBlock[] | string | null;
  model?: string;
  summary?: string;
}

interface MessageBubbleProps {
  message: ConversationMessageData;
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

function renderTextContent(text: string) {
  return (
    <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
      {text}
    </div>
  );
}

function renderContentBlocks(blocks: ContentBlock[], t: (key: string) => string) {
  return blocks.map((block, i) => {
    switch (block.type) {
      case 'text':
        return <div key={i}>{renderTextContent(block.text || '')}</div>;

      case 'thinking':
        return (
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

      case 'tool_use':
        return (
          <CollapsibleBlock
            key={i}
            icon={Wrench}
            label={block.name || 'Tool'}
            iconClassName="text-primary"
          >
            <pre className="text-muted-foreground whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-[200px] overflow-y-auto">
              {typeof block.input === 'string'
                ? block.input
                : JSON.stringify(block.input, null, 2)}
            </pre>
          </CollapsibleBlock>
        );

      case 'tool_result': {
        const isError = block.is_error;
        const StatusIcon = isError ? XCircle : CheckCircle2;
        const statusLabel = isError ? t('history.toolError') : t('history.toolSuccess');
        const statusColor = isError ? 'text-destructive' : 'text-success';

        return (
          <CollapsibleBlock
            key={i}
            icon={StatusIcon}
            label={statusLabel}
            iconClassName={statusColor}
          >
            <pre className="text-muted-foreground whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-[200px] overflow-y-auto">
              {typeof block.content === 'string'
                ? block.content
                : JSON.stringify(block.content, null, 2)}
            </pre>
          </CollapsibleBlock>
        );
      }

      default:
        return null;
    }
  });
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { t } = useLocale();
  const isUser = message.msgType === 'user' || message.msgType === 'human';
  const isSummary = message.msgType === 'summary';

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
    <div className={cn('flex gap-2.5 my-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
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
        'rounded-xl px-3.5 py-2.5 max-w-[85%] min-w-0',
        isUser
          ? 'bg-primary/80 text-primary-foreground'
          : 'glass-subtle glass-noise'
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
