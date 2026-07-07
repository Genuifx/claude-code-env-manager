import {
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as openExternalUrl } from '@tauri-apps/plugin-shell';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe,
  LoaderCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import type { BrowserInfo } from '@/lib/tauri-ipc';
import { CCEM_ZOOM_CHANGE_EVENT, CCEM_ZOOM_STORAGE_KEY } from '@/hooks/useZoom';
import { buildNativeBrowserBounds, normalizeBrowserBoundsZoom } from './browserPanelGeometry';

interface BrowserPanelProps {
  sessionId: string;
  defaultUrl?: string | null;
  className?: string;
  style?: CSSProperties;
  onResizeStart?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onClose: () => void;
}

function readCurrentAppZoom(): number {
  try {
    const raw = window.localStorage.getItem(CCEM_ZOOM_STORAGE_KEY);
    return normalizeBrowserBoundsZoom(raw ?? 1);
  } catch {
    return 1;
  }
}

function normalizeBrowserInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (/^[a-z][a-z\d+\-.]*:/i.test(trimmed)) {
    return trimmed;
  }

  if (/^(localhost|\d{1,3}(?:\.\d{1,3}){3})(:\d+)?(\/|$)/i.test(trimmed) || trimmed.includes('.')) {
    return `https://${trimmed}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

function BrowserToolButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function BrowserPanel({
  sessionId,
  defaultUrl = null,
  className,
  style,
  onResizeStart,
  onClose,
}: BrowserPanelProps) {
  const { t } = useLocale();
  const frameRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const syncFrameRef = useRef<number | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(defaultUrl ?? null);
  const [urlInput, setUrlInput] = useState(defaultUrl ?? '');
  const [isUrlEditing, setIsUrlEditing] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyBrowserInfo = useCallback((info: BrowserInfo, fallbackUrl?: string | null) => {
    const nextUrl = info.url ?? fallbackUrl ?? null;
    setCurrentUrl(nextUrl);
    setUrlInput(nextUrl ?? '');
    setTitle(info.title ?? null);
    setCanGoBack(Boolean(info.can_go_back));
    setCanGoForward(Boolean(info.can_go_forward));
    return nextUrl;
  }, []);

  const syncBounds = useCallback(() => {
    if (syncFrameRef.current !== null) {
      cancelAnimationFrame(syncFrameRef.current);
    }

    syncFrameRef.current = requestAnimationFrame(() => {
      syncFrameRef.current = null;
      const frame = frameRef.current;
      if (!frame) {
        return;
      }
      const rect = frame.getBoundingClientRect();
      const bounds = buildNativeBrowserBounds(rect, readCurrentAppZoom());
      void invoke('browser_set_bounds', { sessionId, ...bounds }).catch((boundsError) => {
        console.error('Failed to sync browser bounds:', boundsError);
      });
    });
  }, [sessionId]);

  const refreshInfo = useCallback(async () => {
    const info = await invoke<BrowserInfo>('browser_info', { sessionId });
    applyBrowserInfo(info);
    return info;
  }, [applyBrowserInfo, sessionId]);

  const showBrowserError = useCallback((message: string) => {
    setError(message);
    toast.error(message);
  }, []);

  const openBrowser = useCallback(async (url?: string | null) => {
    setIsBusy(true);
    setError(null);
    try {
      const info = await invoke<BrowserInfo>('browser_open', {
        sessionId,
        url: url || null,
      });
      applyBrowserInfo(info, url ?? null);
      syncBounds();
      window.setTimeout(() => {
        void refreshInfo().catch(() => {});
      }, 700);
    } catch (openError) {
      showBrowserError(String(openError));
    } finally {
      setIsBusy(false);
    }
  }, [applyBrowserInfo, refreshInfo, sessionId, showBrowserError, syncBounds]);

  useEffect(() => {
    void openBrowser(defaultUrl);

    return () => {
      if (syncFrameRef.current !== null) {
        cancelAnimationFrame(syncFrameRef.current);
      }
      void invoke('browser_set_visible', { sessionId, visible: false }).catch(() => {});
    };
  }, [defaultUrl, openBrowser, sessionId]);

  useEffect(() => {
    if (!isUrlEditing) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      urlInputRef.current?.focus();
      urlInputRef.current?.select();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isUrlEditing]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    const observer = new ResizeObserver(syncBounds);
    observer.observe(frame);
    window.addEventListener('resize', syncBounds);
    window.addEventListener(CCEM_ZOOM_CHANGE_EVENT, syncBounds);
    const timeoutId = window.setTimeout(syncBounds, 80);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', syncBounds);
      window.removeEventListener(CCEM_ZOOM_CHANGE_EVENT, syncBounds);
      observer.disconnect();
    };
  }, [syncBounds]);

  const runBrowserCommand = useCallback(async (
    command: 'browser_back' | 'browser_forward' | 'browser_reload',
  ) => {
    setIsBusy(true);
    setError(null);
    try {
      const info = await invoke<BrowserInfo>(command, { sessionId });
      applyBrowserInfo(info, currentUrl);
      window.setTimeout(() => {
        void refreshInfo().catch(() => {});
      }, 260);
    } catch (commandError) {
      showBrowserError(String(commandError));
    } finally {
      setIsBusy(false);
    }
  }, [applyBrowserInfo, currentUrl, refreshInfo, sessionId, showBrowserError]);

  const navigate = useCallback(async (rawValue: string) => {
    const nextUrl = normalizeBrowserInput(rawValue);
    if (!nextUrl) {
      setUrlInput(currentUrl ?? '');
      return;
    }
    const previousUrl = currentUrl;

    setIsBusy(true);
    setError(null);
    setUrlInput(nextUrl);
    setCurrentUrl(nextUrl);
    try {
      const info = await invoke<BrowserInfo>('browser_navigate', { sessionId, url: nextUrl });
      applyBrowserInfo(info, nextUrl);
      setIsUrlEditing(false);
      syncBounds();
      window.setTimeout(() => {
        void refreshInfo().catch(() => {});
      }, 700);
    } catch (navigateError) {
      setCurrentUrl(previousUrl);
      setUrlInput(previousUrl ?? '');
      showBrowserError(String(navigateError));
    } finally {
      setIsBusy(false);
    }
  }, [applyBrowserInfo, currentUrl, refreshInfo, sessionId, showBrowserError, syncBounds]);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void navigate(urlInput);
  }, [navigate, urlInput]);

  const cancelUrlEditing = useCallback(() => {
    setUrlInput(currentUrl ?? '');
    setIsUrlEditing(false);
  }, [currentUrl]);

  const handleStartUrlEditing = useCallback(() => {
    setUrlInput(currentUrl ?? '');
    setIsUrlEditing(true);
  }, [currentUrl]);

  const handleOpenExternal = useCallback(() => {
    if (!currentUrl) {
      return;
    }
    void openExternalUrl(currentUrl).catch((openError) => {
      showBrowserError(String(openError));
    });
  }, [currentUrl, showBrowserError]);

  const displayUrl = currentUrl || title || t('workspace.browserTitle');

  return (
    <aside
      data-ccem-browser-panel="true"
      style={style}
      className={cn(
        'workspace-browser-panel relative flex h-full min-w-0 flex-col overflow-hidden',
        className,
      )}
    >
      <div
        data-ccem-browser-resize-handle="true"
        className="absolute inset-y-0 left-0 z-20 w-1.5 cursor-col-resize touch-none"
        onPointerDown={onResizeStart}
      />

      <div data-ccem-browser-tab-strip="true" className="flex h-10 shrink-0 items-center gap-2 border-b border-border/45 pl-3 pr-2">
        <div className="flex h-7 min-w-0 max-w-[220px] items-center gap-2 rounded-md bg-muted/45 px-2.5 text-xs font-medium text-foreground">
          <Globe className="h-4 w-4" />
          <span className="truncate">{t('workspace.browserTitle')}</span>
        </div>
        <div className="min-w-0 flex-1" />
        {isBusy ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" /> : null}
        <BrowserToolButton
          label={t('workspace.browserClose')}
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </BrowserToolButton>
      </div>

      <div data-ccem-browser-navigation="true" className="flex h-11 shrink-0 items-center gap-1 border-b border-border/45 px-3">
        <BrowserToolButton
          label={t('workspace.browserBack')}
          onClick={() => void runBrowserCommand('browser_back')}
          disabled={isBusy || !canGoBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </BrowserToolButton>
        <BrowserToolButton
          label={t('workspace.browserForward')}
          onClick={() => void runBrowserCommand('browser_forward')}
          disabled={isBusy || !canGoForward}
        >
          <ArrowRight className="h-4 w-4" />
        </BrowserToolButton>
        <BrowserToolButton
          label={t('workspace.browserReload')}
          onClick={() => void runBrowserCommand('browser_reload')}
          disabled={isBusy}
        >
          <RefreshCw className={cn('h-4 w-4', isBusy && 'animate-spin')} />
        </BrowserToolButton>
        <BrowserToolButton
          label={t('workspace.browserOpenExternal')}
          onClick={handleOpenExternal}
          disabled={!currentUrl}
        >
          <ExternalLink className="h-4 w-4" />
        </BrowserToolButton>
        <form className="ml-2 min-w-0 flex-1" onSubmit={handleSubmit}>
          {isUrlEditing ? (
            <Input
              ref={urlInputRef}
              data-ccem-browser-url-input="true"
              aria-label={t('workspace.browserUrl')}
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              onBlur={cancelUrlEditing}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelUrlEditing();
                }
              }}
              className="h-8 min-w-0 rounded-md border-border/60 bg-muted/20 px-2 text-xs shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          ) : (
            <button
              type="button"
              data-ccem-browser-url-display="true"
              aria-label={t('workspace.browserUrl')}
              title={displayUrl}
              className="flex h-8 w-full min-w-0 items-center rounded-md px-2 text-left text-xs text-muted-foreground transition hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={handleStartUrlEditing}
            >
              <span className="truncate">{displayUrl}</span>
            </button>
          )}
        </form>
      </div>

      {error ? (
        <div className="border-b border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1 bg-white">
        <div ref={frameRef} data-ccem-browser-frame="true" className="absolute inset-y-0 right-0 left-1.5" />
      </div>
    </aside>
  );
}
