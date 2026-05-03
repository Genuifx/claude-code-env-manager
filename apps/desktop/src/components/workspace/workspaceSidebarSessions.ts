import type { HistorySessionItem, HistorySource } from '@/features/conversations/types';
import type { NativeProvider, NativeSessionSummary } from '@/lib/tauri-ipc';

export interface WorkspaceSidebarLiveSessionEntry {
  session: Pick<
    NativeSessionSummary,
    | 'runtime_id'
    | 'provider'
    | 'provider_session_id'
    | 'project_dir'
    | 'env_name'
    | 'status'
    | 'created_at'
    | 'updated_at'
  >;
  initialPrompt?: string | null;
}

const TERMINAL_NATIVE_STATUSES = new Set(['stopped', 'error', 'handoff']);

function toHistorySource(provider: NativeProvider): HistorySource {
  return provider === 'codex' ? 'codex' : 'claude';
}

function basename(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '');
  return normalized.split('/').filter(Boolean).pop() || 'unknown';
}

function parseTimestamp(value: string | undefined): number {
  if (!value) {
    return Date.now();
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function liveSessionSidebarId(entry: WorkspaceSidebarLiveSessionEntry): string {
  const providerSessionId = entry.session.provider_session_id?.trim();
  return providerSessionId || entry.session.runtime_id;
}

export function liveSessionSidebarKey(entry: WorkspaceSidebarLiveSessionEntry): string {
  return `${toHistorySource(entry.session.provider)}:${liveSessionSidebarId(entry)}`;
}

function isTerminalNativeSession(entry: WorkspaceSidebarLiveSessionEntry): boolean {
  return TERMINAL_NATIVE_STATUSES.has(entry.session.status);
}

export function toLiveHistorySessionItem(
  entry: WorkspaceSidebarLiveSessionEntry,
): HistorySessionItem | null {
  if (isTerminalNativeSession(entry)) {
    return null;
  }

  const project = entry.session.project_dir.trim();
  const display = entry.initialPrompt?.trim()
    || entry.session.provider_session_id?.trim()
    || `${entry.session.provider === 'codex' ? 'Codex' : 'Claude'} workspace session`;

  return {
    id: liveSessionSidebarId(entry),
    source: toHistorySource(entry.session.provider),
    display,
    timestamp: parseTimestamp(entry.session.updated_at || entry.session.created_at),
    project,
    projectName: basename(project),
    envName: entry.session.env_name,
    configSource: 'ccem',
  };
}

export function buildWorkspaceSidebarSessions(
  historySessions: HistorySessionItem[],
  liveEntries: WorkspaceSidebarLiveSessionEntry[],
): HistorySessionItem[] {
  const nextSessions = [...historySessions];
  const existingKeys = new Set(historySessions.map((session) => `${session.source}:${session.id}`));

  for (const entry of liveEntries) {
    const liveItem = toLiveHistorySessionItem(entry);
    if (!liveItem) {
      continue;
    }

    const key = `${liveItem.source}:${liveItem.id}`;
    if (existingKeys.has(key)) {
      continue;
    }

    existingKeys.add(key);
    nextSessions.push(liveItem);
  }

  return nextSessions.sort((left, right) => right.timestamp - left.timestamp);
}

export function findLiveEntryForSidebarSession<T extends WorkspaceSidebarLiveSessionEntry>(
  liveEntries: T[],
  session: Pick<HistorySessionItem, 'id' | 'source'>,
): T | undefined {
  return liveEntries.find((entry) => {
    const source = toHistorySource(entry.session.provider);
    if (source !== session.source) {
      return false;
    }

    return entry.session.runtime_id === session.id
      || entry.session.provider_session_id === session.id;
  });
}
