import type {
  ConversationMessageData,
} from '@/features/conversations/types';
import type { NativeSessionSummary } from '@/lib/tauri-ipc';

export interface WorkspaceLiveSessionEntry {
  session: NativeSessionSummary;
  initialPrompt: string | null;
  seedMessages: ConversationMessageData[];
}

export type WorkspaceLiveSessionsByRuntimeId = Record<string, WorkspaceLiveSessionEntry>;

type MutableSnapshotRef<T> = {
  current: T;
};

export function areNativeSessionSummariesEqual(
  previous: NativeSessionSummary,
  next: NativeSessionSummary,
) {
  return previous.runtime_id === next.runtime_id
    && previous.provider === next.provider
    && previous.transport === next.transport
    && previous.provider_session_id === next.provider_session_id
    && previous.project_dir === next.project_dir
    && previous.env_name === next.env_name
    && previous.perm_mode === next.perm_mode
    && previous.runtime_perm_mode === next.runtime_perm_mode
    && previous.effort === next.effort
    && previous.status === next.status
    && previous.created_at === next.created_at
    && previous.updated_at === next.updated_at
    && previous.is_active === next.is_active
    && previous.last_event_seq === next.last_event_seq
    && previous.can_handoff_to_terminal === next.can_handoff_to_terminal
    && previous.last_error === next.last_error;
}

export function upsertWorkspaceLiveSessionEntry(
  previous: WorkspaceLiveSessionsByRuntimeId,
  session: NativeSessionSummary,
  options: {
    initialPrompt?: string | null;
    seedMessages?: ConversationMessageData[];
  } = {},
): WorkspaceLiveSessionsByRuntimeId {
  const existing = previous[session.runtime_id];
  const nextInitialPrompt = options.initialPrompt ?? existing?.initialPrompt ?? null;
  const nextSeedMessages = options.seedMessages ?? existing?.seedMessages ?? [];

  if (
    existing
    && existing.initialPrompt === nextInitialPrompt
    && existing.seedMessages === nextSeedMessages
    && areNativeSessionSummariesEqual(existing.session, session)
  ) {
    return previous;
  }

  return {
    ...previous,
    [session.runtime_id]: {
      session,
      initialPrompt: nextInitialPrompt,
      seedMessages: nextSeedMessages,
    },
  };
}

export function replaceWorkspaceLiveSessionsSnapshot(
  liveSessionsRef: MutableSnapshotRef<WorkspaceLiveSessionsByRuntimeId>,
  setLiveSessions: (next: WorkspaceLiveSessionsByRuntimeId) => void,
  next: WorkspaceLiveSessionsByRuntimeId,
) {
  liveSessionsRef.current = next;
  setLiveSessions(next);
  return next;
}

export function updateWorkspaceLiveSessionsSnapshot(
  liveSessionsRef: MutableSnapshotRef<WorkspaceLiveSessionsByRuntimeId>,
  setLiveSessions: (next: WorkspaceLiveSessionsByRuntimeId) => void,
  updater: (previous: WorkspaceLiveSessionsByRuntimeId) => WorkspaceLiveSessionsByRuntimeId,
) {
  return replaceWorkspaceLiveSessionsSnapshot(
    liveSessionsRef,
    setLiveSessions,
    updater(liveSessionsRef.current),
  );
}
