import type { NativeSessionSummary, SessionEventRecord } from '@/lib/tauri-ipc';
import type { Session as InteractiveSession } from '@/store';
import type { PetNotificationItem, PetNotificationTone } from '@/types/pet';

export const PET_NOTIFICATION_LIMIT = 3;
const PET_MESSAGE_PREVIEW_LIMIT = 96;
const THINKING_MESSAGE = '正在思考';

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

interface CodexHistoryPetSession {
  id: string;
  client: 'codex';
  workingDir: string;
  startedAt: string | Date;
  updatedAt?: string | Date;
  status: string;
}

export type PetNotificationSourceSession =
  (
    | NativeSessionSummary
    | InteractiveSession
    | TauriInteractiveSession
    | CodexHistoryPetSession
  ) & {
    title?: string | null;
    displayTitle?: string | null;
    display_title?: string | null;
    latestModelOutput?: string | null;
    latest_model_output?: string | null;
    latestAssistantOutput?: string | null;
    latest_assistant_output?: string | null;
    lastAssistantMessage?: string | null;
    last_assistant_message?: string | null;
  };

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
  if (isNativeSession(session)) {
    return session.updated_at || session.created_at;
  }
  if ('updatedAt' in session && session.updatedAt) {
    return session.updatedAt instanceof Date ? session.updatedAt.toISOString() : String(session.updatedAt);
  }
  if ('updated_at' in session && session.updated_at) {
    return String(session.updated_at);
  }
  return sessionCreatedAt(session);
}

function normalizeInlineText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function nonEmptyText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? normalizeInlineText(value) : null;
}

function previewText(value: string, limit = PET_MESSAGE_PREVIEW_LIMIT): string {
  const normalized = normalizeInlineText(value);
  const chars = Array.from(normalized);
  if (chars.length <= limit) {
    return normalized;
  }
  return `${chars.slice(0, limit).join('').trimEnd()}…`;
}

function sessionTitle(session: PetNotificationSourceSession): string {
  return nonEmptyText(session.title)
    ?? nonEmptyText(session.displayTitle)
    ?? nonEmptyText(session.display_title)
    ?? basename(sessionProjectDir(session));
}

function sessionLatestModelOutput(session: PetNotificationSourceSession): string | null {
  return nonEmptyText(session.latestModelOutput)
    ?? nonEmptyText(session.latest_model_output)
    ?? nonEmptyText(session.latestAssistantOutput)
    ?? nonEmptyText(session.latest_assistant_output)
    ?? nonEmptyText(session.lastAssistantMessage)
    ?? nonEmptyText(session.last_assistant_message);
}

export function buildPetDisplayFromEvents(
  events: Pick<SessionEventRecord, 'payload'>[],
): { title: string | null; latestModelOutput: string | null } {
  const firstUserPrompt = events
    .map((event) => event.payload)
    .find((payload) => payload.type === 'user_prompt' && nonEmptyText(payload.text));

  let latestAssistantIndex = -1;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const payload = events[index]?.payload;
    if (payload?.type === 'assistant_chunk' && nonEmptyText(payload.text)) {
      latestAssistantIndex = index;
      break;
    }
  }

  const chunks: string[] = [];
  if (latestAssistantIndex >= 0) {
    for (let index = latestAssistantIndex; index >= 0; index -= 1) {
      const payload = events[index]?.payload;
      if (payload?.type !== 'assistant_chunk') {
        break;
      }
      if (payload.text.trim()) {
        chunks.unshift(payload.text);
      }
    }
  }

  return {
    title: firstUserPrompt?.type === 'user_prompt' ? nonEmptyText(firstUserPrompt.text) : null,
    latestModelOutput: chunks.length > 0 ? normalizeInlineText(chunks.join('')) : null,
  };
}

interface PetConversationMessage {
  msgType?: string;
  msg_type?: string;
  content?: unknown;
}

function textFromConversationContent(value: unknown): string | null {
  if (typeof value === 'string') {
    return nonEmptyText(value);
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => textFromConversationContent(item))
      .filter((item): item is string => !!item);
    return parts.length > 0 ? normalizeInlineText(parts.join(' ')) : null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const blockType = typeof record.type === 'string' ? record.type : '';
  if (blockType === 'thinking' || blockType === 'tool_use' || blockType === 'tool_result') {
    return null;
  }

  return nonEmptyText(record.text)
    ?? nonEmptyText(record.output_text)
    ?? nonEmptyText(record.outputText)
    ?? textFromConversationContent(record.content);
}

function conversationMessageType(message: PetConversationMessage): string {
  return message.msgType ?? message.msg_type ?? '';
}

export function buildPetDisplayFromConversationMessages(
  messages: PetConversationMessage[],
): { title: string | null; latestModelOutput: string | null } {
  const firstUserMessage = messages.find((message) => conversationMessageType(message) === 'user');
  let latestAssistantOutput: string | null = null;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || conversationMessageType(message) !== 'assistant') {
      continue;
    }

    latestAssistantOutput = textFromConversationContent(message.content);
    if (latestAssistantOutput) {
      break;
    }
  }

  return {
    title: firstUserMessage ? textFromConversationContent(firstUserMessage.content) : null,
    latestModelOutput: latestAssistantOutput,
  };
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
  void tone;
  const latestOutput = sessionLatestModelOutput(session);
  return latestOutput ? previewText(latestOutput) : THINKING_MESSAGE;
}

export function buildPetNotifications(
  sessions: PetNotificationSourceSession[],
  readNotificationIds: ReadonlySet<string>,
): PetNotificationItem[] {
  return sessions
    .map((session) => {
      const tone = toneForStatus(session.status);
      const id = notificationId(session);
      const shouldShow = !readNotificationIds.has(id);

      if (!shouldShow) {
        return null;
      }

      const item: PetNotificationItem = {
        id,
        runtimeId: sessionRuntimeId(session),
        provider: sessionProvider(session),
        providerSessionId: sessionProviderSessionId(session),
        title: sessionTitle(session),
        message: defaultMessage(session, tone),
        status: session.status,
        statusLabel: labelForTone(tone),
        tone,
        updatedAt: sessionUpdatedAt(session),
        projectDir: sessionProjectDir(session),
        markReadOnOpen: true,
      };
      return item;
    })
    .filter((item): item is PetNotificationItem => item !== null)
    .sort((left, right) => timestamp(right.updatedAt) - timestamp(left.updatedAt))
    .slice(0, PET_NOTIFICATION_LIMIT);
}
