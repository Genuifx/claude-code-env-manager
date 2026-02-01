import { useEffect, useCallback, useRef } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

/**
 * Generic Tauri event listener hook
 * Automatically manages subscription lifecycle
 */
export function useTauriEvent<T>(
  eventName: string,
  handler: (payload: T) => void,
  deps: React.DependencyList = []
) {
  const handlerRef = useRef(handler);

  // Keep handler ref updated
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let mounted = true;

    const setupListener = async () => {
      try {
        unlisten = await listen<T>(eventName, (event) => {
          if (mounted) {
            handlerRef.current(event.payload);
          }
        });
      } catch (err) {
        console.error(`Failed to listen to event "${eventName}":`, err);
      }
    };

    setupListener();

    return () => {
      mounted = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, [eventName, ...deps]);
}

/**
 * Session update event payload from backend
 */
export interface SessionUpdatePayload {
  id: string;
  pid?: number;
  env_name: string;
  perm_mode: string;
  working_dir: string;
  start_time: string;
  status: string;
}

/**
 * Hook to listen for session-updated events
 */
export function useSessionUpdatedEvent(
  handler: (session: SessionUpdatePayload) => void
) {
  useTauriEvent<SessionUpdatePayload>('session-updated', handler);
}

/**
 * Hook to listen for env-changed events
 */
export function useEnvChangedEvent(
  handler: (envName: string) => void
) {
  useTauriEvent<string>('env-changed', handler);
}

/**
 * Hook to listen for perm-changed events
 */
export function usePermChangedEvent(
  handler: (permMode: string) => void
) {
  useTauriEvent<string>('perm-changed', handler);
}

/**
 * Combined hook for all session-related events
 * Provides a simple interface for components that need to react to session changes
 */
export function useSessionEvents(callbacks: {
  onSessionUpdated?: (session: SessionUpdatePayload) => void;
  onEnvChanged?: (envName: string) => void;
  onPermChanged?: (permMode: string) => void;
}) {
  const { onSessionUpdated, onEnvChanged, onPermChanged } = callbacks;

  const handleSessionUpdated = useCallback(
    (session: SessionUpdatePayload) => {
      onSessionUpdated?.(session);
    },
    [onSessionUpdated]
  );

  const handleEnvChanged = useCallback(
    (envName: string) => {
      onEnvChanged?.(envName);
    },
    [onEnvChanged]
  );

  const handlePermChanged = useCallback(
    (permMode: string) => {
      onPermChanged?.(permMode);
    },
    [onPermChanged]
  );

  useTauriEvent<SessionUpdatePayload>('session-updated', handleSessionUpdated);
  useTauriEvent<string>('env-changed', handleEnvChanged);
  useTauriEvent<string>('perm-changed', handlePermChanged);
}
