import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { PetBubble } from '@/components/pet-overlay/PetBubble';
import { PetOverlayCat } from '@/components/pet-overlay/PetOverlayCat';
import {
  buildPetDisplayFromEvents,
  buildPetNotifications,
  type PetNotificationSourceSession,
} from '@/lib/petNotifications';
import type {
  NativeSessionSummary,
  PetNotificationReadState,
  ReplayBatch,
} from '@/lib/tauri-ipc';
import type { PetNotificationItem, PetOpenSessionRequest } from '@/types/pet';

const REFRESH_INTERVAL_MS = 2500;
const PET_EVENT_PREVIEW_LIMIT = 120;
const PET_OVERLAY_WINDOW_PADDING = 16;

function readIdsFromState(state: PetNotificationReadState): Set<string> {
  return new Set(state.readNotificationIds || []);
}

async function hydrateNativeSessionDisplay(
  session: NativeSessionSummary,
): Promise<PetNotificationSourceSession> {
  try {
    const batch = await invoke<ReplayBatch>('get_native_session_events', {
      runtimeId: session.runtime_id,
      sinceSeq: null,
      limit: PET_EVENT_PREVIEW_LIMIT,
    });
    const display = buildPetDisplayFromEvents(batch.events);
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

export function PetOverlay() {
  const [sessions, setSessions] = useState<PetNotificationSourceSession[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const refreshTimerRef = useRef<number | null>(null);
  const petOverlayContentRef = useRef<HTMLDivElement | null>(null);
  const lastPetWindowSizeRef = useRef<{ width: number; height: number } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nativeSessions, interactiveSessions, readState] = await Promise.all([
        invoke<NativeSessionSummary[]>('list_native_sessions'),
        invoke<PetNotificationSourceSession[]>('list_interactive_sessions'),
        invoke<PetNotificationReadState>('get_pet_notification_read_state'),
      ]);
      const hydratedNativeSessions = await Promise.all(
        nativeSessions.map((session) => hydrateNativeSessionDisplay(session)),
      );
      setSessions([...hydratedNativeSessions, ...interactiveSessions]);
      setReadIds(readIdsFromState(readState));
    } catch (error) {
      console.debug('Desktop pet refresh skipped:', error);
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

  const syncPetWindowSize = useCallback(() => {
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
    void invoke('resize_pet_window', { width, height }).catch((error) => {
      console.debug('Desktop pet resize skipped:', error);
    });
  }, []);

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
  }, [notifications.length, syncPetWindowSize]);

  const openNotification = useCallback(async (item: PetNotificationItem) => {
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
      console.debug('Desktop pet open skipped:', error);
    }
  }, [refresh]);

  return (
    <main className="pointer-events-none h-screen w-screen overflow-hidden bg-transparent">
      <div
        ref={petOverlayContentRef}
        data-pet-overlay-content
        className="absolute bottom-4 right-4 flex items-end gap-3"
      >
        <div className="flex max-h-[318px] flex-col-reverse gap-2 overflow-hidden pb-2">
          {notifications.map((item) => (
            <PetBubble key={item.id} item={item} onOpen={openNotification} />
          ))}
        </div>
        <PetOverlayCat />
      </div>
    </main>
  );
}
