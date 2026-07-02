import { invoke } from '@tauri-apps/api/core';
import type {
  ConversationDetailPayload,
  ConversationMessageList,
  HistorySessionItem,
  HistorySource,
  HistorySourceFilter,
  WorkspaceOverviewSnapshot,
  WorkspaceOverviewSnapshotPayload,
} from './types';

const HISTORY_CACHE_TTL_MS = 60_000;

interface HistorySessionCacheEntry {
  data: HistorySessionItem[];
  fetchedAt: number;
  promise?: Promise<HistorySessionItem[]>;
}

interface WorkspaceOverviewCacheEntry {
  data: WorkspaceOverviewSnapshot;
  fetchedAt: number;
  promise?: Promise<WorkspaceOverviewSnapshot>;
}

interface FetchHistorySessionsOptions {
  limit?: number;
}

const historySessionCache = new Map<string, HistorySessionCacheEntry>();
const workspaceOverviewCache = new Map<string, WorkspaceOverviewCacheEntry>();

function historySessionCacheKey(
  sourceFilter: HistorySourceFilter,
  options: FetchHistorySessionsOptions = {},
): string {
  return options.limit && options.limit > 0
    ? `${sourceFilter}:limit:${options.limit}`
    : `${sourceFilter}:full`;
}

function normalizeHistorySource(value: unknown): HistorySource {
  switch (typeof value === 'string' ? value.toLowerCase() : '') {
    case 'codex':
      return 'codex';
    case 'opencode':
      return 'opencode';
    default:
      return 'claude';
  }
}

function normalizeHistorySessions(data: HistorySessionItem[]): HistorySessionItem[] {
  return data.map((session) => ({
    ...session,
    source: normalizeHistorySource(session.source),
  }));
}

function normalizeWorkspaceOverviewSnapshot(
  data: WorkspaceOverviewSnapshotPayload,
): WorkspaceOverviewSnapshot {
  const sessions = normalizeHistorySessions(data.sessions);
  const sessionByKey = new Map(sessions.map((session) => [`${session.source}:${session.id}`, session]));
  const projectNodes = data.projectNodes.map((node) => ({
    project: node.project,
    projectName: node.projectName,
    latestTimestamp: node.latestTimestamp,
    sessions: node.sessionKeys
      ? node.sessionKeys
          .map((sessionKey) => sessionByKey.get(sessionKey))
          .filter((session): session is HistorySessionItem => Boolean(session))
      : normalizeHistorySessions(node.sessions ?? []).map((session) =>
          sessionByKey.get(`${session.source}:${session.id}`) ?? session
        ),
  }));

  return {
    ...data,
    sessions,
    projectNodes,
  };
}

export function getCachedHistorySessions(
  sourceFilter: HistorySourceFilter,
  options: FetchHistorySessionsOptions = {},
): HistorySessionItem[] | null {
  return historySessionCache.get(historySessionCacheKey(sourceFilter, options))?.data ?? null;
}

export function isHistoryCacheFresh(
  sourceFilter: HistorySourceFilter,
  options: FetchHistorySessionsOptions = {},
): boolean {
  const entry = historySessionCache.get(historySessionCacheKey(sourceFilter, options));
  return !!entry && Date.now() - entry.fetchedAt < HISTORY_CACHE_TTL_MS;
}

export async function fetchHistorySessions(
  sourceFilter: HistorySourceFilter,
  force = false,
  options: FetchHistorySessionsOptions = {},
): Promise<HistorySessionItem[]> {
  const cacheKey = historySessionCacheKey(sourceFilter, options);
  const cached = historySessionCache.get(cacheKey);

  if (!force && cached?.data && isHistoryCacheFresh(sourceFilter, options)) {
    return cached.data;
  }

  if (!force && cached?.promise) {
    return cached.promise;
  }

  const request = invoke<HistorySessionItem[]>('get_conversation_history', {
    source: sourceFilter === 'all' ? null : sourceFilter,
    limit: options.limit ?? null,
  })
    .then((data) => {
      const normalized = normalizeHistorySessions(data);
      historySessionCache.set(cacheKey, {
        data: normalized,
        fetchedAt: Date.now(),
      });
      return normalized;
    })
    .catch((err) => {
      if (cached?.data) {
        historySessionCache.set(cacheKey, cached);
      } else {
        historySessionCache.delete(cacheKey);
      }
      throw err;
    });

  historySessionCache.set(cacheKey, {
    data: cached?.data ?? [],
    fetchedAt: cached?.fetchedAt ?? 0,
    promise: request,
  });

  return request;
}

export async function fetchWorkspaceOverviewSnapshot(
  limit: number,
  force = false,
): Promise<WorkspaceOverviewSnapshot> {
  const options = { limit };
  const cacheKey = historySessionCacheKey('all', options);
  const cached = workspaceOverviewCache.get(cacheKey);

  if (!force && cached?.data && Date.now() - cached.fetchedAt < HISTORY_CACHE_TTL_MS) {
    return cached.data;
  }

  if (!force && cached?.promise) {
    return cached.promise;
  }

  const request = invoke<WorkspaceOverviewSnapshotPayload>('get_workspace_overview_snapshot', {
    limit,
  })
    .then(normalizeWorkspaceOverviewSnapshot)
    .then((snapshot) => {
      workspaceOverviewCache.set(cacheKey, {
        data: snapshot,
        fetchedAt: Date.now(),
      });
      historySessionCache.set(cacheKey, {
        data: snapshot.sessions,
        fetchedAt: Date.now(),
      });
      return snapshot;
    })
    .catch((err) => {
      if (cached?.data) {
        workspaceOverviewCache.set(cacheKey, cached);
      } else {
        workspaceOverviewCache.delete(cacheKey);
      }
      throw err;
    });

  workspaceOverviewCache.set(cacheKey, {
    data: cached?.data ?? {
      sessions: [],
      projectNodes: [],
      totalSessions: 0,
      totalProjects: 0,
    },
    fetchedAt: cached?.fetchedAt ?? 0,
    promise: request,
  });

  return request;
}

export async function searchHistorySessions(
  query: string,
  sourceFilter: HistorySourceFilter = 'all',
  limit = 120,
): Promise<HistorySessionItem[]> {
  const data = await invoke<HistorySessionItem[]>('search_conversation_history', {
    query,
    source: sourceFilter === 'all' ? null : sourceFilter,
    limit,
  });
  return normalizeHistorySessions(data);
}

export async function fetchConversationDetail(session: Pick<HistorySessionItem, 'id' | 'source'>) {
  const detail = await invoke<ConversationDetailPayload>('get_conversation_detail', {
    sessionId: session.id,
    source: session.source,
  });
  const messages = detail.messages as ConversationMessageList;
  if (detail.toolResultsMerged) {
    messages.toolResultsMerged = true;
  }

  return {
    messages,
    segments: detail.segments,
    toolResultsMerged: detail.toolResultsMerged === true,
  };
}

export function primeHistoryPage() {
  void fetchHistorySessions('all').catch(() => {});
}

export function invalidateHistoryCache() {
  historySessionCache.clear();
  workspaceOverviewCache.clear();
}
