import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { PetBubble } from '@/components/pet-overlay/PetBubble';
import { PetOverlayCat } from '@/components/pet-overlay/PetOverlayCat';
import {
  buildPetDisplayFromConversationMessages,
  buildPetDisplayFromEvents,
  buildPetNotifications,
  type PetNotificationSourceSession,
} from '@/lib/petNotifications';
import type {
  ConversationMessageData,
  HistorySessionItem,
} from '@/features/conversations/types';
import { fetchHistorySessions } from '@/features/conversations/historyData';
import type {
  NativeSessionSummary,
  PetNotificationReadState,
  ReplayBatch,
} from '@/lib/tauri-ipc';
import type { PetNotificationItem, PetOpenSessionRequest } from '@/types/pet';

const REFRESH_INTERVAL_MS = 10000;
const PET_EVENT_PREVIEW_LIMIT = 120;
const PET_OVERLAY_WINDOW_PADDING = 10;
const CODEX_HISTORY_RECENCY_MS = 60 * 60 * 1000;
const CODEX_HISTORY_SCAN_LIMIT = 8;

interface PetDisplayCacheEntry {
  signature: string;
  title: string | null;
  latestModelOutput: string | null;
}

function readIdsFromState(state: PetNotificationReadState): Set<string> {
  return new Set(state.readNotificationIds || []);
}

function optimisticallyMarkNotificationRead(
  current: ReadonlySet<string>,
  notificationId: string,
): Set<string> {
  const next = new Set(current);
  next.add(notificationId);
  return next;
}

function revertOptimisticNotificationRead(
  current: ReadonlySet<string>,
  notificationId: string,
): Set<string> {
  const next = new Set(current);
  next.delete(notificationId);
  return next;
}

function timestampToIso(timestamp: number): string {
  const parsed = Number(timestamp);
  return Number.isFinite(parsed) && parsed > 0
    ? new Date(parsed).toISOString()
    : new Date().toISOString();
}

function isRecentCodexHistorySession(session: HistorySessionItem): boolean {
  const parsed = Number(session.timestamp);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return false;
  }
  return Date.now() - parsed <= CODEX_HISTORY_RECENCY_MS;
}

async function hydrateNativeSessionDisplay(
  session: NativeSessionSummary,
  displayCache: Map<string, PetDisplayCacheEntry>,
): Promise<PetNotificationSourceSession> {
  const cacheKey = `native:${session.runtime_id}`;
  const signature = `${session.updated_at || session.created_at}:${session.last_event_seq ?? 'none'}:${session.status}`;
  const cached = displayCache.get(cacheKey);
  if (cached?.signature === signature) {
    return {
      ...session,
      title: cached.title,
      latestModelOutput: cached.latestModelOutput,
    };
  }

  try {
    const batch = await invoke<ReplayBatch>('get_native_session_events', {
      runtimeId: session.runtime_id,
      sinceSeq: null,
      limit: PET_EVENT_PREVIEW_LIMIT,
    });
    const display = buildPetDisplayFromEvents(batch.events);
    displayCache.set(cacheKey, {
      signature,
      title: display.title,
      latestModelOutput: display.latestModelOutput,
    });
    return {
      ...session,
      title: display.title,
      latestModelOutput: display.latestModelOutput,
    };
  } catch (error) {
    console.debug('Desktop pet event preview skipped:', error);
    return session;
  }
}

async function hydrateCodexHistorySession(
  session: HistorySessionItem,
  displayCache: Map<string, PetDisplayCacheEntry>,
): Promise<PetNotificationSourceSession> {
  const updatedAt = timestampToIso(session.timestamp);
  const cacheKey = `codex-history:${session.id}`;
  const signature = `${session.timestamp}:${session.display || ''}`;
  const cached = displayCache.get(cacheKey);
  if (cached?.signature === signature) {
    return {
      id: session.id,
      client: 'codex',
      workingDir: session.project || session.projectName || '',
      startedAt: updatedAt,
      updatedAt,
      status: cached.latestModelOutput ? 'stopped' : 'running',
      title: session.display || cached.title,
      latestModelOutput: cached.latestModelOutput,
    };
  }

  try {
    const messages = await invoke<ConversationMessageData[]>('get_conversation_messages', {
      sessionId: session.id,
      source: 'codex',
    });
    const display = buildPetDisplayFromConversationMessages(messages);
    displayCache.set(cacheKey, {
      signature,
      title: display.title,
      latestModelOutput: display.latestModelOutput,
    });
    return {
      id: session.id,
      client: 'codex',
      workingDir: session.project || session.projectName || '',
      startedAt: updatedAt,
      updatedAt,
      status: display.latestModelOutput ? 'stopped' : 'running',
      title: session.display || display.title,
      latestModelOutput: display.latestModelOutput,
    };
  } catch (error) {
    console.debug('Desktop pet Codex history preview skipped:', error);
    return {
      id: session.id,
      client: 'codex',
      workingDir: session.project || session.projectName || '',
      startedAt: updatedAt,
      updatedAt,
      status: 'running',
      title: session.display,
      latestModelOutput: null,
    };
  }
}

async function hydrateCodexHistorySessions(
  sessions: HistorySessionItem[],
  nativeCodexProviderSessionIds: ReadonlySet<string>,
  displayCache: Map<string, PetDisplayCacheEntry>,
): Promise<PetNotificationSourceSession[]> {
  const recentSessions = sessions
    .filter((session) => session.source === 'codex')
    .filter(isRecentCodexHistorySession)
    .filter((session) => !nativeCodexProviderSessionIds.has(session.id))
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, CODEX_HISTORY_SCAN_LIMIT);

  return Promise.all(recentSessions.map((session) => hydrateCodexHistorySession(session, displayCache)));
}

export function PetOverlay() {
  const [sessions, setSessions] = useState<PetNotificationSourceSession[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const refreshTimerRef = useRef<number | null>(null);
  const petOverlayContentRef = useRef<HTMLDivElement | null>(null);
  const lastPetWindowSizeRef = useRef<{ width: number; height: number } | null>(null);
  const petWindowMovedRef = useRef(false);
  const displayCacheRef = useRef<Map<string, PetDisplayCacheEntry>>(new Map());
  const refreshInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true;
      return;
    }

    refreshInFlightRef.current = true;
    try {
      do {
        refreshQueuedRef.current = false;
        try {
          const [nativeSessions, interactiveSessions, readState] = await Promise.all([
            invoke<NativeSessionSummary[]>('list_native_sessions'),
            invoke<PetNotificationSourceSession[]>('list_interactive_sessions'),
            invoke<PetNotificationReadState>('get_pet_notification_read_state'),
          ]);
          const codexHistory = await fetchHistorySessions('codex').catch((error) => {
            console.debug('Desktop pet Codex history skipped:', error);
            return [];
          });
          const hydratedNativeSessions = await Promise.all(
            nativeSessions.map((session) => hydrateNativeSessionDisplay(session, displayCacheRef.current)),
          );
          const nativeCodexProviderSessionIds = new Set(
            nativeSessions
              .filter((session) => session.provider === 'codex')
              .map((session) => session.provider_session_id)
              .filter((id): id is string => !!id),
          );
          const hydratedCodexHistorySessions = await hydrateCodexHistorySessions(
            codexHistory,
            nativeCodexProviderSessionIds,
            displayCacheRef.current,
          );
          setSessions([...hydratedNativeSessions, ...interactiveSessions, ...hydratedCodexHistorySessions]);
          setReadIds(readIdsFromState(readState));
        } catch (error) {
          console.debug('Desktop pet refresh skipped:', error);
        }
      } while (refreshQueuedRef.current);
    } finally {
      refreshInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    refreshTimerRef.current = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearInterval(refreshTimerRef.current);
      }
    };
  }, [refresh]);

  useEffect(() => {
    const unlisteners: Array<() => void> = [];
    let cancelled = false;

    const setup = async () => {
      const eventNames = [
        'native-session-updated',
        'session-updated',
        'task-completed',
        'task-error',
        'session-interrupted',
        'pet-notification-read-state-updated',
      ];

      for (const eventName of eventNames) {
        const unlisten = await listen(eventName, () => {
          void refresh();
        });
        if (cancelled) {
          unlisten();
        } else {
          unlisteners.push(unlisten);
        }
      }
    };

    void setup();

    return () => {
      cancelled = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [refresh]);

  const notifications = useMemo(
    () => buildPetNotifications(sessions, readIds),
    [readIds, sessions],
  );
  const hasNotifications = notifications.length > 0;

  useEffect(() => {
    void invoke('set_pet_window_content_visible', { visible: hasNotifications }).catch((error) => {
      console.debug('Desktop pet visibility skipped:', error);
    });
  }, [hasNotifications]);

  const syncPetWindowSize = useCallback(() => {
    if (!hasNotifications) {
      return;
    }

    const content = petOverlayContentRef.current;
    if (!content) {
      return;
    }

    const rect = content.getBoundingClientRect();
    const width = Math.ceil(rect.width + PET_OVERLAY_WINDOW_PADDING * 2);
    const height = Math.ceil(rect.height + PET_OVERLAY_WINDOW_PADDING * 2);
    const lastSize = lastPetWindowSizeRef.current;

    if (lastSize && lastSize.width === width && lastSize.height === height) {
      return;
    }

    lastPetWindowSizeRef.current = { width, height };
    void invoke('resize_pet_window', {
      width,
      height,
      preservePosition: petWindowMovedRef.current,
    }).catch((error) => {
      console.debug('Desktop pet resize skipped:', error);
    });
  }, [hasNotifications]);

  useEffect(() => {
    const content = petOverlayContentRef.current;
    if (!content) {
      return;
    }

    syncPetWindowSize();
    const observer = new ResizeObserver(() => {
      syncPetWindowSize();
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [hasNotifications, notifications.length, syncPetWindowSize]);

  const markPetWindowMoved = useCallback(() => {
    petWindowMovedRef.current = true;
  }, []);

  const openNotification = useCallback(async (item: PetNotificationItem) => {
    if (item.markReadOnOpen) {
      setReadIds((current) => optimisticallyMarkNotificationRead(current, item.id));
    }

    const request: PetOpenSessionRequest = {
      notificationId: item.id,
      runtimeId: item.runtimeId,
      providerSessionId: item.providerSessionId,
      provider: item.provider,
      status: item.status,
      markRead: item.markReadOnOpen,
    };

    try {
      await invoke('open_pet_notification', { request });
      await refresh();
    } catch (error) {
      if (item.markReadOnOpen) {
        setReadIds((current) => revertOptimisticNotificationRead(current, item.id));
      }
      console.debug('Desktop pet open skipped:', error);
    }
  }, [refresh]);

  const dismissNotification = useCallback(async (item: PetNotificationItem) => {
    try {
      const readState = await invoke<PetNotificationReadState>('mark_pet_notification_read', {
        notificationId: item.id,
      });
      setReadIds(readIdsFromState(readState));
      await refresh();
    } catch (error) {
      console.debug('Desktop pet dismiss skipped:', error);
    }
  }, [refresh]);

  return (
    <main className="pointer-events-none h-screen w-screen bg-transparent">
      {hasNotifications ? (
        <div
          ref={petOverlayContentRef}
          data-pet-overlay-content
          className="absolute bottom-2 right-2 flex items-end gap-0"
        >
          <div className="relative z-10 flex h-[136px] flex-col gap-1 pb-5">
            {notifications.map((item) => (
              <PetBubble
                key={item.id}
                item={item}
                onDismiss={dismissNotification}
                onOpen={openNotification}
              />
            ))}
          </div>
          <PetOverlayCat
            notification={notifications[0] ?? null}
            onDragStart={markPetWindowMoved}
          />
        </div>
      ) : null}
    </main>
  );
}
