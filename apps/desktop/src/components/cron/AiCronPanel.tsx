import { useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/EmptyState';
import { useTauriEvent } from '@/hooks/useTauriEvents';
import { useLocale } from '@/locales';
import { toast } from 'sonner';
import { Sparkles, Loader2, Bot, Wrench, Clock, FolderOpen, FileText, Pencil, Check } from 'lucide-react';

interface StreamMessage {
  type: 'thinking' | 'tool' | 'result' | 'error';
  content: string;
}

interface GeneratedTask {
  name: string;
  cronExpression: string;
  prompt: string;
  workingDir: string;
}

interface AiCronPanelProps {
  onTaskCreated: () => void;
  onEdit: (task: GeneratedTask) => void;
}

export function AiCronPanel({ onTaskCreated, onEdit }: AiCronPanelProps) {
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false);
  const [streamMessages, setStreamMessages] = useState<StreamMessage[]>([]);
  const [generatedTask, setGeneratedTask] = useState<GeneratedTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const streamEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const tryParseResult = useCallback((text: string) => {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.name && parsed.cronExpression && parsed.prompt) {
          setGeneratedTask(parsed);
        }
      } catch {
        // Not valid JSON yet
      }
    }
  }, []);

  useTauriEvent<string>('cron-ai-stream', (line) => {
    if (!isGeneratingRef.current) return;

    try {
      const data = JSON.parse(line);

      if (data.type === 'error') {
        setError(data.error || t('cron.aiError'));
        return;
      }

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
          tryParseResult(resultText);
        }
      }
    } catch {
      if (line.trim().startsWith('{')) {
        tryParseResult(line.trim());
      }
    }

    scrollToBottom();
  });

  useTauriEvent('cron-ai-done', () => {
    if (isGeneratingRef.current) {
      isGeneratingRef.current = false;
      setIsGenerating(false);
      setStreamMessages(prev => {
        if (prev.length > 0) {
          return [...prev, { type: 'result' as const, content: t('cron.aiComplete') }];
        }
        return prev;
      });
    }
  });

  const handleGenerate = async () => {
    if (!query.trim() || isGenerating) return;

    isGeneratingRef.current = true;
    setIsGenerating(true);
    setStreamMessages([]);
    setGeneratedTask(null);
    setError(null);

    try {
      await invoke('generate_cron_task_stream', { query: query.trim() });
    } catch (err) {
      setError(String(err));
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleConfirm = async () => {
    if (!generatedTask || isCreating) return;
    setIsCreating(true);
    try {
      const fullTask = {
        id: crypto.randomUUID(),
        name: generatedTask.name,
        cronExpression: generatedTask.cronExpression,
        prompt: generatedTask.prompt,
        workingDir: generatedTask.workingDir,
        envName: null,
        enabled: true,
        timeoutSecs: 300,
        templateId: null,
        triggerType: 'schedule',
        parentTaskId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await invoke('add_cron_task', { task: fullTask });
      toast.success(t('cron.aiCreated'));
      setGeneratedTask(null);
      setStreamMessages([]);
      setQuery('');
      onTaskCreated();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Input bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('cron.aiPlaceholder')}
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-surface-raised border border-[hsl(var(--glass-border-light)/0.15)] text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            disabled={isGenerating}
          />
        </div>
        <Button
          onClick={handleGenerate}
          disabled={!query.trim() || isGenerating}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 border border-[hsl(var(--glass-border-light)/0.15)]"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-1.5" />
          )}
          {isGenerating ? t('cron.aiGenerating') : t('cron.aiGenerate')}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <ErrorBanner
          message={error}
          onRetry={() => { setError(null); handleGenerate(); }}
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

      {/* Generated task preview */}
      {generatedTask && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">{generatedTask.name}</h4>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <code>{generatedTask.cronExpression}</code>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="line-clamp-2">{generatedTask.prompt}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{generatedTask.workingDir}</span>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--glass-border-light)/0.1)]">
            <Button variant="outline" size="sm" onClick={() => onEdit(generatedTask)}>
              <Pencil className="w-3.5 h-3.5 mr-1" />
              {t('cron.aiEdit')}
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={isCreating}>
              {isCreating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
              {t('cron.aiConfirm')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
