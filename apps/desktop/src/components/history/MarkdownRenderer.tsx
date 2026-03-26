import { Suspense, lazy, useCallback, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import { getPerformanceMode } from '@/lib/performance';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** "user" adapts colors for the blue user bubble background */
  variant?: 'default' | 'user';
}
interface CodeHighlighterProps {
  code: string;
  language: string;
}

let syntaxLanguagesRegistered = false;

const LazyCodeHighlighter = lazy(async () => {
  const [
    { default: SyntaxHighlighter },
    { default: oneDark },
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

  const codeTheme = {
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

  function CodeHighlighter({ code, language }: CodeHighlighterProps) {
    return (
      <SyntaxHighlighter
        style={codeTheme}
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

function PlainCodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto px-4 py-3 text-[12px] leading-[1.6] text-white/85">
      <code>{code}</code>
    </pre>
  );
}

function CodeBlockFrame({
  language,
  code,
  children,
}: {
  language: string;
  code: string;
  children: React.ReactNode;
}) {
  return (
    <div className="my-2 overflow-hidden rounded-lg border border-[#1e1e2e]/50 bg-[#1e1e2e]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-white/30">
          {language}
        </span>
        <CopyButton text={code} dark />
      </div>
      {children}
    </div>
  );
}

export function MarkdownRenderer({ content, className, variant = 'default' }: MarkdownRendererProps) {
  const isUser = variant === 'user';
  const shouldReduceCodeRendering = getPerformanceMode() === 'reduced';
  return (
    <div className={cn('markdown-content', className)}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className={cn('text-base font-semibold mt-4 mb-2 first:mt-0', isUser ? 'text-inherit' : 'text-foreground')}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className={cn('text-[14px] font-semibold mt-3 mb-1.5 first:mt-0', isUser ? 'text-inherit' : 'text-foreground')}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className={cn('text-[13px] font-semibold mt-2.5 mb-1 first:mt-0', isUser ? 'text-inherit' : 'text-foreground')}>{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className={cn('text-[13px] font-medium mt-2 mb-1 first:mt-0', isUser ? 'text-inherit' : 'text-foreground')}>{children}</h4>
          ),

          // Paragraph
          p: ({ children }) => (
            <p className="text-[13px] leading-[1.65] mb-2 last:mb-0">{children}</p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="pl-5 list-disc text-[13px] leading-[1.65] mb-2 last:mb-0 space-y-0.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="pl-5 list-decimal text-[13px] leading-[1.65] mb-2 last:mb-0 space-y-0.5">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-[13px] leading-[1.65]">{children}</li>
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
              'border-l-2 pl-3 my-2 italic',
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
          code: ({ className: codeClassName, children, node }) => {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const codeString = String(children).replace(/\n$/, '');
            const isBlock = Boolean((node?.position && match) || codeClassName);

            if (isBlock) {
              const language = match?.[1] || 'text';
              return (
                <CodeBlockFrame language={language} code={codeString}>
                  {shouldReduceCodeRendering ? (
                    <PlainCodeBlock code={codeString} />
                  ) : (
                    <Suspense fallback={<PlainCodeBlock code={codeString} />}>
                      <LazyCodeHighlighter code={codeString} language={language} />
                    </Suspense>
                  )}
                </CodeBlockFrame>
              );
            }

            // Inline code
            return (
              <code className={cn(
                'rounded px-1.5 py-0.5 text-[12px] font-mono',
                isUser ? 'bg-white/20 text-inherit' : 'bg-muted text-primary'
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
