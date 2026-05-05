import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { scheduleAfterFirstPaint } from '@/lib/idle';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import type {
  NativeSessionSummary,
  SessionEventRecord,
  UnifiedSessionInfo,
} from '@/lib/tauri-ipc';
import type { HistorySessionItem } from '@/features/conversations/types';
import type { Session } from '@/store';
import { appendSessionEvents } from './workspaceEventTranscript';

export type WorkspaceSessionVisualState = 'identity' | 'processing' | 'attention';
export type WorkspaceAttentionKind = 'input_required' | 'plan_review' | 'permission_required';

export interface WorkspaceSessionDecoration {
  sessionKey: string;
  runtimeId?: string;
  client?: 'claude' | 'codex' | 'opencode';
  envName?: string;
  visualState: WorkspaceSessionVisualState;
  attentionKind?: WorkspaceAttentionKind;
}

type WorkspaceRuntimeDescriptor =
  | {
      kind: 'unified';
      id: string;
      client: 'claude' | 'codex' | 'opencode';
      status: string;
      envName: string;
      projectDir: string;
      createdAt: number;
      historySessionId?: string | null;
    }
  | {
      kind: 'native';
      id: string;
      client: 'claude' | 'codex';
      status: string;
      envName: string;
      projectDir: string;
      createdAt: number;
      providerSessionId?: string | null;
    }
  | {
      kind: 'legacyInteractive';
      id: string;
      client: 'claude' | 'codex' | 'opencode';
      status: Session['status'];
      envName: string;
      projectDir: string;
      createdAt: number;
    };

const POLL_INTERVAL_MS = 3000;
const RUNTIME_HISTORY_FALLBACK_WINDOW_MS = 2 * 60 * 1000;

function toSessionKey(session: Pick<HistorySessionItem, 'id' | 'source'>): string {
  return `${session.source}:${session.id}`;
}

function normalizePath(path: string | undefined): string {
  return (path ?? '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
    .trim()
    .toLowerCase();
}

function basename(path: string | undefined): string {
  const normalized = normalizePath(path);
  if (!normalized) {
    return '';
  }
  const parts = normalized.split('/');
  return parts[parts.length - 1] ?? '';
}

function normalizeRuntimeClient(client?: string | null): 'claude' | 'codex' | 'opencode' {
  if (client === 'codex') {
    return 'codex';
  }
  if (client === 'opencode') {
    return 'opencode';
  }
  return 'claude';
}

function toUnifiedRuntime(runtime: UnifiedSessionInfo): WorkspaceRuntimeDescriptor {
  return {
    kind: 'unified',
    id: runtime.id,
    client: normalizeRuntimeClient(runtime.client),
    status: runtime.status,
    envName: runtime.env_name,
    projectDir: runtime.project_dir,
    createdAt: new Date(runtime.created_at).getTime(),
    historySessionId: runtime.claude_session_id,
  };
}

function toLegacyInteractiveRuntime(session: Session): WorkspaceRuntimeDescriptor {
  return {
    kind: 'legacyInteractive',
    id: session.id,
    client: session.client,
    status: session.status,
    envName: session.envName,
    projectDir: session.workingDir,
    createdAt: session.startedAt.getTime(),
  };
}

function toNativeRuntime(session: NativeSessionSummary): WorkspaceRuntimeDescriptor {
  return {
    kind: 'native',
    id: session.runtime_id,
    client: session.provider,
    status: session.status,
    envName: session.env_name,
    projectDir: session.project_dir,
    createdAt: new Date(session.created_at).getTime(),
    providerSessionId: session.provider_session_id,
  };
}

function isUnifiedRuntime(runtime: WorkspaceRuntimeDescriptor): runtime is Extract<
  WorkspaceRuntimeDescriptor,
  { kind: 'unified' }
> {
  return runtime.kind === 'unified';
}

function runtimeClient(runtime: WorkspaceRuntimeDescriptor): 'claude' | 'codex' | 'opencode' {
  return runtime.client;
}

function isRuntimeTerminalStatus(status: string): boolean {
  return status === 'stopped' || status === 'completed' || status === 'error';
}

function isRuntimeProcessing(
  runtime: WorkspaceRuntimeDescriptor,
  attentionKind?: WorkspaceAttentionKind
) {
  if (attentionKind) {
    return false;
  }
  if (runtime.kind === 'legacyInteractive') {
    return runtime.status === 'running';
  }
  if (runtime.kind === 'native') {
    return runtime.status === 'processing' || runtime.status === 'initializing';
  }
  return runtime.status === 'processing' || runtime.status === 'initializing';
}

function runtimeHasProviderIdentity(runtime: WorkspaceRuntimeDescriptor): boolean {
  return (runtime.kind === 'native' && !!runtime.providerSessionId)
    || (runtime.kind === 'unified' && !!runtime.historySessionId);
}

function canUseHistoryFallbackMatch(
  runtime: WorkspaceRuntimeDescriptor,
  session: HistorySessionItem
): boolean {
  if (runtimeHasProviderIdentity(runtime)) {
    return false;
  }

  if (!Number.isFinite(runtime.createdAt) || !Number.isFinite(session.timestamp)) {
    return false;
  }

  return Math.abs(session.timestamp - runtime.createdAt) <= RUNTIME_HISTORY_FALLBACK_WINDOW_MS;
}

function lastEventSeq(events?: SessionEventRecord[]) {
  if (!events?.length) {
    return null;
  }
  return events[events.length - 1]?.seq ?? null;
}

function resolveAttentionKind(events: SessionEventRecord[]): WorkspaceAttentionKind | undefined {
  const pendingPermissions = new Set<string>();
  const pendingResponses = new Map<string, WorkspaceAttentionKind>();
  let terminalPromptPending = false;

  for (const event of events) {
    switch (event.payload.type) {
      case 'permission_required':
        pendingPermissions.add(event.payload.request_id);
        break;
      case 'permission_responded':
        pendingPermissions.delete(event.payload.request_id);
        break;
      case 'terminal_prompt_required':
        terminalPromptPending = true;
        break;
      case 'terminal_prompt_resolved':
        terminalPromptPending = false;
        break;
      case 'tool_use_started':
        if (event.payload.needs_response) {
          pendingResponses.set(
            event.payload.tool_use_id,
            event.payload.prompt?.prompt_type === 'plan_exit'
              ? 'plan_review'
              : 'input_required'
          );
        }
        break;
      case 'tool_use_completed': {
        const pendingKind = pendingResponses.get(event.payload.tool_use_id);
        if (!(pendingKind === 'plan_review' && !event.payload.success)) {
          pendingResponses.delete(event.payload.tool_use_id);
        }
        break;
      }
      case 'user_prompt':
        pendingResponses.clear();
        break;
      case 'session_completed':
        pendingPermissions.clear();
        pendingResponses.clear();
        terminalPromptPending = false;
        break;
      default:
        break;
    }
  }

  if (pendingPermissions.size > 0 || terminalPromptPending) {
    return 'permission_required';
  }

  const pendingValues = Array.from(pendingResponses.values());
  if (pendingValues.includes('plan_review')) {
    return 'plan_review';
  }
  if (pendingValues.includes('input_required')) {
    return 'input_required';
  }

  return undefined;
}

function buildRuntimeMatchMap(
  historySessions: HistorySessionItem[],
  runtimes: WorkspaceRuntimeDescriptor[]
) {
  const matchedByKey = new Map<string, WorkspaceRuntimeDescriptor>();
  const usedRuntimeIds = new Set<string>();

  const historyByTimestamp = [...historySessions].sort((left, right) => right.timestamp - left.timestamp);
  const runtimesByRecency = [...runtimes].sort(
    (left, right) => right.createdAt - left.createdAt
  );

  for (const session of historyByTimestamp) {
    const directMatch = runtimesByRecency.find((runtime) =>
      !usedRuntimeIds.has(runtime.id)
      && runtime.client === session.source
      && (
        (runtime.kind === 'unified' && runtime.historySessionId === session.id)
        || (runtime.kind === 'native' && runtime.providerSessionId === session.id)
      )
    );

    if (directMatch) {
      matchedByKey.set(toSessionKey(session), directMatch);
      usedRuntimeIds.add(directMatch.id);
    }
  }

  for (const runtime of runtimesByRecency) {
    if (usedRuntimeIds.has(runtime.id)) {
      continue;
    }
    if (runtimeHasProviderIdentity(runtime)) {
      continue;
    }

    const client = runtimeClient(runtime);
    const projectDir = normalizePath(runtime.projectDir);
    const projectDirBase = basename(runtime.projectDir);
    const candidate = historyByTimestamp.find((session) => {
      if (matchedByKey.has(toSessionKey(session))) {
        return false;
      }
      if (session.source !== client) {
        return false;
      }
      if (session.envName && session.envName !== runtime.envName) {
        return false;
      }
      if (!canUseHistoryFallbackMatch(runtime, session)) {
        return false;
      }

      const historyProject = normalizePath(session.project);
      if (historyProject && projectDir) {
        return historyProject === projectDir;
      }

      return basename(session.projectName) === projectDirBase;
    });

    if (candidate) {
      matchedByKey.set(toSessionKey(candidate), runtime);
      usedRuntimeIds.add(runtime.id);
    }
  }

  return matchedByKey;
}

interface UseWorkspaceSessionDecorationsOptions {
  sessions: HistorySessionItem[];
  isActive?: boolean;
}

export function useWorkspaceSessionDecorations({
  sessions,
  isActive = true,
}: UseWorkspaceSessionDecorationsOptions) {
  const {
    listUnifiedSessions,
    getSessionEvents,
    listInteractiveSessions,
    listNativeSessions,
    getNativeSessionEvents,
  } = useTauriCommands();
  const [unifiedSessions, setUnifiedSessions] = useState<UnifiedSessionInfo[]>([]);
  const [nativeSessions, setNativeSessions] = useState<NativeSessionSummary[]>([]);
  const [legacyInteractiveSessions, setLegacyInteractiveSessions] = useState<Session[]>([]);
  const [eventsByRuntime, setEventsByRuntime] = useState<Record<string, SessionEventRecord[]>>({});
  const eventsByRuntimeRef = useRef<Record<string, SessionEventRecord[]>>({});

  useEffect(() => {
    eventsByRuntimeRef.current = eventsByRuntime;
  }, [eventsByRuntime]);

  const refreshRuntimeSources = useCallback(async () => {
    const [nextUnifiedSessions, nextInteractiveSessions, nextNativeSessions] = await Promise.all([
      listUnifiedSessions(),
      listInteractiveSessions(),
      listNativeSessions(),
    ]);
    const unifiedRuntimeIds = new Set(nextUnifiedSessions.map((runtime) => runtime.id));
    const nextLegacyInteractiveSessions = nextInteractiveSessions.filter((session) =>
      !unifiedRuntimeIds.has(session.id)
      && session.terminalType !== 'embedded'
      && session.status === 'running'
    );

    setUnifiedSessions(nextUnifiedSessions);
    setNativeSessions(nextNativeSessions);
    setLegacyInteractiveSessions(nextLegacyInteractiveSessions);

    return {
      unifiedSessions: nextUnifiedSessions,
      nativeSessions: nextNativeSessions,
      legacyInteractiveSessions: nextLegacyInteractiveSessions,
    };
  }, [listInteractiveSessions, listNativeSessions, listUnifiedSessions]);

  const refreshRuntimeEvents = useCallback(async (
    nextUnifiedSessions: UnifiedSessionInfo[],
    nextNativeSessions: NativeSessionSummary[],
  ) => {
    const activeUnifiedSessions = nextUnifiedSessions.filter(
      (runtime) => !isRuntimeTerminalStatus(runtime.status),
    );
    const activeNativeSessions = nextNativeSessions.filter(
      (runtime) => !isRuntimeTerminalStatus(runtime.status),
    );

    await Promise.all(
      activeUnifiedSessions.map(async (runtime) => {
        try {
          const sinceSeq = lastEventSeq(eventsByRuntimeRef.current[runtime.id]);
          const batch = await getSessionEvents(runtime.id, sinceSeq);
          setEventsByRuntime((current) => {
            const previous = sinceSeq && !batch.gap_detected ? current[runtime.id] ?? [] : [];
            const next = appendSessionEvents(previous, batch.events, batch.gap_detected);
            if (previous === next) {
              return current;
            }
            return {
              ...current,
              [runtime.id]: next,
            };
          });
        } catch (error) {
          console.error(`Failed to refresh workspace events for runtime ${runtime.id}:`, error);
        }
      }),
    );

    await Promise.all(
      activeNativeSessions.map(async (runtime) => {
        try {
          const sinceSeq = lastEventSeq(eventsByRuntimeRef.current[runtime.runtime_id]);
          const batch = await getNativeSessionEvents(runtime.runtime_id, sinceSeq);
          setEventsByRuntime((current) => {
            const previous = sinceSeq && !batch.gap_detected
              ? current[runtime.runtime_id] ?? []
              : [];
            const next = appendSessionEvents(previous, batch.events, batch.gap_detected);
            if (previous === next) {
              return current;
            }
            return {
              ...current,
              [runtime.runtime_id]: next,
            };
          });
        } catch (error) {
          console.error(
            `Failed to refresh workspace events for native runtime ${runtime.runtime_id}:`,
            error,
          );
        }
      }),
    );

    const activeIds = new Set([
      ...activeUnifiedSessions.map((runtime) => runtime.id),
      ...activeNativeSessions.map((runtime) => runtime.runtime_id),
    ]);
    setEventsByRuntime((current) => {
      const nextEntries = Object.entries(current).filter(([runtimeId]) => activeIds.has(runtimeId));
      if (nextEntries.length === Object.keys(current).length) {
        return current;
      }
      return Object.fromEntries(nextEntries);
    });
  }, [getNativeSessionEvents, getSessionEvents]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let cancelled = false;
    const tick = async () => {
      try {
        const nextSessions = await refreshRuntimeSources();
        if (!cancelled) {
          await refreshRuntimeEvents(
            nextSessions.unifiedSessions,
            nextSessions.nativeSessions,
          );
        }
      } catch (error) {
        console.error('Failed to refresh workspace session decorations:', error);
      }
    };

    const cancelDeferred = scheduleAfterFirstPaint(() => {
      void tick();
    }, { delayMs: 180, timeoutMs: 1200 });

    const intervalId = window.setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      cancelDeferred();
      window.clearInterval(intervalId);
    };
  }, [isActive, refreshRuntimeEvents, refreshRuntimeSources]);

  const runtimeDescriptors = useMemo(
    () => [
      ...unifiedSessions.map(toUnifiedRuntime),
      ...nativeSessions.map(toNativeRuntime),
      ...legacyInteractiveSessions.map(toLegacyInteractiveRuntime),
    ],
    [legacyInteractiveSessions, nativeSessions, unifiedSessions]
  );

  const matchedRuntimeBySessionKey = useMemo(
    () => buildRuntimeMatchMap(sessions, runtimeDescriptors),
    [runtimeDescriptors, sessions]
  );

  const decorationsBySessionKey = useMemo(() => {
    const result: Record<string, WorkspaceSessionDecoration> = {};

    for (const session of sessions) {
      const sessionKey = toSessionKey(session);
      const runtime = matchedRuntimeBySessionKey.get(sessionKey);
      if (!runtime) {
        continue;
      }

      const attentionKind = isUnifiedRuntime(runtime)
        ? resolveAttentionKind(eventsByRuntime[runtime.id] ?? [])
        : undefined;
      result[sessionKey] = {
        sessionKey,
        runtimeId: runtime.id,
        client: runtimeClient(runtime),
        envName: runtime.envName,
        visualState: attentionKind
          ? 'attention'
          : isRuntimeProcessing(runtime, attentionKind)
            ? 'processing'
            : 'identity',
        attentionKind,
      };
    }

    return result;
  }, [eventsByRuntime, matchedRuntimeBySessionKey, sessions]);

  return {
    decorationsBySessionKey,
  };
}
