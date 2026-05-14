import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, RotateCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/locales';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useTauriEvent } from '@/hooks/useTauriEvents';
import type { ProxyDebugState, ProxyTrafficDetail, ProxyTrafficItem } from '@/lib/tauri-ipc';
import { cn } from '@/lib/utils';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let val = bytes;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) { val /= 1024; idx += 1; }
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString();
}

function parseBody(raw: string | undefined) {
  const text = (raw || '').trim();
  if (!text || text === '-') {
    return { rawText: '-', prettyText: '-', isJson: false, jsonValue: null as unknown };
  }
  if (looksLikeSseBody(text)) {
    return { rawText: raw || '', prettyText: raw || '', isJson: false, jsonValue: null as unknown };
  }
  const candidates = buildJsonCandidates(text);
  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate);
    if (parsed !== null) {
      return { rawText: raw || '', prettyText: JSON.stringify(parsed, null, 2), isJson: true, jsonValue: parsed };
    }
  }
  return { rawText: raw || '', prettyText: raw || '', isJson: false, jsonValue: null as unknown };
}

function looksLikeSseBody(text: string): boolean {
  return /^event:\s/m.test(text) || /^data:\s/m.test(text);
}

function buildJsonCandidates(text: string): string[] {
  const list: string[] = [text];
  if (text.startsWith('```') && text.endsWith('```')) {
    const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    if (stripped) list.push(stripped);
  }
  const firstObj = text.indexOf('{');
  const lastObj = text.lastIndexOf('}');
  if (firstObj >= 0 && lastObj > firstObj) list.push(text.slice(firstObj, lastObj + 1).trim());
  const firstArr = text.indexOf('[');
  const lastArr = text.lastIndexOf(']');
  if (firstArr >= 0 && lastArr > firstArr) list.push(text.slice(firstArr, lastArr + 1).trim());
  return Array.from(new Set(list.filter(Boolean)));
}

function tryParseJson(text: string): unknown | null {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'string') { try { return JSON.parse(parsed); } catch { return parsed; } }
    return parsed;
  } catch { return null; }
}

function HeaderMapView({ data }: { data: Record<string, string> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <div className="text-[14px] text-[#86868b] dark:text-[#a1a1a6]">-</div>;
  return (
    <div className="max-h-48 space-y-1 overflow-auto rounded-lg border border-[#e0e0e0] bg-[#f5f5f7] p-3 dark:border-[#3a3a3c] dark:bg-[#1c1c1e]">
      {entries.map(([key, value]) => (
        <div key={key} className="font-mono text-xs break-all leading-5 text-[#86868b] dark:text-[#a1a1a6]">
          <span className="text-[#1d1d1f] dark:text-[#f5f5f7]">{key}</span>: {value}
        </div>
      ))}
    </div>
  );
}

export function ProxyDebug() {
  const { t } = useLocale();
  const {
    getProxyDebugState, setProxyDebugEnabled, updateProxyDebugConfig,
    listProxyTraffic, getProxyTrafficDetail, clearProxyTraffic, openTextInVSCode,
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

  const selectedItem = useMemo(
    () => traffic.find((item) => item.id === selectedId) || null,
    [traffic, selectedId],
  );

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
      const s = await getProxyDebugState();
      setState(s);
      setCodexUpstreamBaseUrl(s.codexUpstreamBaseUrl || 'https://api.openai.com/v1');
      setRecordMode(s.recordMode || 'full');
    } catch (err) {
      toast.error(`${t('proxyDebug.loadStateFailed')}: ${err}`);
    } finally { setLoadingState(false); }
  };

  const refreshTraffic = async (cursor?: string | null) => {
    setLoadingTraffic(true);
    try {
      const page = await listProxyTraffic(50, cursor);
      setTraffic((prev) => (cursor ? [...prev, ...page.items] : page.items));
      setNextCursor(page.nextCursor);
    } catch (err) {
      toast.error(`${t('proxyDebug.loadTrafficFailed')}: ${err}`);
    } finally { setLoadingTraffic(false); }
  };

  useEffect(() => { refreshState(); refreshTraffic(); }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    (async () => {
      try { setDetail(await getProxyTrafficDetail(selectedId)); }
      catch (err) { toast.error(`${t('proxyDebug.loadDetailFailed')}: ${err}`); }
    })();
  }, [selectedId]);

  const handleToggle = async () => {
    if (!state) return;
    try {
      const s = await setProxyDebugEnabled(!state.enabled);
      setState(s);
      toast.success(s.enabled ? t('proxyDebug.enabled') : t('proxyDebug.disabled'));
    } catch (err) { toast.error(`${t('proxyDebug.toggleFailed')}: ${err}`); }
  };

  const handleSaveConfig = async () => {
    try {
      const s = await updateProxyDebugConfig(codexUpstreamBaseUrl, recordMode);
      setState(s);
      toast.success(t('proxyDebug.configSaved'));
      setConfigDialogOpen(false);
    } catch (err) { toast.error(`${t('proxyDebug.configSaveFailed')}: ${err}`); }
  };

  const handleClearLogs = async () => {
    try {
      await clearProxyTraffic();
      setTraffic([]);
      setDetail(null);
      setSelectedId(null);
      setNextCursor(undefined);
      toast.success(t('proxyDebug.logsCleared'));
    } catch (err) { toast.error(`${t('proxyDebug.clearFailed')}: ${err}`); }
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
    } catch (err) { toast.error(`${t('proxyDebug.openInVSCodeFailed')}: ${err}`); }
  };

  return (
    <div className="space-y-6">
      {/* --- HEADER --- */}
      <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-5 dark:border-[#3a3a3c] dark:bg-[#272729]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-[17px] font-semibold tracking-[-0.374px] text-[#1d1d1f] dark:text-[#f5f5f7]">
              {t('proxyDebug.runtime')}
            </h3>
            <p className="mt-1 text-[14px] tracking-[-0.224px] text-[#86868b] dark:text-[#a1a1a6]">
              {state?.running
                ? `${t('proxyDebug.runningAt')} ${state.baseUrl || '-'} (${t('proxyDebug.routes')}: ${state.routeCount})`
                : t('proxyDebug.notRunning')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfigDialogOpen(true)}
              title={t('proxyDebug.config')}
              aria-label={t('proxyDebug.config')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#1d1d1f] text-white active:scale-95 dark:bg-[#f5f5f7] dark:text-[#1d1d1f]"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => refreshState()}
              disabled={loadingState}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1d1d1f] px-3 text-[14px] tracking-[-0.224px] text-white active:scale-95 disabled:opacity-50 dark:bg-[#f5f5f7] dark:text-[#1d1d1f]"
            >
              <RotateCw className="h-3.5 w-3.5" />
              {t('proxyDebug.refresh')}
            </button>
            <button
              onClick={handleClearLogs}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-300 px-3 text-[14px] tracking-[-0.224px] text-red-600 active:scale-95 dark:border-red-800 dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('proxyDebug.clearLogs')}
            </button>
            <button
              onClick={handleToggle}
              className="inline-flex h-8 items-center rounded-full bg-[#0066cc] px-5 text-[14px] font-medium tracking-[-0.224px] text-white active:scale-95"
            >
              {state?.enabled ? t('proxyDebug.disable') : t('proxyDebug.enable')}
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-5">
          <Metric title={t('proxyDebug.totalRequests')} value={String(state?.metrics.totalRequests ?? 0)} />
          <Metric title={t('proxyDebug.activeConnections')} value={String(state?.metrics.activeConnections ?? 0)} />
          <Metric title={t('proxyDebug.avgLatency')} value={`${state?.metrics.avgResponseMs ?? 0} ms`} />
        </div>
      </div>

      {/* --- TWO COLUMN --- */}
      <div className="grid min-h-[640px] grid-cols-1 gap-6 xl:grid-cols-[minmax(360px,0.92fr)_minmax(460px,1.08fr)]">
        {/* Traffic List */}
        <TrafficList
          t={t}
          traffic={traffic}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          state={state}
          loadingTraffic={loadingTraffic}
          refreshTraffic={refreshTraffic}
          nextCursor={nextCursor}
        />
        {/* Detail Panel */}
        <DetailPanel
          t={t}
          selectedItem={selectedItem}
          detail={detail}
          openBodyDialog={openBodyDialog}
        />
      </div>

      {/* Body Viewer Dialog */}
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
              <Button size="sm" variant="outline" className="ml-auto" onClick={handleOpenInVSCode}>
                {t('proxyDebug.openInVSCode')}
              </Button>
            </div>
            <TabsContent value="friendly" className="mt-3 flex-1 min-h-0">
              {parsedDialogBody.isJson ? (
                <div className="flex h-full min-h-0 flex-col gap-3">
                  <FriendlyJsonSummary
                    value={parsedDialogBody.jsonValue}
                    labels={{ topLevelKeys: t('proxyDebug.topLevelKeys'), messagesCount: t('proxyDebug.messagesCount'), inputPreview: t('proxyDebug.inputPreview') }}
                  />
                  <pre className="min-h-0 flex-1 overflow-auto rounded-lg border border-[#e0e0e0] bg-[#f5f5f7] p-3 font-mono text-xs whitespace-pre-wrap break-words dark:border-[#3a3a3c] dark:bg-[#1c1c1e]">
                    {parsedDialogBody.prettyText}
                  </pre>
                </div>
              ) : (
                <pre className="min-h-0 flex-1 overflow-auto rounded-lg border border-[#e0e0e0] bg-[#f5f5f7] p-3 font-mono text-xs whitespace-pre-wrap break-words dark:border-[#3a3a3c] dark:bg-[#1c1c1e]">
                  {parsedDialogBody.prettyText}
                </pre>
              )}
            </TabsContent>
            <TabsContent value="raw" className="mt-3 flex-1 min-h-0">
              <pre className="min-h-0 flex-1 overflow-auto rounded-lg border border-[#e0e0e0] bg-[#f5f5f7] p-3 font-mono text-xs whitespace-pre dark:border-[#3a3a3c] dark:bg-[#1c1c1e]">
                {parsedDialogBody.rawText}
              </pre>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('proxyDebug.config')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[14px] text-[#86868b] dark:text-[#a1a1a6]">{t('proxyDebug.codexUpstream')}</label>
              <Input value={codexUpstreamBaseUrl} onChange={(e) => setCodexUpstreamBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] text-[#86868b] dark:text-[#a1a1a6]">{t('proxyDebug.recordMode')}</label>
              <select
                value={recordMode}
                onChange={(e) => setRecordMode(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#e0e0e0] bg-white px-3 text-sm dark:border-[#3a3a3c] dark:bg-[#272729] dark:text-[#f5f5f7]"
              >
                <option value="full">{t('proxyDebug.recordModeFull')}</option>
                <option value="metadata">{t('proxyDebug.recordModeMeta')}</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSaveConfig} className="inline-flex h-8 items-center rounded-full bg-[#0066cc] px-5 text-[14px] font-medium text-white active:scale-95">
                {t('proxyDebug.saveConfig')}
              </button>
              <button onClick={handleClearLogs} className="inline-flex h-8 items-center rounded-lg border border-[#e0e0e0] px-3 text-[14px] text-[#1d1d1f] active:scale-95 dark:border-[#3a3a3c] dark:text-[#f5f5f7]">
                {t('proxyDebug.clearLogs')}
              </button>
              <span className="ml-auto text-[12px] text-[#86868b] dark:text-[#a1a1a6]">
                {t('proxyDebug.logQuota')}: {formatBytes(state?.logMaxBytes ?? 0)}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Sub-components ─── */

function TrafficList({
  t, traffic, selectedId, setSelectedId, state, loadingTraffic, refreshTraffic, nextCursor,
}: {
  t: (k: string) => string;
  traffic: ProxyTrafficItem[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  state: ProxyDebugState | null;
  loadingTraffic: boolean;
  refreshTraffic: (cursor?: string | null) => void;
  nextCursor: string | undefined;
}) {
  return (
    <section className="flex min-h-[560px] flex-col overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white dark:border-[#3a3a3c] dark:bg-[#272729]">
      <div className="flex items-center justify-between border-b border-[#e0e0e0] px-5 py-4 dark:border-[#3a3a3c]">
        <div>
          <h3 className="text-[15px] font-semibold tracking-[-0.374px] text-[#1d1d1f] dark:text-[#f5f5f7]">
            {t('proxyDebug.traffic')}
          </h3>
          <p className="mt-0.5 text-[12px] tracking-[-0.12px] text-[#86868b] dark:text-[#a1a1a6]">
            {state?.running ? state.baseUrl || '-' : t('proxyDebug.notRunning')}
          </p>
        </div>
        <button
          onClick={() => refreshTraffic()}
          disabled={loadingTraffic}
          className="inline-flex h-7 items-center gap-1 rounded-lg bg-[#1d1d1f] px-2.5 text-[12px] text-white active:scale-95 disabled:opacity-50 dark:bg-[#f5f5f7] dark:text-[#1d1d1f]"
        >
          <RotateCw className="h-3 w-3" />
          {t('proxyDebug.refresh')}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {traffic.length === 0 && (
          <div className="flex h-full min-h-[300px] items-center justify-center text-[14px] text-[#86868b] dark:text-[#a1a1a6]">
            {t('proxyDebug.noTraffic')}
          </div>
        )}
        <div className="space-y-1.5">
          {traffic.map((item) => {
            const active = item.id === selectedId;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  'group w-full rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.98]',
                  active
                    ? 'border-2 border-[#0066cc] bg-[#f5f5f7] dark:bg-[#1c1c1e]'
                    : 'border-[#e0e0e0] bg-white hover:bg-[#f5f5f7] dark:border-[#3a3a3c] dark:bg-[#272729] dark:hover:bg-[#1c1c1e]',
                )}
                style={{ contentVisibility: 'auto', containIntrinsicSize: '96px' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#f5f5f7] px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-[#1d1d1f] dark:bg-[#3a3a3c] dark:text-[#f5f5f7]">
                        {item.method}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {item.path}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#86868b] dark:text-[#a1a1a6]">
                      <span>{formatTime(item.timestamp)}</span>
                      <span className="opacity-40">·</span>
                      <span>{item.client}</span>
                      <span className="opacity-40">·</span>
                      <span>{item.durationMs} ms</span>
                    </div>
                    {item.promptPreview && (
                      <div className="line-clamp-2 text-[12px] leading-5 text-[#86868b] dark:text-[#a1a1a6]">
                        {item.promptPreview}
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums',
                    item.status >= 400
                      ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                      : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
                  )}>
                    {item.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {nextCursor && (
        <div className="border-t border-[#e0e0e0] p-3 dark:border-[#3a3a3c]">
          <button
            onClick={() => refreshTraffic(nextCursor)}
            disabled={loadingTraffic}
            className="w-full rounded-full bg-[#0066cc] py-2 text-[14px] text-white active:scale-95 disabled:opacity-50"
          >
            {t('proxyDebug.loadMore')}
          </button>
        </div>
      )}
    </section>
  );
}

function DetailPanel({
  t, selectedItem, detail, openBodyDialog,
}: {
  t: (k: string) => string;
  selectedItem: ProxyTrafficItem | null;
  detail: ProxyTrafficDetail | null;
  openBodyDialog: (title: string, body: string | undefined) => void;
}) {
  return (
    <section className="flex min-h-[560px] flex-col overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white dark:border-[#3a3a3c] dark:bg-[#272729]">
      <div className="flex items-center justify-between border-b border-[#e0e0e0] px-5 py-4 dark:border-[#3a3a3c]">
        <div>
          <h3 className="text-[15px] font-semibold tracking-[-0.374px] text-[#1d1d1f] dark:text-[#f5f5f7]">
            {t('proxyDebug.detail')}
          </h3>
          <p className="mt-0.5 text-[12px] tracking-[-0.12px] text-[#86868b] dark:text-[#a1a1a6]">
            {selectedItem ? `${selectedItem.method} ${selectedItem.path}` : t('proxyDebug.selectOne')}
          </p>
        </div>
        {selectedItem && (
          <span className="rounded-full border border-[#e0e0e0] px-2.5 py-1 text-[11px] text-[#86868b] dark:border-[#3a3a3c] dark:text-[#a1a1a6]">
            {selectedItem.client}
          </span>
        )}
      </div>

      {!selectedItem ? (
        <div className="flex flex-1 items-center justify-center text-[14px] text-[#86868b] dark:text-[#a1a1a6]">
          {t('proxyDebug.selectOne')}
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-auto p-5">
          <div className="grid grid-cols-2 gap-4">
            <Metric title={t('proxyDebug.status')} value={String(selectedItem.status)} />
            <Metric title={t('proxyDebug.duration')} value={`${selectedItem.durationMs} ms`} />
            <Metric title={t('proxyDebug.requestSize')} value={formatBytes(selectedItem.requestBodySize)} />
            <Metric title={t('proxyDebug.responseSize')} value={formatBytes(selectedItem.responseBodySize)} />
          </div>

          <DetailSection title={t('proxyDebug.reduced')}>
            <div className="rounded-lg border border-[#e0e0e0] bg-[#f5f5f7] p-3 text-[14px] leading-6 text-[#1d1d1f] whitespace-pre-wrap break-words dark:border-[#3a3a3c] dark:bg-[#1c1c1e] dark:text-[#f5f5f7]">
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
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b] dark:text-[#a1a1a6]">
        {title}
      </div>
      <div className="mt-1 text-[17px] font-semibold tabular-nums text-[#1d1d1f] dark:text-[#f5f5f7]">
        {value}
      </div>
    </div>
  );
}

function DetailSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b] dark:text-[#a1a1a6]">
          {title}
        </h4>
        {action}
      </div>
      {children}
    </section>
  );
}

function BodyPreview({ title, body, actionLabel, onOpen }: { title: string; body: string | undefined; actionLabel: string; onOpen: () => void }) {
  return (
    <DetailSection
      title={title}
      action={
        <button onClick={onOpen} className="text-[12px] text-[#0066cc] active:scale-95 dark:text-[#2997ff]">
          {actionLabel}
        </button>
      }
    >
      <pre className="max-h-40 overflow-auto rounded-lg border border-[#e0e0e0] bg-[#f5f5f7] p-3 font-mono text-xs leading-5 text-[#1d1d1f] whitespace-pre-wrap break-words dark:border-[#3a3a3c] dark:bg-[#1c1c1e] dark:text-[#f5f5f7]">
        {body || '-'}
      </pre>
    </DetailSection>
  );
}

function FriendlyJsonSummary({ value, labels }: { value: unknown; labels: { topLevelKeys: string; messagesCount: string; inputPreview: string } }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  const messages = Array.isArray(obj.messages) ? obj.messages : null;
  const input = obj.input;
  return (
    <div className="space-y-1.5">
      <div className="text-[14px] text-[#86868b] dark:text-[#a1a1a6]">
        {labels.topLevelKeys}: <span className="text-[#1d1d1f] dark:text-[#f5f5f7]">{keys.join(', ') || '-'}</span>
      </div>
      {messages && (
        <div className="text-[14px] text-[#86868b] dark:text-[#a1a1a6]">
          {labels.messagesCount}: <span className="text-[#1d1d1f] dark:text-[#f5f5f7]">{messages.length}</span>
        </div>
      )}
      {typeof input === 'string' && (
        <div className="text-[14px] text-[#86868b] dark:text-[#a1a1a6] line-clamp-2">
          {labels.inputPreview}: <span className="text-[#1d1d1f] dark:text-[#f5f5f7]">{input}</span>
        </div>
      )}
    </div>
  );
}
