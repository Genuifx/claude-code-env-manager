import type { NativeSessionSummary } from '@/lib/tauri-ipc';
import type { Session as InteractiveSession } from '@/store';
import type { PetNotificationItem, PetNotificationTone } from '@/types/pet';

export const PET_NOTIFICATION_LIMIT = 5;

const TERMINAL_STATUSES = new Set(['stopped', 'error', 'failed', 'interrupted', 'handoff']);
const ATTENTION_STATUSES = new Set([
  'waiting_for_approval',
  'waiting_for_prompt',
  'needs_approval',
  'needs_input',
  'action_required',
]);

function basename(projectDir: string): string {
  const normalized = projectDir.replace(/\\/g, '/').replace(/\/+$/, '');
  return normalized.split('/').filter(Boolean).pop() || projectDir || '会话';
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface TauriInteractiveSession {
  id: string;
  client?: string;
  working_dir: string;
  start_time: string;
  status: string;
}

export type PetNotificationSourceSession =
  | NativeSessionSummary
  | InteractiveSession
  | TauriInteractiveSession;

function isNativeSession(session: PetNotificationSourceSession): session is NativeSessionSummary {
  return 'runtime_id' in session;
}

function sessionRuntimeId(session: PetNotificationSourceSession): string {
  return isNativeSession(session) ? session.runtime_id : session.id;
}

function sessionProvider(session: PetNotificationSourceSession): 'claude' | 'codex' {
  const provider = isNativeSession(session) ? session.provider : session.client;
  return provider === 'codex' ? 'codex' : 'claude';
}

function sessionProviderLabel(session: PetNotificationSourceSession): string {
  return sessionProvider(session) === 'codex' ? 'Codex' : 'Claude';
}

function sessionProviderSessionId(session: PetNotificationSourceSession): string | null {
  return isNativeSession(session) ? session.provider_session_id ?? null : null;
}

function sessionProjectDir(session: PetNotificationSourceSession): string {
  if (isNativeSession(session)) {
    return session.project_dir;
  }
  return 'workingDir' in session ? session.workingDir : session.working_dir;
}

function sessionCreatedAt(session: PetNotificationSourceSession): string {
  if (isNativeSession(session)) {
    return session.created_at;
  }
  if ('startedAt' in session) {
    return session.startedAt instanceof Date ? session.startedAt.toISOString() : String(session.startedAt);
  }
  return session.start_time;
}

function sessionUpdatedAt(session: PetNotificationSourceSession): string {
  return isNativeSession(session) ? session.updated_at || session.created_at : sessionCreatedAt(session);
}

function sessionLastError(session: PetNotificationSourceSession): string | null {
  return isNativeSession(session) ? session.last_error ?? null : null;
}

export function buildPetNotificationId(
  provider: 'claude' | 'codex',
  runtimeId: string,
  status: string,
): string {
  return `pet:${provider}:${runtimeId}:${status}`;
}

function notificationId(session: PetNotificationSourceSession): string {
  return buildPetNotificationId(sessionProvider(session), sessionRuntimeId(session), session.status);
}

function toneForStatus(status: string): PetNotificationTone {
  if (ATTENTION_STATUSES.has(status)) return 'attention';
  if (status === 'error' || status === 'failed') return 'failed';
  if (status === 'interrupted') return 'interrupted';
  if (TERMINAL_STATUSES.has(status)) return 'done';
  return 'running';
}

function labelForTone(tone: PetNotificationTone): string {
  switch (tone) {
    case 'attention':
      return '需要处理';
    case 'failed':
      return '失败';
    case 'interrupted':
      return '已中断';
    case 'done':
      return '已完成';
    case 'running':
    default:
      return '运行中';
  }
}

function defaultMessage(session: PetNotificationSourceSession, tone: PetNotificationTone): string {
  const lastError = sessionLastError(session);
  if (lastError?.trim()) {
    return lastError.trim();
  }
  if (tone === 'attention') {
    return '这条会话需要你处理';
  }
  if (tone === 'running') {
    return `${sessionProviderLabel(session)} 正在运行`;
  }
  return '点开查看结果';
}

export function buildPetNotifications(
  sessions: PetNotificationSourceSession[],
  readNotificationIds: ReadonlySet<string>,
): PetNotificationItem[] {
  return sessions
    .map((session) => {
      const tone = toneForStatus(session.status);
      const id = notificationId(session);
      const isAttention = tone === 'attention';
      const shouldShow = isAttention || !readNotificationIds.has(id);

      if (!shouldShow) {
        return null;
      }

      return {
        id,
        runtimeId: sessionRuntimeId(session),
        provider: sessionProvider(session),
        providerSessionId: sessionProviderSessionId(session),
        title: basename(sessionProjectDir(session)),
        message: defaultMessage(session, tone),
        status: session.status,
        statusLabel: labelForTone(tone),
        tone,
        updatedAt: sessionUpdatedAt(session),
        projectDir: sessionProjectDir(session),
        markReadOnOpen: !isAttention,
      } satisfies PetNotificationItem;
    })
    .filter((item): item is PetNotificationItem => item !== null)
    .sort((left, right) => timestamp(right.updatedAt) - timestamp(left.updatedAt))
    .slice(0, PET_NOTIFICATION_LIMIT);
}
