export type ClaudePermissionMode =
  | 'default'
  | 'acceptEdits'
  | 'bypassPermissions'
  | 'plan'
  | 'dontAsk'
  | 'auto';

export type ClaudePermissionSettings = {
  permissionMode: ClaudePermissionMode;
  allowDangerouslySkipPermissions: boolean;
};

export function normalizeClaudePermissionMode(permMode: string): ClaudePermissionSettings {
  switch (permMode) {
    case 'yolo':
    case 'bypassPermissions':
      return {
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
      };
    case 'dev':
    case 'acceptEdits':
      return {
        permissionMode: 'acceptEdits',
        allowDangerouslySkipPermissions: false,
      };
    case 'readonly':
    case 'audit':
    case 'plan':
      return {
        permissionMode: 'plan',
        allowDangerouslySkipPermissions: false,
      };
    case 'safe':
    case 'ci':
    case 'default':
      return {
        permissionMode: 'default',
        allowDangerouslySkipPermissions: false,
      };
    case 'dontAsk':
      return {
        permissionMode: 'dontAsk',
        allowDangerouslySkipPermissions: false,
      };
    case 'auto':
      return {
        permissionMode: 'auto',
        allowDangerouslySkipPermissions: false,
      };
    default:
      return {
        permissionMode: 'default',
        allowDangerouslySkipPermissions: false,
      };
  }
}

export function normalizeCodexSandboxMode(permMode: string) {
  if (permMode === 'yolo' || permMode === 'danger-full-access') {
    return {
      sandboxMode: 'danger-full-access' as const,
      approvalPolicy: 'never' as const,
    };
  }

  if (
    permMode === 'readonly'
    || permMode === 'audit'
    || permMode === 'ci'
    || permMode === 'plan'
    || permMode === 'read-only'
  ) {
    return {
      sandboxMode: 'read-only' as const,
      approvalPolicy: 'never' as const,
    };
  }

  return {
    sandboxMode: 'workspace-write' as const,
    approvalPolicy: 'on-request' as const,
  };
}
