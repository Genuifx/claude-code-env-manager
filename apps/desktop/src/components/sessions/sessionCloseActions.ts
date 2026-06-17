const ACTIVE_HEADLESS_STATUSES = new Set([
  'ready',
  'processing',
  'waiting_permission',
  'initializing',
]);

export type SessionCloseAction =
  | 'stopThenRemoveHeadless'
  | 'removeHeadless'
  | 'closeUnifiedInteractive'
  | 'closeLegacyInteractive';

export interface SessionCloseInput {
  unifiedSession?: {
    runtimeKind: string;
    status: string;
    id: string;
  };
  hasLegacySession: boolean;
}

export function resolveSessionCloseAction(
  input: SessionCloseInput,
): SessionCloseAction {
  const { unifiedSession, hasLegacySession } = input;

  if (!unifiedSession) {
    return 'closeLegacyInteractive';
  }

  if (unifiedSession.runtimeKind === 'headless') {
    if (ACTIVE_HEADLESS_STATUSES.has(unifiedSession.status)) {
      return 'stopThenRemoveHeadless';
    }
    return 'removeHeadless';
  }

  // Interactive unified session
  if (!hasLegacySession) {
    return 'closeUnifiedInteractive';
  }

  return 'closeLegacyInteractive';
}
