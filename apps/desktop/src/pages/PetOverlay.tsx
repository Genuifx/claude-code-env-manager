import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import catImage from '@/assets/pet/golden-cat.png';
import { PetBubble } from '@/components/pet-overlay/PetBubble';
import { buildPetNotifications } from '@/lib/petNotifications';
import type { NativeSessionSummary, PetNotificationReadState } from '@/lib/tauri-ipc';
import type { PetNotificationItem, PetOpenSessionRequest } from '@/types/pet';

const REFRESH_INTERVAL_MS = 2500;

function readIdsFromState(state: PetNotificationReadState): Set<string> {
  return new Set(state.readNotificationIds || []);
}

export function PetOverlay() {
  const [sessions, setSessions] = useState<NativeSessionSummary[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const refreshTimerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextSessions, readState] = await Promise.all([
        invoke<NativeSessionSummary[]>('list_native_sessions'),
        invoke<PetNotificationReadState>('get_pet_notification_read_state'),
      ]);
      setSessions(nextSessions);
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
      <div className="absolute bottom-4 right-4 flex items-end gap-3">
        <div className="flex max-h-[318px] flex-col-reverse gap-2 overflow-hidden pb-2">
          {notifications.map((item) => (
            <PetBubble key={item.id} item={item} onOpen={openNotification} />
          ))}
        </div>
        <img
          src={catImage}
          alt=""
          draggable={false}
          className="pointer-events-auto h-[112px] w-[112px] object-contain drop-shadow-[0_14px_24px_rgba(84,52,23,0.28)]"
        />
      </div>
    </main>
  );
}
