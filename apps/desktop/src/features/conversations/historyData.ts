import { invoke } from '@tauri-apps/api/core';
import type {
  ConversationMessageData,
  HistorySegment,
  HistorySessionItem,
  HistorySource,
  HistorySourceFilter,
} from './types';

const HISTORY_CACHE_TTL_MS = 60_000;

interface HistorySessionCacheEntry {
  data: HistorySessionItem[];
  fetchedAt: number;
  promise?: Promise<HistorySessionItem[]>;
}

const historySessionCache = new Map<HistorySourceFilter, HistorySessionCacheEntry>();

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

export function getCachedHistorySessions(sourceFilter: HistorySourceFilter): HistorySessionItem[] | null {
  return historySessionCache.get(sourceFilter)?.data ?? null;
}

export function isHistoryCacheFresh(sourceFilter: HistorySourceFilter): boolean {
  const entry = historySessionCache.get(sourceFilter);
  return !!entry && Date.now() - entry.fetchedAt < HISTORY_CACHE_TTL_MS;
}

export async function fetchHistorySessions(
  sourceFilter: HistorySourceFilter,
  force = false
): Promise<HistorySessionItem[]> {
  const cached = historySessionCache.get(sourceFilter);

  if (!force && cached?.data && isHistoryCacheFresh(sourceFilter)) {
    return cached.data;
  }

  if (!force && cached?.promise) {
    return cached.promise;
  }

  const request = invoke<HistorySessionItem[]>('get_conversation_history', {
    source: sourceFilter === 'all' ? null : sourceFilter,
  })
    .then((data) => {
      const normalized = normalizeHistorySessions(data);
      historySessionCache.set(sourceFilter, {
        data: normalized,
        fetchedAt: Date.now(),
      });
      return normalized;
    })
    .catch((err) => {
      if (cached?.data) {
        historySessionCache.set(sourceFilter, cached);
      } else {
        historySessionCache.delete(sourceFilter);
      }
      throw err;
    });

  historySessionCache.set(sourceFilter, {
    data: cached?.data ?? [],
    fetchedAt: cached?.fetchedAt ?? 0,
    promise: request,
  });

  return request;
}

export async function fetchConversationDetail(session: Pick<HistorySessionItem, 'id' | 'source'>) {
  const [messages, segments] = await Promise.all([
    invoke<ConversationMessageData[]>('get_conversation_messages', {
      sessionId: session.id,
      source: session.source,
    }),
    invoke<HistorySegment[]>('get_conversation_segments', {
      sessionId: session.id,
      source: session.source,
    }),
  ]);

  return { messages, segments };
}

export function primeHistoryPage() {
  void fetchHistorySessions('all').catch(() => {});
}

export function invalidateHistoryCache() {
  historySessionCache.clear();
}
