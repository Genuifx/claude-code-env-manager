import { useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/EmptyState';
import { SkillCard, type DiscoverSkillInfo } from './SkillCard';
import { useTauriEvent } from '@/hooks/useTauriEvents';
import { useLocale } from '@/locales';
import { toast } from 'sonner';
import { Search, Sparkles, Loader2, Bot, Wrench } from 'lucide-react';

interface StreamMessage {
  type: 'thinking' | 'tool' | 'result' | 'error';
  content: string;
}

export function DiscoverTab() {
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const isSearchingRef = useRef(false);
  const [streamMessages, setStreamMessages] = useState<StreamMessage[]>([]);
  const [results, setResults] = useState<DiscoverSkillInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const streamEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const tryParseResults = useCallback((text: string) => {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          setResults(parsed.filter((s: any) => s.name && s.package_id));
        }
      } catch {
        // Not valid JSON
      }
    }
  }, []);

  // Listen for stream events — use ref to avoid stale closure
  useTauriEvent<string>('skill-search-stream', (line) => {
    if (!isSearchingRef.current) return;

    try {
      const data = JSON.parse(line);

      if (data.type === 'error') {
        setError(data.error || t('skills.searchError'));
        return;
      }

      // Handle stream-json format from claude CLI
      if (data.type === 'assistant' && data.message?.content) {
        for (const block of data.message.content) {
          if (block.type === 'text' && block.text) {
            setStreamMessages(prev => [...prev, { type: 'thinking', content: block.text }]);
          } else if (block.type === 'tool_use') {
            setStreamMessages(prev => [...prev, { type: 'tool', content: t('skills.toolRunning') }]);
          }
        }
      } else if (data.type === 'content_block_delta' && data.delta?.text) {
        setStreamMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.type === 'thinking') {
            return [...prev.slice(0, -1), { ...last, content: last.content + data.delta.text }];
          }
          return [...prev, { type: 'thinking', content: data.delta.text }];
        });
      } else if (data.type === 'result') {
        const resultText = data.result || '';
        if (data.is_error) {
          setError(resultText);
        } else {
          tryParseResults(resultText);
        }
      }
      // Skip system events silently
    } catch {
      // Non-JSON line — try to extract results from raw text
      if (line.trim().startsWith('[')) {
        tryParseResults(line.trim());
      }
    }

    scrollToBottom();
  });

  useTauriEvent('skill-search-done', () => {
    if (isSearchingRef.current) {
      isSearchingRef.current = false;
      setIsSearching(false);
      setStreamMessages(prev => {
        if (prev.length > 0) {
          return [...prev, { type: 'result' as const, content: t('skills.searchComplete') }];
        }
        return prev;
      });
    }
  });

  const handleSearch = async () => {
    if (!query.trim() || isSearching) return;

    isSearchingRef.current = true;
    setIsSearching(true);
    setStreamMessages([]);
    setResults([]);
    setError(null);

    try {
      await invoke('search_skills_stream', { query: query.trim() });
    } catch (err) {
      setError(String(err));
      isSearchingRef.current = false;
      setIsSearching(false);
    }
  };

  const handleInstall = async (packageId: string) => {
    setInstallingIds(prev => new Set(prev).add(packageId));
    try {
      await invoke('install_skill', { packageId, global: true });
      setInstalledIds(prev => new Set(prev).add(packageId));
      const skill = results.find(s => s.package_id === packageId);
      toast.success(t('skills.installSuccess').replace('{name}', skill?.name || packageId));
    } catch (err) {
      toast.error(t('skills.installError').replace('{error}', String(err)));
    } finally {
      setInstallingIds(prev => {
        const next = new Set(prev);
        next.delete(packageId);
        return next;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('skills.searchPlaceholder')}
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-surface-raised border border-[hsl(var(--glass-border-light)/0.15)] text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            disabled={isSearching}
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={!query.trim() || isSearching}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 border border-[hsl(var(--glass-border-light)/0.15)]"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Search className="w-4 h-4 mr-1.5" />
          )}
          {isSearching ? t('skills.searching') : t('skills.search')}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{t('skills.searchHint')}</p>

      {/* Error */}
      {error && (
        <ErrorBanner
          message={error}
          onRetry={() => { setError(null); handleSearch(); }}
          retryLabel={t('common.retry')}
        />
      )}

      {/* Stream output */}
      {streamMessages.length > 0 && (
        <Card className="p-4 max-h-48 overflow-y-auto">
          <div className="space-y-2 text-sm">
            {streamMessages.map((msg, i) => (
              <div key={i} className="flex items-start gap-2">
                {msg.type === 'thinking' && (
                  <>
                    <Bot className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                    <span className="text-muted-foreground whitespace-pre-wrap">{msg.content}</span>
                  </>
                )}
                {msg.type === 'tool' && (
                  <>
                    <Wrench className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
                    <span className="text-amber-500">{msg.content}</span>
                  </>
                )}
                {msg.type === 'result' && (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                    <span className="text-emerald-500">{msg.content}</span>
                  </>
                )}
              </div>
            ))}
            <div ref={streamEndRef} />
          </div>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((skill) => (
            <SkillCard
              key={skill.package_id}
              variant="discover"
              skill={skill}
              isInstalled={installedIds.has(skill.package_id)}
              isInstalling={installingIds.has(skill.package_id)}
              onInstall={handleInstall}
            />
          ))}
        </div>
      )}

      {/* Empty state — only when not searching and no results */}
      {!isSearching && results.length === 0 && streamMessages.length === 0 && !error && (
        <EmptyState
          icon={Sparkles}
          message={t('skills.noResults')}
          action={t('skills.tryDifferent')}
          onAction={() => document.querySelector<HTMLInputElement>('input[type="text"]')?.focus()}
        />
      )}
    </div>
  );
}
