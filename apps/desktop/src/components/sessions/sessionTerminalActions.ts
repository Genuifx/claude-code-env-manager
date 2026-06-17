import type { Session } from '@/store';
import type { UnifiedSession } from '@/store';

const RUNNING_UNIFIED_STATUSES = new Set([
  'running',
  'ready',
  'processing',
  'waiting_permission',
  'initializing',
]);

const EXTERNAL_TERMINAL_TYPES = new Set(['iterm2', 'terminalapp']);

export interface SessionTerminalActionsInput {
  session: Pick<Session, 'status' | 'terminalType' | 'windowId' | 'tmuxTarget'>;
  unifiedSession?: Pick<UnifiedSession, 'runtimeKind' | 'status' | 'tmuxTarget'>;
}

export interface SessionTerminalActions {
  isRunning: boolean;
  canFocusExistingTerminal: boolean;
  canOpenInTerminal: boolean;
}

export function getSessionTerminalActions(
  input: SessionTerminalActionsInput,
): SessionTerminalActions {
  const { session, unifiedSession } = input;

  const isRunning = unifiedSession
    ? RUNNING_UNIFIED_STATUSES.has(unifiedSession.status)
    : session.status === 'running';

  // Headless sessions have no terminal actions
  if (unifiedSession?.runtimeKind === 'headless') {
    return { isRunning, canFocusExistingTerminal: false, canOpenInTerminal: false };
  }

  // canFocusExistingTerminal: external terminal (iTerm2/Terminal.app) with a windowId
  const canFocusExistingTerminal =
    isRunning &&
    !!session.terminalType &&
    EXTERNAL_TERMINAL_TYPES.has(session.terminalType) &&
    !!session.windowId;

  // canOpenInTerminal: tmux-backed session with a tmux target
  const tmuxAvailable =
    !!session.tmuxTarget ||
    !!session.terminalType ||
    !!unifiedSession?.tmuxTarget;

  // Only show "Open in Terminal" for sessions that can tmux-attach.
  // Embedded sessions always have tmux underneath. Unified interactive sessions
  // carry tmuxTarget from the backend. Legacy external terminals without tmux
  // metadata do not need this action.
  const hasTmuxMetadata =
    session.terminalType === 'embedded' ||
    !!session.tmuxTarget ||
    !!unifiedSession?.tmuxTarget;

  const canOpenInTerminal = isRunning && hasTmuxMetadata && tmuxAvailable;

  return { isRunning, canFocusExistingTerminal, canOpenInTerminal };
}
