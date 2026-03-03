import { useEffect, useMemo, useState } from 'react';
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
    <div className="space-y-1 max-h-40 overflow-auto rounded border border-white/10 p-2 bg-black/5 dark:bg-white/[0.02]">
      {entries.map(([key, value]) => (
        <div key={key} className="text-xs font-mono break-all text-muted-foreground">
          <span className="text-foreground">{key}</span>: {value}
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
            <Button size="sm" onClick={handleToggle}>
              {state?.enabled ? t('proxyDebug.disable') : t('proxyDebug.enable')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <Metric title={t('proxyDebug.totalRequests')} value={String(state?.metrics.totalRequests ?? 0)} />
          <Metric title={t('proxyDebug.activeConnections')} value={String(state?.metrics.activeConnections ?? 0)} />
          <Metric title={t('proxyDebug.avgLatency')} value={`${state?.metrics.avgResponseMs ?? 0} ms`} />
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{t('proxyDebug.traffic')}</h3>
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

          <div className="space-y-2 max-h-[440px] overflow-auto pr-1">
            {traffic.length === 0 && (
              <div className="text-xs text-muted-foreground py-8 text-center">{t('proxyDebug.noTraffic')}</div>
            )}
            {traffic.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                    active ? 'border-primary/50 bg-primary/10' : 'border-white/10 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-foreground">{item.method}</span>
                    <span className="text-muted-foreground truncate flex-1">{item.path}</span>
                    <span className="font-mono text-foreground">{item.status}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    <span>{formatTime(item.timestamp)}</span>
                    <span>·</span>
                    <span>{item.client}</span>
                    <span>·</span>
                    <span>{item.durationMs}ms</span>
                  </div>
                  {item.promptPreview && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.promptPreview}</div>
                  )}
                </button>
              );
            })}
          </div>

          {nextCursor && (
            <Button
              variant="outline"
              size="sm"
              className="glass-btn-outline w-full"
              onClick={() => refreshTraffic(nextCursor)}
              disabled={loadingTraffic}
            >
              {t('proxyDebug.loadMore')}
            </Button>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">{t('proxyDebug.detail')}</h3>
          {!selectedItem && (
            <div className="text-xs text-muted-foreground py-8 text-center">{t('proxyDebug.selectOne')}</div>
          )}

          {selectedItem && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Metric title={t('proxyDebug.status')} value={String(selectedItem.status)} />
                <Metric title={t('proxyDebug.duration')} value={`${selectedItem.durationMs} ms`} />
                <Metric title={t('proxyDebug.requestSize')} value={formatBytes(selectedItem.requestBodySize)} />
                <Metric title={t('proxyDebug.responseSize')} value={formatBytes(selectedItem.responseBodySize)} />
              </div>

              <div>
                <div className="text-xs font-medium text-foreground mb-1">{t('proxyDebug.reduced')}</div>
                <div className="rounded border border-white/10 p-2 text-xs min-h-[72px] whitespace-pre-wrap break-words bg-black/5 dark:bg-white/[0.02]">
                  {detail?.reduced?.finalText || detail?.item.reduced?.finalText || '-'}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-foreground mb-1">{t('proxyDebug.requestHeaders')}</div>
                <HeaderMapView data={detail?.requestHeaders || {}} />
              </div>

              <div>
                <div className="text-xs font-medium text-foreground mb-1">{t('proxyDebug.responseHeaders')}</div>
                <HeaderMapView data={detail?.responseHeaders || {}} />
              </div>

              <div>
                <div className="text-xs font-medium text-foreground mb-1 flex items-center justify-between gap-2">
                  <span>{t('proxyDebug.requestBody')}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="glass-btn-outline h-6 px-2 text-[11px]"
                    onClick={() => openBodyDialog(t('proxyDebug.requestBody'), detail?.requestBody)}
                  >
                    {t('proxyDebug.openViewer')}
                  </Button>
                </div>
                <pre className="rounded border border-white/10 p-2 text-xs max-h-36 overflow-auto whitespace-pre-wrap break-words bg-black/5 dark:bg-white/[0.02]">
                  {detail?.requestBody || '-'}
                </pre>
              </div>

              <div>
                <div className="text-xs font-medium text-foreground mb-1 flex items-center justify-between gap-2">
                  <span>{t('proxyDebug.responseBody')}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="glass-btn-outline h-6 px-2 text-[11px]"
                    onClick={() => openBodyDialog(t('proxyDebug.responseBody'), detail?.responseBody)}
                  >
                    {t('proxyDebug.openViewer')}
                  </Button>
                </div>
                <pre className="rounded border border-white/10 p-2 text-xs max-h-36 overflow-auto whitespace-pre-wrap break-words bg-black/5 dark:bg-white/[0.02]">
                  {detail?.responseBody || '-'}
                </pre>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={bodyDialogOpen} onOpenChange={setBodyDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{bodyDialogTitle}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="friendly" className="w-full">
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

            <TabsContent value="friendly" className="space-y-3">
              {parsedDialogBody.isJson ? (
                <>
                  <FriendlyJsonSummary
                    value={parsedDialogBody.jsonValue}
                    labels={{
                      topLevelKeys: t('proxyDebug.topLevelKeys'),
                      messagesCount: t('proxyDebug.messagesCount'),
                      inputPreview: t('proxyDebug.inputPreview'),
                    }}
                  />
                  <pre className="rounded border border-white/10 p-3 text-xs max-h-[52vh] overflow-auto whitespace-pre-wrap break-words bg-black/5 dark:bg-white/[0.02]">
                    {parsedDialogBody.prettyText}
                  </pre>
                </>
              ) : (
                <pre className="rounded border border-white/10 p-3 text-xs max-h-[58vh] overflow-auto whitespace-pre-wrap break-words bg-black/5 dark:bg-white/[0.02]">
                  {parsedDialogBody.prettyText}
                </pre>
              )}
            </TabsContent>

            <TabsContent value="raw">
              <pre className="rounded border border-white/10 p-3 text-xs max-h-[58vh] overflow-auto whitespace-pre-wrap break-words bg-black/5 dark:bg-white/[0.02]">
                {parsedDialogBody.rawText}
              </pre>
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
              <Button size="sm" onClick={handleSaveConfig}>{t('proxyDebug.saveConfig')}</Button>
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

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded border border-white/10 px-2 py-1.5 bg-black/5 dark:bg-white/[0.02]">
      <div className="text-[11px] text-muted-foreground">{title}</div>
      <div className="text-sm font-semibold text-foreground mt-0.5">{value}</div>
    </div>
  );
}
