import { useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/EmptyState';
import { SkillCard, type DiscoverSkillInfo } from './SkillCard';
import { useTauriEvent } from '@/hooks/useTauriEvents';
import { useLocale } from '@/locales';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { Search, Sparkles, Loader2, Bot, Wrench, AlertTriangle, Settings } from 'lucide-react';
import { LaunchButton } from '@/components/ui/LaunchButton';

interface StreamMessage {
  type: 'thinking' | 'tool' | 'result' | 'error';
  content: string;
}

export function DiscoverTab() {
  const { t } = useLocale();
  const { defaultWorkingDir } = useAppStore();
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
            // If text contains a JSON array, parse as results instead of showing raw text
            const jsonMatch = block.text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              tryParseResults(jsonMatch[0]);
            } else {
              setStreamMessages(prev => [...prev, { type: 'thinking', content: block.text }]);
            }
          } else if (block.type === 'tool_use') {
            const cmd = block.input?.command || block.input?.pattern || '';
            const label = cmd
              ? `${t('skills.toolRunning')} ${cmd}`
              : t('skills.toolRunning');
            setStreamMessages(prev => [...prev, { type: 'tool', content: label }]);
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
      } else if (data.type === 'system' && data.subtype === 'init') {
        // Replace the initial "starting" message once CLI is connected
        setStreamMessages([{ type: 'thinking', content: t('skills.searchConnected') }]);
      }
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
    setStreamMessages([{ type: 'thinking', content: t('skills.searchStarting') }]);
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

  // Listen for install completion events from Rust backend
  useTauriEvent<string>('skill-install-done', async (raw) => {
    try {
      const data = JSON.parse(raw);
      const pid = data.package_id || '';
      const skill = results.find(s => s.package_id === pid);
      const displayName = skill?.name || pid;

      if (data.success) {
        setInstalledIds(prev => new Set(prev).add(pid));
        toast.success(t('skills.installSuccess').replace('{name}', displayName));
        // Refresh installed skills list in store
        try {
          const skills = await invoke<any[]>('list_installed_skills');
          useAppStore.getState().setInstalledSkills(skills);
        } catch { /* ignore refresh error */ }
      } else {
        // Strip ANSI escape codes from error message
        const msg = String(data.message || '');
        const clean = msg
          .replace(/\x1b\[[0-9;]*[a-zA-Z]|\[\?25[hl]|\[999D|\[J/g, '')
          .replace(/[◒◐◓◑■│┌└◇─╔╗╚╝║═█▓░▒███████╗╚══════╝]/g, '')
          .trim();
        toast.error(t('skills.installError').replace('{error}', clean || 'Installation failed'));
      }

      setInstallingIds(prev => {
        const next = new Set(prev);
        next.delete(pid);
        return next;
      });
    } catch {
      // Malformed event payload
    }
  });

  const handleInstall = (packageId: string) => {
    setInstallingIds(prev => new Set(prev).add(packageId));
    const skill = results.find(s => s.package_id === packageId);
    const displayName = skill?.name || packageId;
    toast.info(t('skills.installStarted').replace('{name}', displayName), { duration: 4000 });
    // Fire-and-forget — result comes via "skill-install-done" event
    invoke('install_skill', { packageId, global: true }).catch(() => {});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      {/* Working directory hint */}
      {!defaultWorkingDir && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-amber-700 dark:text-amber-400 flex-1">{t('skills.needWorkingDir')}</span>
          <button
            onClick={() => emit('navigate-to-settings')}
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline shrink-0"
          >
            <Settings className="w-3 h-3" />
            {t('skills.goToSettings')}
          </button>
        </div>
      )}

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
        <LaunchButton
          onClick={handleSearch}
          disabled={!query.trim() || isSearching}
          size="sm"
          icon={isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        >
          {isSearching ? t('skills.searching') : t('skills.search')}
        </LaunchButton>
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
