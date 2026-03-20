import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/locales';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useTauriEvent } from '@/hooks/useTauriEvents';
import type { ProxyDebugState, ProxyTrafficDetail, ProxyTrafficItem } from '@/lib/tauri-ipc';
import { cn } from '@/lib/utils';
import { LaunchButton } from '@/components/ui/LaunchButton';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let val = bytes;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString();
}

function parseBody(raw: string | undefined) {
  const text = (raw || '').trim();
  if (!text || text === '-') {
    return {
      rawText: '-',
      prettyText: '-',
      isJson: false,
      jsonValue: null as unknown,
    };
  }

  if (looksLikeSseBody(text)) {
    return {
      rawText: raw || '',
      prettyText: raw || '',
      isJson: false,
      jsonValue: null as unknown,
    };
  }

  const candidates = buildJsonCandidates(text);
  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate);
    if (parsed !== null) {
      return {
        rawText: raw || '',
        prettyText: JSON.stringify(parsed, null, 2),
        isJson: true,
        jsonValue: parsed,
      };
    }
  }

  return {
    rawText: raw || '',
    prettyText: raw || '',
    isJson: false,
    jsonValue: null as unknown,
  };
}

function looksLikeSseBody(text: string): boolean {
  return /^event:\s/m.test(text) || /^data:\s/m.test(text);
}

function buildJsonCandidates(text: string): string[] {
  const list: string[] = [text];

  // Markdown code fence payload.
  if (text.startsWith('```') && text.endsWith('```')) {
    const stripped = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    if (stripped) list.push(stripped);
  }

  // Extract balanced top-level object/array section when surrounding noise exists.
  const firstObj = text.indexOf('{');
  const lastObj = text.lastIndexOf('}');
  if (firstObj >= 0 && lastObj > firstObj) {
    list.push(text.slice(firstObj, lastObj + 1).trim());
  }

  const firstArr = text.indexOf('[');
  const lastArr = text.lastIndexOf(']');
  if (firstArr >= 0 && lastArr > firstArr) {
    list.push(text.slice(firstArr, lastArr + 1).trim());
  }

  return Array.from(new Set(list.filter(Boolean)));
}

function tryParseJson(text: string): unknown | null {
  try {
    const parsed = JSON.parse(text);
    // Some payloads are double-encoded JSON strings.
    if (typeof parsed === 'string') {
      try {
        return JSON.parse(parsed);
      } catch {
        return parsed;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

function HeaderMapView({ data }: { data: Record<string, string> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <div className="text-xs text-muted-foreground">-</div>;
  }

  return (
    <div className="max-h-48 space-y-1 overflow-auto rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:bg-white/[0.025]">
      {entries.map(([key, value]) => (
        <div key={key} className="text-xs font-mono break-all leading-5 text-muted-foreground">
          <span className="text-foreground/90">{key}</span>: {value}
        </div>
      ))}
    </div>
  );
}

export function ProxyDebug() {
  const { t } = useLocale();
  const {
    getProxyDebugState,
    setProxyDebugEnabled,
    updateProxyDebugConfig,
    listProxyTraffic,
    getProxyTrafficDetail,
    clearProxyTraffic,
    openTextInVSCode,
  } = useTauriCommands();

  const [state, setState] = useState<ProxyDebugState | null>(null);
  const [codexUpstreamBaseUrl, setCodexUpstreamBaseUrl] = useState('https://api.openai.com/v1');
  const [recordMode, setRecordMode] = useState('full');
  const [traffic, setTraffic] = useState<ProxyTrafficItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProxyTrafficDetail | null>(null);
  const [loadingState, setLoadingState] = useState(false);
  const [loadingTraffic, setLoadingTraffic] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [bodyDialogOpen, setBodyDialogOpen] = useState(false);
  const [bodyDialogTitle, setBodyDialogTitle] = useState('');
  const [bodyDialogText, setBodyDialogText] = useState('-');

  const selectedItem = useMemo(() => traffic.find((item) => item.id === selectedId) || null, [traffic, selectedId]);

  useTauriEvent<ProxyDebugState>('proxy-status', (payload) => {
    setState(payload);
    setCodexUpstreamBaseUrl(payload.codexUpstreamBaseUrl || 'https://api.openai.com/v1');
    setRecordMode(payload.recordMode || 'full');
  }, []);

  useTauriEvent<ProxyTrafficItem>('proxy-traffic', (payload) => {
    setTraffic((prev) => {
      const filtered = prev.filter((item) => item.id !== payload.id);
      return [payload, ...filtered].slice(0, 200);
    });
  }, []);

  const refreshState = async () => {
    setLoadingState(true);
    try {
      const nextState = await getProxyDebugState();
      setState(nextState);
      setCodexUpstreamBaseUrl(nextState.codexUpstreamBaseUrl || 'https://api.openai.com/v1');
      setRecordMode(nextState.recordMode || 'full');
    } catch (err) {
      toast.error(`${t('proxyDebug.loadStateFailed')}: ${err}`);
    } finally {
      setLoadingState(false);
    }
  };

  const refreshTraffic = async (cursor?: string | null) => {
    setLoadingTraffic(true);
    try {
      const page = await listProxyTraffic(50, cursor);
      setTraffic((prev) => (cursor ? [...prev, ...page.items] : page.items));
      setNextCursor(page.nextCursor);
    } catch (err) {
      toast.error(`${t('proxyDebug.loadTrafficFailed')}: ${err}`);
    } finally {
      setLoadingTraffic(false);
    }
  };

  useEffect(() => {
    refreshState();
    refreshTraffic();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    (async () => {
      try {
        const payload = await getProxyTrafficDetail(selectedId);
        setDetail(payload);
      } catch (err) {
        toast.error(`${t('proxyDebug.loadDetailFailed')}: ${err}`);
      }
    })();
  }, [selectedId]);

  const handleToggle = async () => {
    if (!state) return;
    try {
      const nextState = await setProxyDebugEnabled(!state.enabled);
      setState(nextState);
      toast.success(nextState.enabled ? t('proxyDebug.enabled') : t('proxyDebug.disabled'));
    } catch (err) {
      toast.error(`${t('proxyDebug.toggleFailed')}: ${err}`);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const nextState = await updateProxyDebugConfig(codexUpstreamBaseUrl, recordMode);
      setState(nextState);
      toast.success(t('proxyDebug.configSaved'));
      setConfigDialogOpen(false);
    } catch (err) {
      toast.error(`${t('proxyDebug.configSaveFailed')}: ${err}`);
    }
  };

  const handleClearLogs = async () => {
    try {
      await clearProxyTraffic();
      setTraffic([]);
      setDetail(null);
      setSelectedId(null);
      setNextCursor(undefined);
      toast.success(t('proxyDebug.logsCleared'));
    } catch (err) {
      toast.error(`${t('proxyDebug.clearFailed')}: ${err}`);
    }
  };

  const openBodyDialog = (title: string, body: string | undefined) => {
    setBodyDialogTitle(title);
    setBodyDialogText(body || '-');
    setBodyDialogOpen(true);
  };

  const parsedDialogBody = useMemo(() => parseBody(bodyDialogText), [bodyDialogText]);
  const currentDialogContent = parsedDialogBody.isJson
    ? parsedDialogBody.prettyText
    : parsedDialogBody.rawText;

  const handleOpenInVSCode = async () => {
    try {
      const filePath = await openTextInVSCode(currentDialogContent, bodyDialogTitle);
      toast.success(`${t('proxyDebug.openedInVSCode')}: ${filePath}`);
    } catch (err) {
      toast.error(`${t('proxyDebug.openInVSCodeFailed')}: ${err}`);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t('proxyDebug.runtime')}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {state?.running
                ? `${t('proxyDebug.runningAt')} ${state.baseUrl || '-'} (${t('proxyDebug.routes')}: ${state.routeCount})`
                : t('proxyDebug.notRunning')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="glass-btn-outline px-2"
              onClick={() => setConfigDialogOpen(true)}
              title={t('proxyDebug.config')}
              aria-label={t('proxyDebug.config')}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="glass-btn-outline" onClick={refreshState} disabled={loadingState}>
              {t('proxyDebug.refresh')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="glass-btn-outline text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleClearLogs}
            >
              {t('proxyDebug.clearLogs')}
            </Button>
            <LaunchButton size="sm" onClick={handleToggle}>
              {state?.enabled ? t('proxyDebug.disable') : t('proxyDebug.enable')}
            </LaunchButton>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <Metric title={t('proxyDebug.totalRequests')} value={String(state?.metrics.totalRequests ?? 0)} />
          <Metric title={t('proxyDebug.activeConnections')} value={String(state?.metrics.activeConnections ?? 0)} />
          <Metric title={t('proxyDebug.avgLatency')} value={`${state?.metrics.avgResponseMs ?? 0} ms`} />
        </div>
      </Card>

      <div className="grid min-h-[640px] grid-cols-1 gap-5 xl:grid-cols-[minmax(360px,0.92fr)_minmax(460px,1.08fr)]">
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,hsl(var(--surface-overlay)/0.84),hsl(var(--surface)/0.78))] shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="glass-header glass-noise flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('proxyDebug.traffic')}</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">{state?.running ? state.baseUrl || '-' : t('proxyDebug.notRunning')}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="glass-btn-outline"
              onClick={() => refreshTraffic()}
              disabled={loadingTraffic}
            >
              {t('proxyDebug.refresh')}
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-3">
            {traffic.length === 0 && (
              <div className="flex h-full min-h-[300px] items-center justify-center text-xs text-muted-foreground">
                {t('proxyDebug.noTraffic')}
              </div>
            )}
            <div className="space-y-2">
              {traffic.map((item) => {
                const active = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      'group w-full rounded-2xl border px-3.5 py-3 text-left transition-all duration-150',
                      active
                        ? 'border-primary/35 bg-primary/[0.10] shadow-[0_0_0_1px_rgba(59,130,246,0.12),0_12px_30px_rgba(59,130,246,0.08)]'
                        : 'border-white/[0.08] bg-white/[0.035] hover:border-white/[0.14] hover:bg-white/[0.06]'
                    )}
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '96px' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="rounded-md bg-black/[0.08] px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground dark:bg-white/[0.06]">
                            {item.method}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-foreground/85">{item.path}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                          <span>{formatTime(item.timestamp)}</span>
                          <span>·</span>
                          <span>{item.client}</span>
                          <span>·</span>
                          <span>{item.durationMs} ms</span>
                        </div>
                        {item.promptPreview && (
                          <div className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {item.promptPreview}
                          </div>
                        )}
                      </div>
                      <div className={cn(
                        'rounded-lg px-2 py-1 text-xs font-semibold tabular-nums',
                        item.status >= 400
                          ? 'bg-destructive/12 text-destructive'
                          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      )}>
                        {item.status}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {nextCursor && (
            <div className="border-t border-white/[0.06] p-3">
              <Button
                variant="outline"
                size="sm"
                className="glass-btn-outline w-full"
                onClick={() => refreshTraffic(nextCursor)}
                disabled={loadingTraffic}
              >
                {t('proxyDebug.loadMore')}
              </Button>
            </div>
          )}
        </section>

        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,hsl(var(--surface-overlay)/0.84),hsl(var(--surface)/0.8))] shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="glass-header glass-noise flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('proxyDebug.detail')}</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {selectedItem ? `${selectedItem.method} ${selectedItem.path}` : t('proxyDebug.selectOne')}
              </p>
            </div>
            {selectedItem && (
              <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-muted-foreground">
                {selectedItem.client}
              </div>
            )}
          </div>

          {!selectedItem ? (
            <div className="flex flex-1 items-center justify-center p-6 text-xs text-muted-foreground">
              {t('proxyDebug.selectOne')}
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Metric title={t('proxyDebug.status')} value={String(selectedItem.status)} />
                <Metric title={t('proxyDebug.duration')} value={`${selectedItem.durationMs} ms`} />
                <Metric title={t('proxyDebug.requestSize')} value={formatBytes(selectedItem.requestBodySize)} />
                <Metric title={t('proxyDebug.responseSize')} value={formatBytes(selectedItem.responseBodySize)} />
              </div>

              <DetailSection title={t('proxyDebug.reduced')}>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-xs leading-6 text-foreground/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:bg-white/[0.025] whitespace-pre-wrap break-words">
                  {detail?.reduced?.finalText || detail?.item.reduced?.finalText || '-'}
                </div>
              </DetailSection>

              <DetailSection title={t('proxyDebug.requestHeaders')}>
                <HeaderMapView data={detail?.requestHeaders || {}} />
              </DetailSection>

              <DetailSection title={t('proxyDebug.responseHeaders')}>
                <HeaderMapView data={detail?.responseHeaders || {}} />
              </DetailSection>

              <BodyPreview
                title={t('proxyDebug.requestBody')}
                body={detail?.requestBody}
                actionLabel={t('proxyDebug.openViewer')}
                onOpen={() => openBodyDialog(t('proxyDebug.requestBody'), detail?.requestBody)}
              />

              <BodyPreview
                title={t('proxyDebug.responseBody')}
                body={detail?.responseBody}
                actionLabel={t('proxyDebug.openViewer')}
                onOpen={() => openBodyDialog(t('proxyDebug.responseBody'), detail?.responseBody)}
              />
            </div>
          )}
        </section>
      </div>

      <Dialog open={bodyDialogOpen} onOpenChange={setBodyDialogOpen}>
        <DialogContent className="flex h-[88vh] max-h-[92vh] w-[92vw] max-w-6xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{bodyDialogTitle}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="friendly" className="flex min-h-0 w-full flex-1 flex-col">
            <div className="flex items-center gap-2">
              <TabsList>
                <TabsTrigger value="friendly">{t('proxyDebug.viewerFriendly')}</TabsTrigger>
                <TabsTrigger value="raw">{t('proxyDebug.viewerRaw')}</TabsTrigger>
              </TabsList>
              <Button
                size="sm"
                variant="outline"
                className="glass-btn-outline ml-auto"
                onClick={handleOpenInVSCode}
              >
                {t('proxyDebug.openInVSCode')}
              </Button>
            </div>

            <TabsContent value="friendly" className="mt-3 flex-1 min-h-0">
              {parsedDialogBody.isJson ? (
                <div className="flex h-full min-h-0 flex-col gap-3">
                  <FriendlyJsonSummary
                    value={parsedDialogBody.jsonValue}
                    labels={{
                      topLevelKeys: t('proxyDebug.topLevelKeys'),
                      messagesCount: t('proxyDebug.messagesCount'),
                      inputPreview: t('proxyDebug.inputPreview'),
                    }}
                  />
                  <pre className="min-h-0 flex-1 overflow-auto rounded border border-white/10 bg-black/5 p-3 font-mono text-xs whitespace-pre-wrap break-words dark:bg-white/[0.02]">
                    {parsedDialogBody.prettyText}
                  </pre>
                </div>
              ) : (
                <div className="flex h-full min-h-0 flex-col">
                  <pre className="min-h-0 flex-1 overflow-auto rounded border border-white/10 bg-black/5 p-3 font-mono text-xs whitespace-pre-wrap break-words dark:bg-white/[0.02]">
                    {parsedDialogBody.prettyText}
                  </pre>
                </div>
              )}
            </TabsContent>

            <TabsContent value="raw" className="mt-3 flex-1 min-h-0">
              <div className="flex h-full min-h-0 flex-col">
                <pre className="min-h-0 flex-1 overflow-auto rounded border border-white/10 bg-black/5 p-3 font-mono text-xs whitespace-pre dark:bg-white/[0.02]">
                  {parsedDialogBody.rawText}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('proxyDebug.config')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">{t('proxyDebug.codexUpstream')}</label>
              <Input
                value={codexUpstreamBaseUrl}
                onChange={(e) => setCodexUpstreamBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">{t('proxyDebug.recordMode')}</label>
              <select
                value={recordMode}
                onChange={(e) => setRecordMode(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="full">{t('proxyDebug.recordModeFull')}</option>
                <option value="metadata">{t('proxyDebug.recordModeMeta')}</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <LaunchButton size="sm" onClick={handleSaveConfig}>{t('proxyDebug.saveConfig')}</LaunchButton>
              <Button variant="outline" size="sm" className="glass-btn-outline" onClick={handleClearLogs}>
                {t('proxyDebug.clearLogs')}
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                {t('proxyDebug.logQuota')}: {formatBytes(state?.logMaxBytes ?? 0)}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FriendlyJsonSummary({
  value,
  labels,
}: {
  value: unknown;
  labels: {
    topLevelKeys: string;
    messagesCount: string;
    inputPreview: string;
  };
}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  const messages = Array.isArray(obj.messages) ? obj.messages : null;
  const input = obj.input;

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        {labels.topLevelKeys}: <span className="text-foreground">{keys.join(', ') || '-'}</span>
      </div>

      {messages && (
        <div className="text-xs text-muted-foreground">
          {labels.messagesCount}: <span className="text-foreground">{messages.length}</span>
        </div>
      )}

      {typeof input === 'string' && (
        <div className="text-xs text-muted-foreground line-clamp-2">
          {labels.inputPreview}: <span className="text-foreground">{input}</span>
        </div>
      )}
    </div>
  );
}

function DetailSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:bg-white/[0.02]',
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

function BodyPreview({
  title,
  body,
  actionLabel,
  onOpen,
}: {
  title: string;
  body: string | undefined;
  actionLabel: string;
  onOpen: () => void;
}) {
  return (
    <DetailSection
      title={title}
      action={(
        <Button
          variant="outline"
          size="sm"
          className="glass-btn-outline h-7 px-2.5 text-[11px]"
          onClick={onOpen}
        >
          {actionLabel}
        </Button>
      )}
    >
      <pre className="max-h-40 overflow-auto rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 font-mono text-xs leading-5 text-foreground/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] whitespace-pre-wrap break-words dark:bg-white/[0.025]">
        {body || '-'}
      </pre>
    </DetailSection>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:bg-white/[0.025]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</div>
      <div className="mt-1 text-base font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
