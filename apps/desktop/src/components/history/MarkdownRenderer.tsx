import { Suspense, lazy, useCallback, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import { getPerformanceMode } from '@/lib/performance';
import { isMarkdownCodeBlock } from './markdownCodeBlocks';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** "user" adapts colors for the blue user bubble background */
  variant?: 'default' | 'user';
  /** "reading" is tuned for workspace long-form reading surfaces */
  codeTone?: 'default' | 'reading';
}
interface CodeHighlighterProps {
  code: string;
  language: string;
  codeTone: NonNullable<MarkdownRendererProps['codeTone']>;
}

let syntaxLanguagesRegistered = false;

const LazyCodeHighlighter = lazy(async () => {
  const [
    { default: SyntaxHighlighter },
    { default: oneDark },
    { default: coldarkCold },
    { default: bash },
    { default: diff },
    { default: go },
    { default: javascript },
    { default: json },
    { default: markdown },
    { default: python },
    { default: rust },
    { default: sql },
    { default: tsx },
    { default: typescript },
    { default: yaml },
  ] = await Promise.all([
    import('react-syntax-highlighter/dist/esm/prism-light'),
    import('react-syntax-highlighter/dist/esm/styles/prism/one-dark'),
    import('react-syntax-highlighter/dist/esm/styles/prism/coldark-cold'),
    import('react-syntax-highlighter/dist/esm/languages/prism/bash'),
    import('react-syntax-highlighter/dist/esm/languages/prism/diff'),
    import('react-syntax-highlighter/dist/esm/languages/prism/go'),
    import('react-syntax-highlighter/dist/esm/languages/prism/javascript'),
    import('react-syntax-highlighter/dist/esm/languages/prism/json'),
    import('react-syntax-highlighter/dist/esm/languages/prism/markdown'),
    import('react-syntax-highlighter/dist/esm/languages/prism/python'),
    import('react-syntax-highlighter/dist/esm/languages/prism/rust'),
    import('react-syntax-highlighter/dist/esm/languages/prism/sql'),
    import('react-syntax-highlighter/dist/esm/languages/prism/tsx'),
    import('react-syntax-highlighter/dist/esm/languages/prism/typescript'),
    import('react-syntax-highlighter/dist/esm/languages/prism/yaml'),
  ]);

  if (!syntaxLanguagesRegistered) {
    const registeredLanguages: Array<[string, unknown]> = [
      ['bash', bash],
      ['sh', bash],
      ['shell', bash],
      ['diff', diff],
      ['go', go],
      ['javascript', javascript],
      ['js', javascript],
      ['json', json],
      ['markdown', markdown],
      ['md', markdown],
      ['python', python],
      ['py', python],
      ['rust', rust],
      ['rs', rust],
      ['sql', sql],
      ['typescript', typescript],
      ['ts', typescript],
      ['tsx', tsx],
      ['yaml', yaml],
      ['yml', yaml],
    ];

    for (const [name, language] of registeredLanguages) {
      SyntaxHighlighter.registerLanguage(name, language as never);
    }

    syntaxLanguagesRegistered = true;
  }

  const defaultCodeTheme = {
    ...oneDark,
    'pre[class*="language-"]': {
      ...oneDark['pre[class*="language-"]'],
      background: 'transparent',
      margin: 0,
      padding: '0.75rem 1rem',
      fontSize: '12px',
      lineHeight: '1.6',
    },
    'code[class*="language-"]': {
      ...oneDark['code[class*="language-"]'],
      background: 'transparent',
      fontSize: '12px',
    },
  };

  const readingCodeTheme = {
    ...coldarkCold,
    'pre[class*="language-"]': {
      ...coldarkCold['pre[class*="language-"]'],
      background: 'transparent',
      color: 'var(--workspace-reading-code-text)',
      margin: 0,
      padding: '0.875rem 1rem',
      fontSize: '12.5px',
      lineHeight: '1.65',
    },
    'code[class*="language-"]': {
      ...coldarkCold['code[class*="language-"]'],
      background: 'transparent',
      color: 'var(--workspace-reading-code-text)',
      fontSize: '12.5px',
    },
    comment: {
      ...coldarkCold.comment,
      color: 'var(--workspace-reading-code-comment)',
    },
    prolog: {
      ...coldarkCold.prolog,
      color: 'var(--workspace-reading-code-comment)',
    },
    doctype: {
      ...coldarkCold.doctype,
      color: 'var(--workspace-reading-code-comment)',
    },
    cdata: {
      ...coldarkCold.cdata,
      color: 'var(--workspace-reading-code-comment)',
    },
    keyword: {
      ...coldarkCold.keyword,
      color: 'var(--workspace-reading-code-keyword)',
    },
    operator: {
      ...coldarkCold.operator,
      color: 'var(--workspace-reading-code-keyword)',
    },
    string: {
      ...coldarkCold.string,
      color: 'var(--workspace-reading-code-string)',
    },
    char: {
      ...coldarkCold.char,
      color: 'var(--workspace-reading-code-string)',
    },
    'attr-value': {
      ...coldarkCold['attr-value'],
      color: 'var(--workspace-reading-code-string)',
    },
    function: {
      ...coldarkCold.function,
      color: 'var(--workspace-reading-code-function)',
    },
    number: {
      ...coldarkCold.number,
      color: 'var(--workspace-reading-code-number)',
    },
    boolean: {
      ...coldarkCold.boolean,
      color: 'var(--workspace-reading-code-number)',
    },
    constant: {
      ...coldarkCold.constant,
      color: 'var(--workspace-reading-code-number)',
    },
    property: {
      ...coldarkCold.property,
      color: 'var(--workspace-reading-code-property)',
    },
    variable: {
      ...coldarkCold.variable,
      color: 'var(--workspace-reading-code-property)',
    },
    punctuation: {
      ...coldarkCold.punctuation,
      color: 'var(--workspace-reading-code-punctuation)',
    },
  };

  function CodeHighlighter({ code, language, codeTone }: CodeHighlighterProps) {
    return (
      <SyntaxHighlighter
        style={codeTone === 'reading' ? readingCodeTheme : defaultCodeTheme}
        language={language}
        PreTag="div"
      >
        {code}
      </SyntaxHighlighter>
    );
  }

  return { default: CodeHighlighter };
});

function CopyButton({ text, dark = false }: { text: string; dark?: boolean }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors',
        dark
          ? 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
          : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50'
      )}
      aria-label={copied ? t('history.copied') : t('history.copyCode')}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          {t('history.copied')}
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          {t('history.copyCode')}
        </>
      )}
    </button>
  );
}

function PlainCodeBlock({
  code,
  codeTone,
}: {
  code: string;
  codeTone: NonNullable<MarkdownRendererProps['codeTone']>;
}) {
  return (
    <pre
      className={cn(
        'overflow-x-auto px-4 py-3 font-mono',
        codeTone === 'reading'
          ? 'text-[12.5px] leading-[1.65] text-[color:var(--workspace-reading-code-text)]'
          : 'text-[12px] leading-[1.6] text-white/85'
      )}
    >
      <code>{code}</code>
    </pre>
  );
}

function CodeBlockFrame({
  language,
  code,
  children,
  codeTone,
}: {
  language: string;
  code: string;
  children: React.ReactNode;
  codeTone: NonNullable<MarkdownRendererProps['codeTone']>;
}) {
  const isReading = codeTone === 'reading';

  return (
    <div
      className={cn(
        'my-2 overflow-hidden rounded-lg border',
        isReading ? 'shadow-[0_1px_2px_rgb(15_23_42/0.04)]' : 'border-[#1e1e2e]/50 bg-[#1e1e2e]'
      )}
      style={isReading ? {
        background: 'var(--workspace-reading-code-bg)',
        borderColor: 'var(--workspace-reading-code-border)',
      } : undefined}
    >
      <div
        className={cn(
          'flex items-center justify-between border-b px-3 py-1.5',
          !isReading && 'border-white/[0.06]'
        )}
        style={isReading ? {
          background: 'var(--workspace-reading-code-header-bg)',
          borderColor: 'var(--workspace-reading-code-header-border)',
        } : undefined}
      >
        <span
          className={cn(
            'text-[10px] font-mono uppercase tracking-wider',
            !isReading && 'text-white/30'
          )}
          style={isReading ? { color: 'var(--workspace-reading-code-label)' } : undefined}
        >
          {language}
        </span>
        <CopyButton text={code} dark={!isReading} />
      </div>
      {children}
    </div>
  );
}

export function MarkdownRenderer({
  content,
  className,
  variant = 'default',
  codeTone = 'default',
}: MarkdownRendererProps) {
  const isUser = variant === 'user';
  const isReadingCode = codeTone === 'reading';
  const shouldReduceCodeRendering = getPerformanceMode() === 'reduced';
  return (
    <div className={cn('markdown-content', className)}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className={cn('text-[17px] font-semibold mt-4 mb-2 first:mt-0', isUser ? 'text-inherit' : 'text-foreground')}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className={cn('text-[15px] font-semibold mt-3 mb-1.5 first:mt-0', isUser ? 'text-inherit' : 'text-foreground')}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className={cn('text-[13px] font-semibold mt-2.5 mb-1 first:mt-0', isUser ? 'text-inherit' : 'text-foreground')}>{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className={cn('text-[13px] font-medium mt-2 mb-1 first:mt-0', isUser ? 'text-inherit' : 'text-foreground')}>{children}</h4>
          ),

          // Paragraph
          p: ({ children }) => (
            <p className="text-[13.5px] leading-[1.75] mb-3 last:mb-0">{children}</p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="pl-5 list-disc text-[13.5px] leading-[1.75] mb-3 last:mb-0 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="pl-5 list-decimal text-[13.5px] leading-[1.75] mb-3 last:mb-0 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-[13.5px] leading-[1.75]">{children}</li>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'underline-offset-2',
                isUser ? 'text-white/90' : 'text-primary hover:underline'
              )}
            >
              {children}
            </a>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className={cn(
              'border-l-[3px] pl-4 my-3 italic',
              isUser ? 'border-white/40 text-white/70' : 'border-primary/30 text-muted-foreground'
            )}>
              {children}
            </blockquote>
          ),

          // Horizontal rule
          hr: () => <hr className="border-border my-4" />,

          // Strong / emphasis
          strong: ({ children }) => (
            <strong className={cn('font-semibold', isUser ? 'text-inherit' : 'text-foreground')}>{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),

          // Code — inline and block
          code: ({ className: codeClassName, children }) => {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const rawCodeString = String(children);
            const codeString = rawCodeString.replace(/\n$/, '');
            const isBlock = isMarkdownCodeBlock(codeClassName, rawCodeString);

            if (isBlock) {
              const language = match?.[1] || 'text';
              return (
                <CodeBlockFrame language={language} code={codeString} codeTone={codeTone}>
                  {shouldReduceCodeRendering || language === 'text' ? (
                    <PlainCodeBlock code={codeString} codeTone={codeTone} />
                  ) : (
                    <Suspense fallback={<PlainCodeBlock code={codeString} codeTone={codeTone} />}>
                      <LazyCodeHighlighter code={codeString} language={language} codeTone={codeTone} />
                    </Suspense>
                  )}
                </CodeBlockFrame>
              );
            }

            // Inline code
            return (
              <code className={cn(
                'rounded px-1.5 py-0.5 text-[12px] font-mono',
                isUser
                  ? 'bg-white/20 text-inherit'
                  : isReadingCode
                    ? 'border border-[color:var(--workspace-reading-inline-border)] bg-[var(--workspace-reading-inline-bg)] text-[color:var(--workspace-reading-inline-text)]'
                    : 'bg-muted text-primary'
              )}>
                {children}
              </code>
            );
          },

          // Pre — delegate to code component for fenced blocks
          pre: ({ children }) => <>{children}</>,

          // Table
          table: ({ children }) => (
            <div className="my-2 rounded-lg overflow-hidden border border-border">
              <table className="w-full text-[12px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-1.5 text-left font-medium text-foreground/80 border-b border-border">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-1.5 border-b border-border-subtle">{children}</td>
          ),

          // Task list items (GFM)
          input: ({ checked, ...props }) => (
            <input
              {...props}
              checked={checked}
              disabled
              type="checkbox"
              className="mr-1.5 accent-primary"
            />
          ),

          // Delete (strikethrough)
          del: ({ children }) => (
            <del className="text-muted-foreground line-through">{children}</del>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
