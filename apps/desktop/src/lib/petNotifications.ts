import type { NativeSessionSummary } from '@/lib/tauri-ipc';
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

function notificationId(session: NativeSessionSummary): string {
  return `pet:${session.provider}:${session.runtime_id}:${session.status}`;
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

function defaultMessage(session: NativeSessionSummary, tone: PetNotificationTone): string {
  if (session.last_error?.trim()) {
    return session.last_error.trim();
  }
  if (tone === 'attention') {
    return '这条会话需要你处理';
  }
  if (tone === 'running') {
    return `${session.provider === 'codex' ? 'Codex' : 'Claude'} 正在运行`;
  }
  return '点开查看结果';
}

export function buildPetNotifications(
  sessions: NativeSessionSummary[],
  readNotificationIds: ReadonlySet<string>,
): PetNotificationItem[] {
  return sessions
    .map((session) => {
      const tone = toneForStatus(session.status);
      const id = notificationId(session);
      const isTerminal = TERMINAL_STATUSES.has(session.status);
      const isAttention = tone === 'attention';
      const shouldShow = isAttention || !isTerminal || !readNotificationIds.has(id);

      if (!shouldShow) {
        return null;
      }

      return {
        id,
        runtimeId: session.runtime_id,
        provider: session.provider,
        providerSessionId: session.provider_session_id ?? null,
        title: basename(session.project_dir),
        message: defaultMessage(session, tone),
        status: session.status,
        statusLabel: labelForTone(tone),
        tone,
        updatedAt: session.updated_at || session.created_at,
        projectDir: session.project_dir,
        markReadOnOpen: isTerminal && !isAttention,
      } satisfies PetNotificationItem;
    })
    .filter((item): item is PetNotificationItem => item !== null)
    .sort((left, right) => timestamp(right.updatedAt) - timestamp(left.updatedAt))
    .slice(0, PET_NOTIFICATION_LIMIT);
}
